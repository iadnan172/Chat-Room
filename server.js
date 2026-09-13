// const path = require("path");
// const http = require("http");
// const express = require("express");
// const socketio = require("socket.io");
// const formatMessage = require("./utils/messages");
// const { createAdapter } = require("@socket.io/redis-adapter");
// const { createClient } = require("redis");
// const mysql = require("mysql2");
// const { hashPassword, comparePassword, generateToken, verifyToken } = require("./utils/auth");
// require("dotenv").config();

// const {
//   userJoin,
//   getCurrentUser,
//   userLeave,
//   getRoomUsers,
// } = require("./utils/users");

// const app = express();
// const server = http.createServer(app);
// const io = socketio(server);

// // Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, "public")));

// const botName = "Chat";

// // MySQL Connection
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "root",
//   database: "chat_app",
// });

// db.connect((err) => {
//   if (err) console.error("MySQL error:", err);
//   else console.log("Connected to MySQL");
// });

// // Redis Setup
// const pubClient = createClient({
//   url: process.env.REDIS_URL || "redis://localhost:6379",
// });
// const subClient = pubClient.duplicate();

// pubClient.connect().catch(console.error);
// subClient.connect().catch(console.error);

// io.adapter(createAdapter(pubClient, subClient));

// // ==================== AUTHENTICATION ROUTES ====================

// // Register Route
// app.post('/api/register', async (req, res) => {
//   const { username, email, password } = req.body;

//   // Validation
//   if (!username || !email || !password) {
//     return res.status(400).json({ error: 'All fields are required' });
//   }

//   if (password.length < 6) {
//     return res.status(400).json({ error: 'Password must be at least 6 characters' });
//   }

//   try {
//     // Check if user already exists
//     db.query(
//       'SELECT * FROM users WHERE username = ? OR email = ?',
//       [username, email],
//       async (err, results) => {
//         if (err) {
//           console.error('Database error:', err);
//           return res.status(500).json({ error: 'Database error' });
//         }

//         if (results.length > 0) {
//           return res.status(400).json({ error: 'Username or email already exists' });
//         }

//         // Hash password
//         const hashedPassword = await hashPassword(password);

//         // Insert user
//         db.query(
//           'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
//           [username, email, hashedPassword],
//           (err, result) => {
//             if (err) {
//               console.error('Insert error:', err);
//               return res.status(500).json({ error: 'Registration failed' });
//             }

//             // Generate token
//             const token = generateToken(result.insertId, username);

//             res.json({
//               success: true,
//               message: 'Registration successful',
//               token,
//               username
//             });
//           }
//         );
//       }
//     );
//   } catch (error) {
//     console.error('Registration error:', error);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// // Login Route
// app.post('/api/login', (req, res) => {
//   const { username, password } = req.body;

//   if (!username || !password) {
//     return res.status(400).json({ error: 'Username and password required' });
//   }

//   // Find user
//   db.query(
//     'SELECT * FROM users WHERE username = ?',
//     [username],
//     async (err, results) => {
//       if (err) {
//         console.error('Database error:', err);
//         return res.status(500).json({ error: 'Database error' });
//       }

//       if (results.length === 0) {
//         return res.status(401).json({ error: 'Invalid username or password' });
//       }

//       const user = results[0];

//       // Compare passwords
//       const isMatch = await comparePassword(password, user.password);

//       if (!isMatch) {
//         return res.status(401).json({ error: 'Invalid username or password' });
//       }

//       // Generate token
//       const token = generateToken(user.id, user.username);

//       res.json({
//         success: true,
//         message: 'Login successful',
//         token,
//         username: user.username
//       });
//     }
//   );
// });

// // Verify Token Route
// app.get('/api/verify', (req, res) => {
//   const token = req.headers.authorization?.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ error: 'No token provided' });
//   }

//   const decoded = verifyToken(token);

//   if (!decoded) {
//     return res.status(401).json({ error: 'Invalid token' });
//   }

//   res.json({ success: true, user: decoded });
// });

// // ==================== SOCKET.IO WITH AUTH ====================

// io.use((socket, next) => {
//   const token = socket.handshake.auth.token;

//   if (!token) {
//     return next(new Error('Authentication error: No token provided'));
//   }

//   const decoded = verifyToken(token);

//   if (!decoded) {
//     return next(new Error('Authentication error: Invalid token'));
//   }

//   socket.userId = decoded.userId;
//   socket.username = decoded.username;
//   next();
// });

// io.on("connection", (socket) => {
//   console.log(`User connected: ${socket.username}`);

//   socket.on("joinRoom", ({ room }) => {
//     const user = userJoin(socket.id, socket.username, room);
//     socket.join(user.room);

//     socket.emit("message", formatMessage(botName, "Welcome to Chat-Cord!"));
    
//     socket.broadcast.to(user.room).emit(
//       "message", 
//       formatMessage(botName, `${user.username} has joined the chat`)
//     );

//     io.to(user.room).emit("roomUsers", {
//       room: user.room,
//       users: getRoomUsers(user.room),
//     });

//     // Fetch previous messages
//     const isGroupChat = user.room === 'Group-chat';
//     const query = isGroupChat 
//       ? "SELECT * FROM group_messages WHERE room = ? ORDER BY time ASC"
//       : "SELECT * FROM messages WHERE room = ? ORDER BY time ASC";

//     db.query(query, [user.room], (err, results) => {
//       if (err) return console.error("Fetch error:", err);
//       results.forEach((msg) => {
//         socket.emit("message", formatMessage(msg.username, msg.message));
//       });
//     });
//   });
  
