const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "https://your-frontend-url.vercel.app", // Replace with your Vercel frontend URL
        methods: ["GET", "POST"]
    }
});

app.use(cors());

const PORT = process.env.PORT || 4000; // Use dynamic port for hosting services like Render

// Store the chat messages (for simplicity)
let chatMessages = [];

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send chat history to new users
    socket.emit('chatHistory', chatMessages);

    // Receive messages from users
    socket.on('question', (msg) => {
        // Save question to chat history
        chatMessages.push({ role: 'asker', message: msg });

        // Emit the question to all connected users
        io.emit('question', msg);
    });

    // Responders reply (you)
    socket.on('response', (msg) => {
        // Save response to chat history
        chatMessages.push({ role: 'responder', message: msg });

        // Emit the response to all connected users
        io.emit('response', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start the server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
