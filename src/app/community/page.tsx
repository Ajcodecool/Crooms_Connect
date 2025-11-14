"use client";

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
}

export default function CommunityPage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'You',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
  };

  const goToMainLayout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    router.push('/');
  };

  return (
    <div className="main-wrapper">
      <div className="chat-container">
        <div className="scroll-to-bottom-btn" id="scroll-to-bottom">
          <i className="fas fa-arrow-down" />
        </div>
        
        <div className="chat-header">
          <div className="text-xl" id="chat-header-title">Crooms Connect Chat</div>
          
          <div className="search-bar" id="search-bar">
            <input 
              id="search-input" 
              placeholder="Search loaded messages..." 
              type="text" 
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              className="header-icon-btn" 
              id="search-btn" 
              title="Search"
              type="button"
            >
              <i className="fas fa-search" />
            </button>
            <button 
              className="header-icon-btn" 
              id="online-toggle-btn" 
              title="Toggle Online Users"
              type="button"
            >
              <i className="fas fa-users" />
            </button>
            <button 
              className="header-icon-btn" 
              id="settings-btn" 
              title="Settings"
              type="button"
            >
              <i className="fas fa-cog" />
            </button>
          </div>
        </div>
        
        <div className="chat-messages" id="chat-box">
          {messages.map(msg => (
            <div key={msg.id} className="message">
              <div className="message-content">
                <div className="username">
                  {msg.sender}
                  <span className="timestamp">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="text">{msg.text}</div>
              </div>
            </div>
          ))}
        </div>
        
        <form onSubmit={handleSendMessage} className="chat-input">
          <div className="rich-text-toolbar" id="rich-text-toolbar">
            <button type="button" data-format="bold" title="Bold">
              <i className="fas fa-bold" />
            </button>
            <button type="button" data-format="italic" title="Italic">
              <i className="fas fa-italic" />
            </button>
          </div>
          
          <div className="chat-input-row">
            <textarea
              id="chat-input-editor"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message (Enter to send, Shift+Enter for new line)"
            />
            <button type="submit" className="send-button">Send</button>
          </div>
        </form>
      </div>

      <div className="online-users-sidebar" id="online-users-sidebar">
        <div className="online-users-header">
          Online — 0
        </div>
        <div className="online-users-list">
          {/* Online users will be listed here */}
        </div>
      </div>

      <div className="toast-notification" id="toast-notification">
        <span className="icon" />
        <span className="message" />
      </div>
    </div>
  );
}