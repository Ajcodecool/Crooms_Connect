import React, { useState } from "react";

const CommunityTab = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");

  return (
    <section>
      <button className="close-tab-button">×</button>
      <h1>Community</h1>
      <p>Connect with classmates and teachers.</p>
      <div className="card-grid">
        <div className="card" id="clubs-card">
          <span className="icon">👥</span>
          <h3>Clubs</h3>
          <p>Find and join school clubs.</p>
        </div>
        <div className="card">
          <span className="icon">💬</span>
          <h3>Forums</h3>
          <p>Discuss topics with peers.</p>
        </div>
      </div>
    </section>
  );
};

export default CommunityTab;
