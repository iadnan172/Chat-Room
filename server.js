const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const redis = require("redis");
const mysql = require("mysql2");
require("dotenv").config();
const { createClient } = redis;
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

(async () => {
  pubClient = createClient({ url: "redis://127.0.0.1:6379" });
  await pubClient.connect();
  subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
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
    // Add this in your Socket.IO connection handler after the "chatMessage" handler
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

     const passwordToStore = messageData.password || "hysererrSgarHH@123TTS";

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