const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000", // Change this to your client's origin
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

// Middleware
app.use(cors());

// Store messages in memory (for demonstration purposes)
let messages = {}; // This can be replaced with a database in a production app

// Handle socket connection
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle getting chat messages for a specific room
    socket.on('getMessages', (roomId) => {
        const roomMessages = messages[roomId] || [];
        socket.emit('chatHistory', roomMessages);
    });

    // Handle incoming questions
    socket.on('question', (data) => {
        const { roomId, msg } = data;
        console.log('Received question:', data); // Log received questions
        // Save the message
        messages[roomId] = messages[roomId] || [];
        messages[roomId].push({ role: 'asker', message: msg });
        socket.to(roomId).emit('question', { roomId, msg });
    });

    // Handle incoming responses
    socket.on('response', (data) => {
        const { roomId, msg } = data;
        console.log('Received response:', data); // Log received responses
        // Save the message
        messages[roomId] = messages[roomId] || [];
        messages[roomId].push({ role: 'responder', message: msg });
        socket.to(roomId).emit('response', { roomId, msg });
    });

    // Handle getting rooms (for the responder)
    socket.on('getRooms', () => {
        const roomsList = Object.keys(messages).map((roomId) => ({
            id: roomId,
            latestMessage: messages[roomId][messages[roomId].length - 1]?.message || 'No messages yet'
        }));
        socket.emit('roomsList', roomsList);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
