import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';

// Connect to the backend
const socket = io('http://localhost:4000');

const Chat = ({ roomId }) => {
    const [chat, setChat] = useState([]);
    const chatEndRef = useRef(null);

    useEffect(() => {
        // Load chat history from localStorage on mount
        const storedChat = JSON.parse(localStorage.getItem(`chatMessages_${roomId}`)) || [];
        setChat(storedChat);

        // Listener for incoming messages
        socket.on('question', ({ roomId: receivedRoomId, msg }) => {
            if (receivedRoomId === roomId) {
                setChat(prevChat => {
                    const newChat = [...prevChat, { role: 'asker', message: msg }];
                    localStorage.setItem(`chatMessages_${roomId}`, JSON.stringify(newChat)); // Store in localStorage
                    return newChat;
                });
            }
        });

        socket.on('response', ({ roomId: receivedRoomId, msg }) => {
            if (receivedRoomId === roomId) {
                setChat(prevChat => {
                    const newChat = [...prevChat, { role: 'responder', message: msg }];
                    localStorage.setItem(`chatMessages_${roomId}`, JSON.stringify(newChat)); // Store in localStorage
                    return newChat;
                });
            }
        });

        // Scroll to bottom on new message
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

        return () => {
            socket.off('question');
            socket.off('response');
        };
    }, [roomId]);

    return (
        <div className="chat-container">
            <div className="chat-box">
                {chat.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                        {msg.role === 'responder' && (
                            <img src="/gptlogog.jpg" alt="Responder Logo" className="responder-logo" />
                        )}
                        <div className={`${msg.role} message-content`}>
                            {msg.message}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
        </div>
    );
};

const Responder = () => {
    const [rooms, setRooms] = useState({});

    useEffect(() => {
        socket.emit('getRooms');

        socket.on('roomsList', (roomsList) => {
            const formattedRooms = roomsList.reduce((acc, room) => {
                acc[room.id] = room.latestMessage;
                return acc;
            }, {});
            setRooms(formattedRooms);
        });

        return () => {
            socket.off('roomsList');
        };
    }, []);

    const sendResponse = (roomId, msg) => {
        socket.emit('response', { roomId, msg });
    };

    return (
        <div className="responder-page">
            <h2>Responder Page</h2>
            <div className="messages">
                {Object.keys(rooms).map((roomId) => (
                    <div key={roomId} className="message">
                        <div className="message-content">
                            {rooms[roomId] ? rooms[roomId] : 'No messages yet'}
                        </div>
                        <button onClick={() => sendResponse(roomId, 'This is a response!')}>
                            Respond
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const App = () => {
    const [message, setMessage] = useState('');
    const roomId = getRoomIdForUser(); // Assign a unique room ID for the user

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('question', { roomId, msg: message });
            setMessage('');
        }
    };

    return (
        <Router>
            <div className="app-container">
                <div className="top-space">
                    <h1 className="app-title">ChatGPT</h1>
                    <div className="header-buttons">
                        <button className="share-button">Share</button>
                    </div>
                    <img src="/accounthol.png" alt="Account" className="account-image" />
                </div>
                <div className="chat-wrapper">
                    <Routes>
                        <Route path="/" element={<Navigate to="/user" replace />} />
                        <Route path="/user" element={<Chat roomId={roomId} />} />
                        <Route path="/responder" element={<Responder />} />
                        <Route path="*" element={<Navigate to="/user" replace />} />
                    </Routes>
                </div>
                <div className="bottom-space">
                    <form onSubmit={sendMessage} className="input-area">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Ask a question or type your response..."
                            className="chat-input"
                        />
                        <button type="submit" className="chat-button">
                            <img className="send-icon" src="/arrow3.svg" alt="" />
                        </button>
                    </form>
                    <div style={{ marginTop: '10px', color: '#e0e0e0' }}>
                        ChatGPT can make mistakes. Check important info.
                    </div>
                </div>
            </div>
        </Router>
    );
};

// Function to assign a unique room ID for the user
const getRoomIdForUser = () => {
    const userId = localStorage.getItem('userId') || Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', userId); // Store user ID in localStorage
    return `room-${userId}`;
};

export default App;
