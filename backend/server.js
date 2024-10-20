const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for all origins
app.use(cors({
    origin: '*',
    methods: ["GET", "POST"],
    credentials: true
}));

const io = socketIO(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Store the chat messages and active users
let chatMessages = {};
let activeUsers = [];
let rooms = {}; // Track which room each user is in
let roomCounter = 0; // Track which room to assign next

io.on('connection', (socket) => {
    console.log('A user connected');

    const userId = socket.handshake.query.userId || generateUniqueId();
    let room;

    // Assign the user to a new room if they are not already in one
    if (!rooms[userId]) {
        room = `room${++roomCounter}`;
        rooms[userId] = room;
    } else {
        room = rooms[userId];
    }

    // Add the user to the specific room
    socket.join(room);

    if (!activeUsers.includes(userId)) {
        activeUsers.push(userId);
    }

    // Send the chat history for a specific room
    socket.on('getChatHistory', (userId) => {
        const userChatMessages = chatMessages[userId] || [];
        socket.emit('chatHistory', userChatMessages);
    });

    // Send the list of active users to the responder
    socket.on('getUserList', () => {
        socket.emit('userList', activeUsers);
    });

    // Handle questions from users
    socket.on('question', ({ message, userId }) => {
        if (!chatMessages[userId]) {
            chatMessages[userId] = [];
        }
        chatMessages[userId].push({ role: 'asker', userId, message });
        io.to(rooms[userId]).emit('question', { userId, message });

        // Notify responder to move the user to the top of the list
        io.emit('userMessage', userId);
    });

    // Handle responses from the responder
    socket.on('response', ({ message, userId }) => {
        if (!chatMessages[userId]) {
            chatMessages[userId] = [];
        }
        chatMessages[userId].push({ role: 'responder', userId, message });
        io.to(rooms[userId]).emit('response', { userId, message });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Function to generate a unique ID
const generateUniqueId = () => {
    return Math.random().toString(36).substr(2, 9); // Simple unique ID generation
};

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
