const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle chat messages
    socket.on('chat message', (data) => {
        // Broadcast the message to all other users except the sender
        socket.broadcast.emit('chat message', data);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

server.listen(8000, () => {
    console.log('Listening on *:8000');
});
