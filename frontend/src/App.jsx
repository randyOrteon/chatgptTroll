import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css'; // Import the CSS for styling

// Connect to the backend locally
const socket = io('http://localhost:4000');

const Chat = ({ isResponder }) => {
    const [chat, setChat] = useState([]);
    const chatEndRef = useRef(null);

    useEffect(() => {
        // Load chat history on mount
        socket.on('chatHistory', (history) => {
            setChat(history);
        });

        socket.on('question', (msg) => {
            setChat((prevChat) => [...prevChat, { role: 'asker', message: msg }]);
        });

        socket.on('response', (msg) => {
            setChat((prevChat) => [...prevChat, { role: 'responder', message: msg }]);
        });

        // Scroll to bottom on new message
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

        return () => {
            socket.off('chatHistory');
            socket.off('question');
            socket.off('response');
        };
    }, [chat]);

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
                <div ref={chatEndRef} /> {/* Scroll ref */}
            </div>
        </div>
    );
};

const User = () => <Chat isResponder={false} />;
const Responder = () => <Chat isResponder={true} />;

const App = () => {
    const [message, setMessage] = useState('');

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            const isResponder = window.location.pathname === "/responder";
            if (isResponder) {
                socket.emit('response', message);
            } else {
                socket.emit('question', message);
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

export default App;
