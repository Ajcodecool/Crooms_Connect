import React, { useState } from 'react';
// If you want Supabase integration, import supabase-js and configure accordingly.

const onlineUsers = [
  { name: "Alice", avatar: "https://ui-avatars.com/api/?name=Alice", verified: true },
  { name: "Bob", avatar: "https://ui-avatars.com/api/?name=Bob", verified: false }
  // TODO: Load dynamically
];

const messages = [
  { fromSelf: true, username: "Alice", text: "Hello!", avatar: "https://ui-avatars.com/api/?name=Alice", timestamp: "17:30" },
  { fromSelf: false, username: "Bob", text: "Hi!", avatar: "https://ui-avatars.com/api/?name=Bob", timestamp: "17:31" }
  // TODO: Load dynamically
];

export default function ChatApp() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  // TODO: Add state for chat input, messages, user profile, image block, theme, etc.

  return (
    <div className={`main-wrapper ${sidebarVisible ? "online-sidebar-visible" : ""}`}>
      {/* Sidebar */}
      <div className="online-users-sidebar">
        <div className="online-users-header">
          Online Users
          <button onClick={() => setSidebarVisible(false)}>
            <i className="fa fa-xmark"></i>
          </button>
        </div>
        <div className="online-users-list">
          {onlineUsers.map((user, idx) => (
            <div key={idx} className="online-user-item">
              <img src={user.avatar} alt={user.name} />
              <span>
                {user.name}
                {user.verified && (
                  <i className="fa fa-check-circle verified-badge" aria-label="Verified"></i>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat container */}
      <div className="chat-container">
        <div className="chat-header">
          <span>Connect Chat</span>
          <div className="user-info">
            {/* TODO: Load user info */}
            <img src="https://ui-avatars.com/api/?name=Demo" alt="User" />
            <span>DemoUser</span>
          </div>
        </div>
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message${msg.fromSelf ? " self" : ""}`}>
              <a className="avatar-link" href="#">
                <img className="avatar" src={msg.avatar} alt={msg.username} />
              </a>
              <div className="message-content">
                <div className="username">
                  {msg.username}
                  {/* TODO: Verified badge if needed */}
                </div>
                {msg.text}
                {/* TODO: Image handling */}
                <span className="timestamp">{msg.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="chat-input">
          <div className="chat-input-row w-full">
            {/* Rich text toolbar - sample, implement formatting handlers */}
            <div className="rich-text-toolbar">
              <button type="button"><i className="fa fa-bold"></i></button>
              <button type="button"><i className="fa fa-italic"></i></button>
            </div>
            <textarea
              id="chat-input-editor"
              className="w-full min-h-[40px] max-h-[150px] rounded p-2 text-black"
              placeholder="Type your message..."
            />
            <button
              type="button"
              onClick={() => { /* TODO: handle send */ }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Online count footer */}
      {!sidebarVisible && (
        <div className="online-count-footer fixed bottom-5 right-5" onClick={() => setSidebarVisible(true)}>
          <i className="fa fa-users"></i>
          {onlineUsers.length} Online
        </div>
      )}
    </div>
  );
}