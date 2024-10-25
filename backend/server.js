const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Change this to your client's origin
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});


app.use(cors());


let messages = {}; // This can be replaced with a database in a production app


io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);


    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`Client ${socket.id} joined room ${roomId}`);
    });


    socket.on('getMessages', (roomId) => {
        const roomMessages = messages[roomId] || [];
        socket.emit('chatHistory', roomMessages);
    });

    socket.on('question', (data) => {
        const { roomId, msg } = data;
        messages[roomId] = messages[roomId] || [];
        messages[roomId].push({ role: 'asker', message: msg });
        io.to(roomId).emit('question', { roomId, msg });
        io.to(roomId).emit('chatHistory', messages[roomId]);
    });

    // Handle incoming responses
    socket.on('response', (data) => {
        const { roomId, msg } = data;
        messages[roomId] = messages[roomId] || [];
        messages[roomId].push({ role: 'responder', message: msg });
        io.to(roomId).emit('response', { roomId, msg });
        io.to(roomId).emit('chatHistory', messages[roomId]);
    });

    socket.on('getRooms', () => {
        const roomsList = Object.keys(messages).map((roomId) => ({
            id: roomId,
            latestMessage: messages[roomId][messages[roomId].length - 1]?.message || 'No messages yet'
        }));
        socket.emit('roomsList', roomsList);
    });


    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
