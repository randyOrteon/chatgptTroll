const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const app = express();
const server = http.createServer(app);
require('dotenv').config();

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

app.use(cors());

// MongoDB connection
mongoose.connect("mongodb+srv://parassareen:parassareen1@cluster0.qnxcu.mongodb.net/", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schema
const messageSchema = new mongoose.Schema({
    role: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
    roomId: { type: String, unique: true },
    messages: [messageSchema],
    lastActivity: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

const generateUniqueRoomId = () => {
    return `room-${Math.random().toString(36).substr(2, 9)}`;
};

const mailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    auth: {
        user: 'chatgpttroll57@gmail.com',
        pass: 'kdbg hrlf rdpg ibcu'
    }
});

const sendEmail = (id) => {
    const email = 'benpalmer3000@gmail.com';
    const mailOptions = {
        from: 'chatgpttroll57@gmail.com',
        to: email,
        subject: 'New Client Connected',
        text: `A new client has connected on your GPT with socket ID: ${id}`
    };

    mailTransporter.sendMail(mailOptions)
        .then(info => console.log('Email sent:', info.response))
        .catch(error => console.log('Error sending email:', error));
};

const saveMessage = async (roomId, role, msg) => {
    // console.log('Attempting to save message:', { roomId, role, msg });
    
    try {
        const result = await Room.findOneAndUpdate(
            { roomId },
            { 
                $push: { 
                    messages: { 
                        role, 
                        message: msg,
                        timestamp: new Date()
                    } 
                },
                $setOnInsert: { roomId },
                $set: { lastActivity: new Date() }
            },
            { 
                upsert: true, 
                new: true,
                runValidators: true
            }
        );
        // console.log('Message saved successfully:', result);
        return result;
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
};

const getRoomMessages = async (roomId) => {
    try {
        const room = await Room.findOne({ roomId });
        return room ? room.messages : [];
    } catch (error) {
        console.error('Error getting room messages:', error);
        throw error;
    }
};

const deleteRoom = async (roomId) => {
    try {
        const result = await Room.deleteOne({ roomId });
        // console.log('Room deleted:', result);
        return result;
    } catch (error) {
        console.error('Error deleting room:', error);
        throw error;
    }
};

const getAllRooms = async () => {
    try {
        return await Room.find({}).sort({ lastActivity: -1 });
    } catch (error) {
        console.error('Error getting all rooms:', error);
        throw error;
    }
};

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    setImmediate(() => {
        sendEmail(socket.id);
    });

    socket.on("createRoom", async (callback) => {
        try {
            const newRoomId = generateUniqueRoomId();
            await Room.create({ roomId: newRoomId });
            console.log('New room created:', newRoomId);
            callback(newRoomId);
        } catch (error) {
            console.error('Error creating room:', error);
            callback(null, 'Error creating room');
        }
    });

    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`Client ${socket.id} joined room ${roomId}`);
    });

    socket.on('getMessages', async (roomId) => {
        try {
            const messages = await getRoomMessages(roomId);
            socket.emit('chatHistory', messages);
        } catch (err) {
            console.error('Error getting messages:', err);
            socket.emit('error', { message: 'Failed to get messages' });
        }
    });

    socket.on('question', async (data) => {
        const { roomId, msg } = data;
        console.log('Received question:', { roomId, msg });

        io.to(roomId).emit('question', { roomId, msg });

        try {
            await saveMessage(roomId, 'asker', msg);
            const updatedMessages = await getRoomMessages(roomId);
            io.to(roomId).emit('chatHistory', updatedMessages);
            io.emit('getRooms');
        } catch (err) {
            console.error('Error handling question:', err);
            socket.emit('error', { message: 'Failed to save message' });
        }
    });

    socket.on('response', async (data) => {
        const { roomId, msg } = data;
        console.log('Received response:', { roomId, msg });

        io.to(roomId).emit('response', { roomId, msg });

        try {
            await saveMessage(roomId, 'responder', msg);
            const updatedMessages = await getRoomMessages(roomId);
            io.to(roomId).emit('chatHistory', updatedMessages);
            io.emit('getRooms');
        } catch (err) {
            console.error('Error handling response:', err);
            socket.emit('error', { message: 'Failed to save message' });
        }
    });

    socket.on('typing', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('typing');
    });

    socket.on('stopTyping', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('stopTyping');
    });

    socket.on('deleteRoom', async (roomId) => {
        console.log(`Received deleteRoom event for room: ${roomId}`);
        try {
            await deleteRoom(roomId);
            console.log(`Room deleted: ${roomId}`);
            io.to(roomId).emit('roomDeleted', { roomId });
            io.emit('getRooms');
        } catch (err) {
            console.error('Error deleting room:', err);
            socket.emit('error', { message: 'Failed to delete room' });
        }
    });

    socket.on('getRooms', async () => {
        try {
            const rooms = await getAllRooms();
            const roomsList = rooms.map(room => ({
                id: room.roomId,
                latestMessage: room.messages[0]?.message || 'No messages yet',
                lastActivity: room.lastActivity
            }));
            console.log('Sending rooms list:', roomsList);
            io.emit('roomsList', roomsList);
        } catch (err) {
            console.error('Error getting rooms:', err);
            socket.emit('error', { message: 'Failed to get rooms' });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
