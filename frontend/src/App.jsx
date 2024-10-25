import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Route, Routes, Navigate, useParams, useNavigate } from 'react-router-dom';
import './App.css';

// Connect to the backend
const socket = io('https://chatgptf.onrender.com');

const Chat = () => {
    const { roomId } = useParams(); // Get roomId from URL parameters
    const [chat, setChat] = useState([]);
    const [message, setMessage] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        // Load chat history from server when the component mounts
        socket.emit('getMessages', roomId);

        // Handle chat history from server
        const handleChatHistory = (messages) => {
            setChat(messages);
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        };

        // Listener for incoming messages
        const handleQuestion = ({ roomId: receivedRoomId, msg }) => {
            if (receivedRoomId === roomId) {
                setChat((prevChat) => {
                    const newChat = [...prevChat, { role: 'asker', message: msg }];
                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    return newChat;
                });
            }
        };
    
        const handleResponse = ({ roomId: receivedRoomId, msg }) => {
            if (receivedRoomId === roomId) {
                setChat((prevChat) => {
                    const newChat = [...prevChat, { role: 'responder', message: msg }];
                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    return newChat;
                });
            }
        };

        // Register event listeners
        socket.on('chatHistory', handleChatHistory);
        socket.on('question', handleQuestion);
        socket.on('response', handleResponse);

        // Cleanup function to remove event listeners
        return () => {
            socket.off('chatHistory', handleChatHistory);
            socket.off('question', handleQuestion);
            socket.off('response', handleResponse);
        };
    }, [roomId]); // Update whenever roomId changes

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            const role = window.location.pathname.includes('/chat/') ? 'responder' : 'asker'; // Determine role based on route
            socket.emit(role === 'responder' ? 'response' : 'question', { roomId, msg: message }); // Emit message to server based on role
            setChat((prevChat) => [...prevChat, { role, message }]); // Optimistically update the chat state
            setMessage(''); // Clear the input field
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

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
            <form onSubmit={sendMessage} className="input-area">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="chat-input"
                />
                <button type="submit" className="chat-button">
                    <img className="send-icon" src="/arrow3.svg" alt="Send" />
                </button>
            </form>
            <div className="footer-message">
                ChatGPT can make mistakes. Check important info.
            </div>
        </div>
    );
};

const Responder = () => {
    const [rooms, setRooms] = useState({});
    const [activeRooms, setActiveRooms] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        socket.emit('getRooms'); // Request the list of rooms

        socket.on('roomsList', (roomsList) => {
            const formattedRooms = roomsList.reduce((acc, room) => {
                acc[room.id] = room.latestMessage;
                return acc;
            }, {});
            setRooms(formattedRooms);
            setActiveRooms(formattedRooms); // Initialize activeRooms with all rooms
        });

        const handleQuestion = ({ roomId, msg }) => {
            setActiveRooms((prevActive) => {
                if (prevActive[roomId]) {
                    // If room already exists in activeRooms, return it
                    return prevActive;
                } else {
                    // Otherwise, add it as an active room
                    return {
                        ...prevActive,
                        [roomId]: msg,
                    };
                }
            });
        };

        socket.on('question', handleQuestion);

        return () => {
            socket.off('roomsList');
            socket.off('question', handleQuestion);
        };
    }, []);

    const handleRoomClick = (roomId) => {
        navigate(`/chat/${roomId}`); // Navigate to the chat room
    };

    const sendResponse = (roomId) => {
        const responseMessage = 'This is a response!'; // Message to be sent from responder
        socket.emit('response', { roomId, msg: responseMessage });
        navigate(`/chat/${roomId}`); // Navigate to the chat room after sending response
    };

    return (
        <div className="responder-page">
            <h2 className="responder-title">Responder Dashboard</h2>
            <div className="active-rooms">
                {Object.keys(activeRooms).length === 0 ? (
                    <p className="no-active-users">No active users at the moment.</p>
                ) : (
                    Object.keys(activeRooms).map((roomId) => (
                        <div key={roomId} className="room-item" onClick={() => handleRoomClick(roomId)}>
                            <div className="message-content">
                                {activeRooms[roomId] || 'No messages yet'}
                            </div>
                            <button className="respond-button" onClick={(e) => {
                                e.stopPropagation(); // Prevent room click when clicking the button
                                sendResponse(roomId);
                            }}>
                                Respond
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const App = () => {
    const roomId = getRoomIdForUser(); // Generate a unique room ID for each session

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
                        <Route path="/" element={<Navigate to={`/user/${roomId}`} replace />} />
                        <Route path="/user/:roomId" element={<Chat />} />
                        <Route path="/responder" element={<Responder />} />
                        <Route path="/chat/:roomId" element={<Chat />} />
                        <Route path="*" element={<Navigate to={`/user/${roomId}`} replace />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
};

// Function to assign a unique room ID for the user
const getRoomIdForUser = () => {
    return `room-${Math.random().toString(36).substr(2, 9)}`; // Generate a new unique room ID each time
};

export default App;
