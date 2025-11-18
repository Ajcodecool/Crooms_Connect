import React from "react";

const TriviaCard = ({ onClick }) => (
  <div
    className="card hover:cursor-pointer"
    id="trivia-card"
    onClick={onClick}
    style={{
      background: "rgba(248, 249, 250, 0.05)",
      border: "1px solid rgba(248, 249, 250, 0.1)",
      borderRadius: "15px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      transition: "all 0.3s ease",
      textAlign: "center",
    }}
  >
    <span className="icon" style={{ fontSize: "35px", marginBottom: "10px", display: "block" }}>🎮</span>
    <h3>Trivia</h3>
    <p>Test your knowledge in quick rounds.</p>
  </div>
);

export default TriviaCard;