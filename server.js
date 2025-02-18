const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const redis = require("redis");
const mysql = require("mysql2"); // MySQL module
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

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "Chat";

// MySQL Database Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root", 
  password: "root", 
  database: "chat_app",
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection error:", err);
  } else {
    console.log("Connected to MySQL Database");
  }
});

(async () => {
  pubClient = createClient({ url: "redis://127.0.0.1:6379" });
  await pubClient.connect();
  subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
})();

// Run when client connects
io.on("connection", (socket) => {
  console.log(io.of("/").adapter);

  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);

    // Welcome current user
    socket.emit("message", formatMessage(botName, "Welcome to Chat-App!"));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit("message", formatMessage(botName, `${user.username} has joined the chat`));

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });

    // Fetch previous messages and send them to the user
    db.query(
      "SELECT * FROM messages WHERE room = ? ORDER BY time ASC",
      [user.room],
      (err, results) => {
        if (err) {
          console.error("Error fetching messages:", err);
          return;
        }
        results.forEach((msg) => {
          socket.emit("message", formatMessage(msg.username, msg.message));
        });
      }
    );
  });



  // Listen for chatMessage and store it in MySQL
  socket.on("chatMessage", ({ msg, receiver }) => {
    const user = getCurrentUser(socket.id);

    if (!user) {
      return;
    }

    const messageData = {
      sender: user.username,
      receiver: receiver, // Receiver's username
      room: user.room,
      message: msg,
    };

    // Insert message into MySQL
    db.query(
      "INSERT INTO messages (username, receiver, room, message) VALUES (?, ?, ?, ?)",
      [messageData.sender,  messageData.receiver, messageData.room, messageData.message],
      (err, result) => {
        if (err) {
          console.error("Error inserting message:", err);
          return;
        }
        console.log("Message stored in database:", result.insertId);
      }
    );

    // Emit message to the receiver if they are in the same room
    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit("message", formatMessage(botName, `${user.username} has left the chat`));

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
