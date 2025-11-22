const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const mysql = require("mysql2");
const { hashPassword, comparePassword, generateToken, verifyToken } = require("./utils/auth");
require("dotenv").config();

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const botName = "Chat";

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "chat_app",
});

db.connect((err) => {
  if (err) console.error("MySQL error:", err);
  else console.log("Connected to MySQL");
});

// Redis Setup
const pubClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
const subClient = pubClient.duplicate();

pubClient.connect().catch(console.error);
subClient.connect().catch(console.error);

io.adapter(createAdapter(pubClient, subClient));

// ==================== AUTHENTICATION ROUTES ====================

// Register Route
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Validation
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check if user already exists
    db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email],
      async (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert user
        db.query(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, hashedPassword],
          (err, result) => {
            if (err) {
              console.error('Insert error:', err);
              return res.status(500).json({ error: 'Registration failed' });
            }

            // Generate token
            const token = generateToken(result.insertId, username);

            res.json({
              success: true,
              message: 'Registration successful',
              token,
              username
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login Route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Find user
  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const user = results[0];

      // Compare passwords
      const isMatch = await comparePassword(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Generate token
      const token = generateToken(user.id, user.username);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        username: user.username
      });
    }
  );
});

// Verify Token Route
app.get('/api/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.json({ success: true, user: decoded });
});

// ==================== SOCKET.IO WITH AUTH ====================

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return next(new Error('Authentication error: Invalid token'));
  }

  socket.userId = decoded.userId;
  socket.username = decoded.username;
  next();
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.username}`);

  socket.on("joinRoom", ({ room }) => {
    const user = userJoin(socket.id, socket.username, room);
    socket.join(user.room);

    socket.emit("message", formatMessage(botName, "Welcome to Chat-App!"));
    
    socket.broadcast.to(user.room).emit(
      "message", 
      formatMessage(botName, `${user.username} has joined the chat`)
    );

    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });

    // Fetch previous messages
    const isGroupChat = user.room === 'Group-chat';
    const query = isGroupChat 
      ? "SELECT * FROM group_messages WHERE room = ? ORDER BY time ASC"
      : "SELECT * FROM messages WHERE room = ? ORDER BY time ASC";

    db.query(query, [user.room], (err, results) => {
      if (err) return console.error("Fetch error:", err);
      results.forEach((msg) => {
        socket.emit("message", formatMessage(msg.username, msg.message));
      });
    });
  });
  
  socket.on("chatMessage", ({ msg, receiver }) => {
    const user = getCurrentUser(socket.id);
    if (!user) return;

    db.query(
      "INSERT INTO messages (sender, receiver, room, message) VALUES (?, ?, ?, ?)",
      [user.username, receiver, user.room, msg],
      (err, result) => {
        if (err) return console.error("Insert error:", err);
        console.log("Message stored:", result.insertId);
      }
    );

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  socket.on("groupChatMessage", (data) => {
    const user = getCurrentUser(socket.id);
    if (!user) return;

    db.query(
      "INSERT INTO group_messages (username, room, message) VALUES (?, ?, ?)",
      [user.username, user.room, data.msg],
      (err, result) => {
        if (err) {
          console.error("Group message insert error:", err);
          return;
        }
        console.log("Group message stored:", result.insertId);
        io.to(user.room).emit("message", formatMessage(user.username, data.msg));
      }
    );
  });

  socket.on("disconnect", () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message", 
        formatMessage(botName, `${user.username} has left the chat`)
      );
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`http://localhost:4000/`));