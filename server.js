const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mysql = require("mysql2");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// const db = mysql.createConnection({
//     host: "localhost",
//     user: "root",  // Change this if your MySQL username is different
//     password: "root", // Change this to your MySQL password
//     database: "chat_app"
// });

// db.connect((err) => {
//     if (err) {
//         console.error("Database connection failed:", err);
//     } else {
//         console.log("Connected to MySQL database!");
//     }
// });

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('a user connected');
    
    socket.on('send message', (data) => {
        io.emit('receive message', data); // Broadcast to all clients
    });

    // // Save message to MySQL
    // const sql = "INSERT INTO messages (sender, receiver, message) VALUES (?, ?, ?)";
    // db.query(sql, [sender, receiver, message], (err, result) => {
    //     if (err) {
    //         console.error("Error saving message:", err);
    //     } else {
    //         console.log("Message saved to database");
    //     }
    // });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT ||3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

