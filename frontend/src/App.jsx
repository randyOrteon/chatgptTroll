import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css'; // Import the CSS for styling

const socket = io('http://localhost:4000');

const Chat = ({ isResponder }) => {
    const [chat, setChat] = useState([]);
    const chatEndRef = useRef(null); // Create a ref for scrolling

    useEffect(() => {
        // Get the chat history when the component mounts
        socket.on('chatHistory', (history) => {
            setChat(history); // Update chat with history
        });

        socket.on('question', (msg) => {
            setChat((prevChat) => [...prevChat, { role: 'asker', message: msg }]);
        });

        socket.on('response', (msg) => {
            setChat((prevChat) => [...prevChat, { role: 'responder', message: msg }]);
        });

        // Scroll to the bottom when chat updates
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

        return () => {
            socket.off('chatHistory');
            socket.off('question');
            socket.off('response');
        };
    }, [chat]); // Add chat as a dependency

    return (
        <div className="chat-container"> {/* New chat container */}
            <div className="chat-box">
                {chat.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                        <div className={`${msg.role} message-content`}>
                            {msg.message}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} /> {/* This ref will point to the end of chat */}
            </div>
        </div>
    );
};

const User = () => {
    return <Chat isResponder={false} />;
};

const Responder = () => {
    return <Chat isResponder={true} />;
};

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
                    <h1 className="app-title">ChatGPT</h1> {/* Changed title to ChatGPT */}
                    <div className="header-buttons">
                        <button className="share-button">Share</button> {/* Added Share button */}
                        <img src="https://via.placeholder.com/30" alt="Account" className="account-image" /> {/* Dummy account image */}
                    </div>
                </div>
                <div className="chat-wrapper"> {/* Wrapping the Routes in a new div */}
                    <Routes>
                        <Route path="/" element={<Navigate to="/user" replace />} />
                        <Route path="/user" element={<User />} />
                        <Route path="/responder" element={<Responder />} />
                        <Route path="*" element={<Navigate to="/user" replace />} />
                    </Routes>
                </div>
                <div className="bottom-space"> {/* New fixed bottom space */}
                    <form onSubmit={sendMessage} className="input-area">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Ask a question or type your response..."
                            className="chat-input"
                        />
                        <button type="submit" className="chat-button">Send</button>
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
