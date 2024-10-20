const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for the Vercel frontend URL
app.use(cors({
    origin: "https://chatgpt-troll-77939zk3n-paras-projects-2aec3a5f.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
}));

const io = socketIO(server, {
    cors: {
        origin: "https://chatgpt-troll-77939zk3n-paras-projects-2aec3a5f.vercel.app",
        methods: ["GET", "POST"],
        credentials: true,
    }
});

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

// Start the server (only once)
const PORT = process.env.PORT || 4000; // Use dynamic port for Render
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
