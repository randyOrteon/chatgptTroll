import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css'; // Import the CSS for styling

const socket = io('http://localhost:4000');

const Chat = ({ isResponder }) => {
    const [message, setMessage] = useState('');
    const [chat, setChat] = useState([]);

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

        return () => {
            socket.off('chatHistory');
            socket.off('question');
            socket.off('response');
        };
    }, []);

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            if (isResponder) {
                socket.emit('response', message);
            } else {
                socket.emit('question', message);
            }
            setMessage('');
        }
    };

    return (
        <div className="app-container">
            <h1 className="title">{isResponder ? 'Responder' : 'Ask a Question'}</h1>
            <div className="chat-box">
                {chat.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                        {msg.role === 'responder' ? "You: " : "User: "}
                        {msg.message}
                    </div>
                ))}
            </div>
            <form onSubmit={sendMessage} className="chat-form">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isResponder ? "Type your response..." : "Ask a question..."}
                    className="chat-input"
                />
                <button type="submit" className="chat-button">Send</button>
            </form>
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
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/user" replace />} />
                <Route path="/user" element={<User />} />
                <Route path="/responder" element={<Responder />} />
                <Route path="*" element={<Navigate to="/user" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
