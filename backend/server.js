const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

app.use(cors());

cloudinary.config({
    cloud_name: "dwdffshqd",
    api_key: "158173115974515",
    api_secret: "5ToDbwGd91ilrDSDYLCcFJaCe6Y"
});

let messages = {};

const generateUniqueRoomId = () => {
    return `room-${Math.random().toString(36).substr(2, 9)}`;
};

const mailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (id) => {
    const email = process.env.NOTIFICATION_EMAIL;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'New Client Connected',
        text: `A new client has connected on your GPT with socket ID: ${id}`
    };

    try {
        const info = await mailTransporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
    } catch (error) {
        console.log('Error sending email:', error);
    }
};

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    setImmediate(() => {
        sendEmail(socket.id);
    });

    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`Client ${socket.id} joined room ${roomId}`);
        socket.broadcast.emit('userJoined', { roomId });
        io.emit('userJoined', { roomId });
    });

    socket.on("createRoom", (callback) => {
        const newRoomId = generateUniqueRoomId();
        callback(newRoomId);
    });

    socket.on('getMessages', (roomId) => {
        const roomMessages = messages[roomId] || [];
        socket.emit('chatHistory', roomMessages);
    });

    socket.on('question', async (data) => {
        const { roomId, msg, image } = data;
        messages[roomId] = messages[roomId] || [];
        
        let imageUrl = null;
        if (image) {
            try {
                const uploadResult = await cloudinary.uploader.upload(image, {
                    folder: 'chat_images',
                });
                imageUrl = uploadResult.secure_url;
            } catch (error) {
                console.error('Error uploading image to Cloudinary:', error);
            }
        }
        
        const newMessage = { role: 'asker', message: msg, image: imageUrl };
        messages[roomId].push(newMessage);
        io.to(roomId).emit('question', newMessage);
        io.to(roomId).emit('chatHistory', messages[roomId]);
        io.emit('getRooms');
    });

    socket.on('response', async (data) => {
        const { roomId, msg, image } = data;
        messages[roomId] = messages[roomId] || [];
        
        let imageUrl = null;
        if (image) {
            try {
                const uploadResult = await cloudinary.uploader.upload(image, {
                    folder: 'chat_images',
                });
                imageUrl = uploadResult.secure_url;
            } catch (error) {
                console.error('Error uploading image to Cloudinary:', error);
            }
        }
        
        const newMessage = { role: 'responder', message: msg, image: imageUrl };
        messages[roomId].push(newMessage);
        io.to(roomId).emit('response', newMessage);
        io.to(roomId).emit('chatHistory', messages[roomId]);
        io.emit('getRooms');
    });

    socket.on("typing", ({ roomId }) => {
        socket.to(roomId).emit("typing");
    });
      
    socket.on("stopTyping", ({ roomId }) => {
        socket.to(roomId).emit("stopTyping");
    });

    socket.on('deleteRoom', (roomId) => {
        console.log(`Received deleteRoom event for room: ${roomId}`);
        if (messages[roomId]) {
            console.log(`Deleting room from server: ${roomId}`);
            io.to(roomId).emit('roomDeleted', { roomId });
            delete messages[roomId];
            io.emit('getRooms');
        } else {
            console.log(`Room not found: ${roomId}`);
        }
    });

    socket.on('getRooms', () => {
        const roomsList = Object.keys(messages).map((roomId) => ({
            id: roomId,
            latestMessage: messages[roomId][messages[roomId].length - 1]?.message || 'No messages yet'
        }));
        console.log('Sending rooms list:', roomsList);
        io.emit('roomsList', roomsList);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
