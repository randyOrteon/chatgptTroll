import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:4000');

// Log when the client connects
socket.on('connect', () => {
    console.log('Connected to Socket.IO server:', socket.id);
        const roomId = window.location.pathname.split('/').pop(); 
        socket.emit('joinRoom', roomId);
});

socket.on('disconnect', () => {
    console.log('Disconnected from Socket.IO server');
});

const Chat = () => {
    const { roomId } = useParams();
    const [chat, setChat] = useState([]);
    const [message, setMessage] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        socket.emit('getMessages', roomId);

      const handleChatHistory = (messages) => {
        setChat(messages);
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };


        const handleQuestion = ({ roomId: receivedRoomId, msg }) => {
            console.log('Received question:', msg);
            if (receivedRoomId === roomId) {
                setChat((prevChat) => {
                    const newChat = [...prevChat, { role: 'asker', message: msg }];
                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    return newChat;
                });
            }
        };

        const handleResponse = ({ roomId: receivedRoomId, msg }) => {
            console.log('Received response:', msg);
            if (receivedRoomId === roomId) {
                setChat((prevChat) => {
                    const newChat = [...prevChat, { role: 'responder', message: msg }];
                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    return newChat;
                });
            }
        };

        socket.on('chatHistory', handleChatHistory);
        socket.on('question', handleQuestion);
        socket.on('response', handleResponse);

        return () => {
            socket.off('chatHistory', handleChatHistory);
            socket.off('question', handleQuestion);
            socket.off('response', handleResponse);
        };
    }, [roomId]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            const role = window.location.pathname.includes('/chat/') ? 'responder' : 'asker';
            console.log(`Sending ${role} message: ${message}`);
            socket.emit(role === 'responder' ? 'response' : 'question', { roomId, msg: message });
            setMessage('');
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
    const [activeRooms, setActiveRooms] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        socket.emit('getRooms');

        socket.on('roomsList', (roomsList) => {
            console.log('Received rooms list:', roomsList);
            const formattedRooms = roomsList.reduce((acc, room) => {
                acc[room.id] = room.latestMessage;
                return acc;
            }, {});
            setActiveRooms(formattedRooms);
        });

        const handleQuestion = ({ roomId, msg }) => {
            console.log('Received question:', msg);
            setActiveRooms((prevActive) => ({
                ...prevActive,
                [roomId]: msg, 
            }));
        };

        socket.on('question', handleQuestion);

        return () => {
            socket.off('roomsList');
            socket.off('question', handleQuestion);
        };
    }, []);

    const handleRoomClick = (roomId) => {
        navigate(`/chat/${roomId}`); 
    };

    const sendResponse = (roomId) => {
        const responseMessage = 'This is a response!'; 
        console.log(`Sending response message: ${responseMessage}`);
        socket.emit('response', { roomId, msg: responseMessage });
        navigate(`/chat/${roomId}`); 
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
                                e.stopPropagation(); 
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
    const roomId = getRoomIdForUser(); 

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
    return `room-${Math.random().toString(36).substr(2, 9)}`; 
};

export default App;