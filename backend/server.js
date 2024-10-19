const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS middleware for Express
app.use(cors({
    origin: "https://chatgpt-troll-v6yx-9hk9jl71b-paras-projects-2aec3a5f.vercel.app", // Vercel frontend URL
    methods: ["GET", "POST"]
}));

// Socket.IO setup with CORS configuration
const io = socketIO(server, {
    cors: {
        origin: "https://chatgpt-troll-v6yx-9hk9jl71b-paras-projects-2aec3a5f.vercel.app", // Vercel frontend URL
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 4000; // Use dynamic port for Render

// Store the chat messages
let chatMessages = [];

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send chat history to new users
    socket.emit('chatHistory', chatMessages);

    // Receive questions from users
    socket.on('question', (msg) => {
        chatMessages.push({ role: 'asker', message: msg });
        io.emit('question', msg);
    });

    // Receive responses from responders
    socket.on('response', (msg) => {
        chatMessages.push({ role: 'responder', message: msg });
        io.emit('response', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start the server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
