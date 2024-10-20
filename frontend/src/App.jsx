import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Route, Routes, Navigate, Link, useParams } from 'react-router-dom';
import './App.css'; // Import the CSS for styling

// Connect to the backend
const socket = io('http://localhost:4000'); // Update for local development

const Chat = ({ userId }) => {
    const [chat, setChat] = useState([]);
    const chatEndRef = useRef(null);

    useEffect(() => {
        // Join the user's specific room
        socket.emit('joinRoom', userId);

        // Load chat history for this room
        socket.emit('getChatHistory', userId);

        socket.on('chatHistory', (history) => {
            setChat(history);
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });

        socket.on('question', (msg) => {
            if (msg.userId === userId) {
                setChat((prevChat) => [...prevChat, { role: 'asker', userId: msg.userId, message: msg.message }]);
            }
        });

        socket.on('response', (msg) => {
            if (msg.userId === userId) {
                setChat((prevChat) => [...prevChat, { role: 'responder', userId: msg.userId, message: msg.message }]);
            }
        });

        return () => {
            socket.off('chatHistory');
            socket.off('question');
            socket.off('response');
        };
    }, [userId]);

    return (
        <div className="chat-container">
            <div className="chat-box">
                {chat.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                        <div className={`${msg.role} message-content`}>
                            {msg.message} <br />
                            <small>{msg.userId}</small> {/* Display user ID with each message */}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} /> {/* Scroll ref */}
            </div>
        </div>
    );
};

const User = () => {
    const [userId, setUserId] = useState('');

    useEffect(() => {
        // Get or generate a unique user ID
        const id = localStorage.getItem('userId') || generateUniqueId();
        setUserId(id);
        localStorage.setItem('userId', id);
    }, []);

    return <Chat userId={userId} />;
};

const Responder = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        // Get the initial list of users
        socket.emit('getUserList');

        socket.on('userList', (userIds) => {
            setUsers(userIds);
        });

        // Listen for new user messages to update the user list dynamically
        socket.on('userMessage', (userId) => {
            setUsers((prevUsers) => {
                const updatedUsers = prevUsers.filter((id) => id !== userId);
                return [userId, ...updatedUsers];
            });
        });

        return () => {
            socket.off('userList');
            socket.off('userMessage');
        };
    }, []);

    return (
        <div className="responder-dashboard">
            <h2>User List</h2>
            <ul className="user-list">
                {users.map((id) => (
                    <li key={id}>
                        <Link to={`/responder/${id}`}>User {id}</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const ResponderChat = () => {
    const { userId } = useParams(); // Get userId from URL
    return <Chat userId={userId} />;
};

const App = () => {
    const [message, setMessage] = useState('');

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            const isResponder = window.location.pathname.startsWith("/responder");
            const userId = localStorage.getItem('userId'); // Get the unique user ID

            if (isResponder) {
                socket.emit('response', { message, userId });
            } else {
                socket.emit('question', { message, userId });
            }
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
                        <Route path="/user" element={<User />} />
                        <Route path="/responder" element={<Responder />} />
                        <Route path="/responder/:userId" element={<ResponderChat />} />
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

// Function to generate a unique ID
const generateUniqueId = () => {
    return Math.random().toString(36).substr(2, 9); // Simple unique ID generation
};

export default App;
