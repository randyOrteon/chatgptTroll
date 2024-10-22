const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

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

// Store the chat messages and rooms
let chatRooms = {};

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send chat history to new users
    socket.emit('chatHistory', chatRooms);

    socket.on('getRooms', () => {
        const roomsList = Object.keys(chatRooms).map(roomId => ({
            id: roomId,
            title: `Room ${roomId}`,
            latestMessage: chatRooms[roomId][chatRooms[roomId].length - 1]?.message || 'No messages yet',
        }));
        socket.emit('roomsList', roomsList);
    });

    socket.on('question', (msg) => {
        const roomId = getRoomIdForUser(socket.id); // Assign a room based on user
        if (!chatRooms[roomId]) chatRooms[roomId] = [];
        chatRooms[roomId].push({ role: 'asker', message: msg });
        io.emit('question', msg);
    });

    socket.on('response', (msg) => {
        const roomId = getRoomIdForUser(socket.id); // Assign a room based on responder
        if (!chatRooms[roomId]) chatRooms[roomId] = [];
        chatRooms[roomId].push({ role: 'responder', message: msg });
        io.emit('response', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Function to assign a room ID based on the socket ID
const getRoomIdForUser = (socketId) => {
    return socketId; // Simple example to use socket ID as room ID
};

const PORT = process.env.PORT || 4000; 
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
