// Description: This code sets up a chat server using Socket.IO, Redis, and MySQL. It handles user connections, message storage, and retrieval from a MySQL database, and uses Redis for pub/sub functionality.
const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const mysql = require("mysql2");
require("dotenv").config();
console.log("👉 REDIS_URL loaded from .env or Render:", process.env.REDIS_URL);

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

// ✅ Redis Pub/Sub Client Setup (Local)
const pubClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
const subClient = pubClient.duplicate();

pubClient.connect().catch(console.error);
subClient.connect().catch(console.error);

io.adapter(createAdapter(pubClient, subClient));
console.log("✅ Redis Pub/Sub adapter set for Socket.IO");


// Socket.IO Connection Handler
io.on("connection", (socket) => {
  console.log(io.of("/").adapter);

  socket.on("joinRoom", ({ username, room, password }) => {
    const user = userJoin(socket.id, username, room, password);
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

    const passwordToStore = messageData.password || "$2b$12$lMlHT8TtkC8Jo1LFtjA1LuPv.pP8DnvYJOXSq5TAyEZXs8j7YP1vq";

    db.query(
      "INSERT INTO messages (sender, receiver, room, message, password) VALUES (?, ?, ?, ?, ?)",
      [messageData.sender, messageData.receiver, messageData.room, messageData.message, passwordToStore],
      (err, result) => {
        if (err) return console.error("Insert error:", err);
        console.log("Message stored:", result.insertId);
      }
    );

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Group Chat Message Handler
  socket.on("groupChatMessage", (data) => {
    const user = getCurrentUser(socket.id);
    if (!user) return;

    const passwordToStore = user.password || "hysererrSgarHH@123TTS";

    db.query(
      "INSERT INTO group_messages (username, room, message, password) VALUES (?, ?, ?, ?)",
      [user.username, user.room, data.msg, passwordToStore],
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
