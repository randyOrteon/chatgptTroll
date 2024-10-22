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

    socket.on('getRooms', () => {
        const roomsList = Object.keys(chatRooms).map(roomId => ({
            id: roomId,
            title: `Room ${roomId}`,
            latestMessage: chatRooms[roomId][chatRooms[roomId].length - 1]?.message || 'No messages yet',
        }));
        socket.emit('roomsList', roomsList);
    });

    socket.on('question', ({ roomId, msg }) => {
        if (!chatRooms[roomId]) chatRooms[roomId] = [];
        chatRooms[roomId].push({ role: 'asker', message: msg });
        io.emit('question', { roomId, msg }); // Emit to all responders
    });

    socket.on('response', ({ roomId, msg }) => {
        if (!chatRooms[roomId]) chatRooms[roomId] = [];
        chatRooms[roomId].push({ role: 'responder', message: msg });
        io.emit('response', { roomId, msg }); // Emit to all responders
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 4000; 
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