//   socket.on("chatMessage", ({ msg, receiver }) => {
//     const user = getCurrentUser(socket.id);
//     if (!user) return;

//     db.query(
//       "INSERT INTO messages (sender, receiver, room, message) VALUES (?, ?, ?, ?)",
//       [user.username, receiver, user.room, msg],
//       (err, result) => {
//         if (err) return console.error("Insert error:", err);
//         console.log("Message stored:", result.insertId);
//       }
//     );

//     io.to(user.room).emit("message", formatMessage(user.username, msg));
//   });

//   socket.on("groupChatMessage", (data) => {
//     const user = getCurrentUser(socket.id);
//     if (!user) return;

//     db.query(
//       "INSERT INTO group_messages (username, room, message) VALUES (?, ?, ?)",
//       [user.username, user.room, data.msg],
//       (err, result) => {
//         if (err) {
//           console.error("Group message insert error:", err);
//           return;
//         }
//         console.log("Group message stored:", result.insertId);
//         io.to(user.room).emit("message", formatMessage(user.username, data.msg));
//       }
//     );
//   });

//   socket.on("disconnect", () => {
//     const user = userLeave(socket.id);
//     if (user) {
//       io.to(user.room).emit(
//         "message", 
//         formatMessage(botName, `${user.username} has left the chat`)
//       );
//       io.to(user.room).emit("roomUsers", {
//         room: user.room,
//         users: getRoomUsers(user.room),
//       });
//     }
//   });
// });

// const PORT = process.env.PORT || 4000;
// server.listen(PORT, () => console.log(`http://localhost:4000/`));


const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const mysql = require("mysql2");
const multer = require("multer");
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

// Logout Route
app.post('/api/logout', (req, res) => {
  // Client will handle token removal
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==================== FILE UPLOAD (multer) ====================

const UPLOAD_DIR = path.join(__dirname, "public", "uploads");

// Store uploads on disk with a unique, extension-preserving name
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

// Only allow images, videos and audio
const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];
function fileFilter(req, file, cb) {
  const ok = ALLOWED_PREFIXES.some((p) => file.mimetype.startsWith(p));
  cb(ok ? null : new Error("Only image, video and audio files are allowed"), ok);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Map a mimetype to our simple message type
function mediaType(mimetype) {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  return "file";
}

// JWT guard for HTTP routes (reuses verifyToken from utils/auth.js)
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  const decoded = token && verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Unauthorized" });
  req.user = decoded;
  next();
}

// File upload endpoint. multer runs inside the handler so size/type
// errors come back as clean JSON instead of throwing.
app.post("/api/upload", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({
      success: true,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: mediaType(req.file.mimetype),
      fileName: req.file.originalname,
    });
  });
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
    // Use authenticated username from JWT
    const user = userJoin(socket.id, socket.username, room);
    socket.join(user.room);

    console.log(`${user.username} joined room: ${user.room}`);

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
    const isGroupChat = user.room === 'Group-Chat';
    const query = isGroupChat 
      ? "SELECT * FROM group_messages WHERE room = ? ORDER BY time ASC"
      : "SELECT * FROM messages WHERE room = ? ORDER BY time ASC";

    db.query(query, [user.room], (err, results) => {
      if (err) {
        console.error("Fetch error:", err);
        return;
      }
      results.forEach((msg) => {
        // private `messages` table uses `sender`; group table uses `username`
        const sender = msg.username || msg.sender;
        socket.emit(
          "message",
          formatMessage(sender, msg.message, {
            type: msg.type,
            fileUrl: msg.file_url,
            fileName: msg.file_name,
          })
        );
      });
    });
  });
  
  socket.on("chatMessage", ({ msg, receiver, type, fileUrl, fileName }) => {
    const user = getCurrentUser(socket.id);
    if (!user) {
      console.log("User not found for socket:", socket.id);
      return;
    }

    const meta = { type: type || "text", fileUrl: fileUrl || null, fileName: fileName || null };
    const text = msg || "";

    console.log(`Private message from ${user.username} to ${receiver} (${meta.type})`);

    db.query(
      "INSERT INTO messages (sender, receiver, room, message, type, file_url, file_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [user.username, receiver, user.room, text, meta.type, meta.fileUrl, meta.fileName],
      (err, result) => {
        if (err) {
          console.error("Insert error:", err);
          return;
        }
        console.log("Private message stored:", result.insertId);
      }
    );

    // Send to everyone in the room (they can see all messages)
    io.to(user.room).emit("message", formatMessage(user.username, text, meta));
  });

  socket.on("groupChatMessage", ({ msg, type, fileUrl, fileName }) => {
    const user = getCurrentUser(socket.id);
    if (!user) {
      console.log("User not found for socket:", socket.id);
      return;
    }

    const meta = { type: type || "text", fileUrl: fileUrl || null, fileName: fileName || null };
    const text = msg || "";

    console.log(`Group message from ${user.username} (${meta.type})`);

    db.query(
      "INSERT INTO group_messages (username, room, message, type, file_url, file_name) VALUES (?, ?, ?, ?, ?, ?)",
      [user.username, user.room, text, meta.type, meta.fileUrl, meta.fileName],
      (err, result) => {
        if (err) {
          console.error("Group message insert error:", err);
          return;
        }
        console.log("Group message stored:", result.insertId);

        // Send to all users in the room
        io.to(user.room).emit("message", formatMessage(user.username, text, meta));
      }
    );
  });

  socket.on("disconnect", () => {
    const user = userLeave(socket.id);
    if (user) {
      console.log(`${user.username} disconnected from ${user.room}`);
      
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
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}/`));