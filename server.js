const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis"); // ✅ Yeh line fix hai
 const mysql = require("mysql2");
const Redis = require('ioredis');
require("dotenv").config();
console.log("👉 REDIS_URL loaded from .env or Render:", process.env.REDIS_URL);

// ✅ Redis client
// const client = createClient({
//   url: process.env.REDIS_URL,
// });
// client.connect().catch(console.error);

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);


 app.use(express.static(path.join(__dirname, "public")));

//for index.html

// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

// app.get('/chat', (req, res) => {
//   res.sendFile(path.join(__dirname, 'chat.html'));
// });

// app.get('/index.js', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.js'));
// });

// app.get('/style.css', (req, res) => {
//   res.sendFile(path.join(__dirname, 'style.css'));
// });

const botName = "Chat";

// MySQL Connection
const db = mysql.createConnection({
  host: "database1.chiiqk6msqz4.us-east-1.rds.amazonaws.com",
  user: "admin",
  password: "AdnanSecure#2025",
  database: "chatapp",
});

db.connect((err) => {
  if (err) console.error("MySQL error:", err);
  else console.log("Connected to MySQL");
});

(async () => {
  try {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    pubClient.on('error', err => console.error("❌ Redis PubClient Error:", err));
    subClient.on('error', err => console.error("❌ Redis SubClient Error:", err));

    await pubClient.connect();
    await subClient.connect();

    io.adapter(createAdapter(pubClient, subClient));
    console.log("✅ Redis connected and adapter set.");
  } catch (err) {
    console.error("❌ Redis connection failed:", err.message);
  }
})();



// Socket.IO Connection Handler
io.on("connection", (socket) => {
  console.log(io.of("/").adapter);

  // Join Room Handler
  socket.on("joinRoom", ({ username, room, password }) => {
    const user = userJoin(socket.id, username, room, password);
    socket.join(user.room);

    // Welcome message
    socket.emit("message", formatMessage(botName, "Welcome to Chat-App!"));
    
    // Broadcast user join
    socket.broadcast.to(user.room).emit(
      "message", 
      formatMessage(botName, `${user.username} has joined the chat`)
    );

    // Send room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });

    // Fetch previous messages
    db.query(
      "SELECT * FROM messages WHERE room = ? ORDER BY time ASC",
      [user.room],
      (err, results) => {
        if (err) return console.error("Fetch error:", err);
        results.forEach((msg) => {
          socket.emit("message", formatMessage(msg.username, msg.message));
        });
      }
    );
  });
  
  // Message Handler
  socket.on("chatMessage", ({ msg, receiver }) => {
    const user = getCurrentUser(socket.id);
    if (!user) return;

    const messageData = {
      sender: user.username,
      receiver: receiver,
      room: user.room,
      message: msg,
      password: user.password,
    };
    // socket.io connection for group messaging
socket.on("groupChatMessage", (data) => {
  const user = getCurrentUser(socket.id);
  if (!user) return;

  const passwordToStore = user.password || "hysererrSgarHH@123TTS";

  // Insert into group_messages table
  db.query(
    "INSERT INTO group_messages (username, room, message, password) VALUES (?, ?, ?, ?)",
    [user.username, user.room, data.msg, passwordToStore],
    (err, result) => {
      if (err) {
        console.error("Group message insert error:", err);
        return;
      }
      console.log("Group message stored:", result.insertId);
      // Broadcast to the group room
      io.to(user.room).emit("message", formatMessage(user.username, data.msg));
    }
  );
});

// Modify the joinRoom handler's message fetching part
socket.on("joinRoom", ({ username, room, password }) => {
  // ... existing joinRoom code ...

  // Modified message fetching logic
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

     const passwordToStore = messageData.password || "$2b$12$lMlHT8TtkC8Jo1LFtjA1LuPv.pP8DnvYJOXSq5TAyEZXs8j7YP1vq";

    db.query(
      "INSERT INTO messages (sender, receiver, room, message, password) VALUES (?, ?, ?, ?, ?)",
      [messageData.sender, messageData.receiver, messageData.room, 
       messageData.message, passwordToStore],
      (err, result) => {
        if (err) return console.error("Insert error:", err);
        console.log("Message stored:", result.insertId);
      }
    );

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Disconnect Handler
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
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));