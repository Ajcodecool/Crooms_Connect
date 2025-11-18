import React from "react";

const PuzzleCard = ({ onClick }) => {
  return (
    <div
      className="card hover:cursor-pointer"
      id="puzzle-card"
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
      <span className="icon" style={{ fontSize: "35px", marginBottom: "10px", display: "block" }}>🧩</span>
      <h3>Puzzle</h3>
      <p>Relax and challenge your mind.</p>
    </div>
  );
};

export default PuzzleCard;