import React from "react";
const GamesTab = () => (
  <section>
    <button className="close-tab-button">×</button>
    <h1>Games</h1>
    <p>Fun mini-games to enjoy during breaks.</p>
    <div className="card-grid">
      <div className="card" id="trivia-card"><span className="icon">🎮</span><h3>Trivia</h3><p>Test your knowledge in quick rounds.</p></div>
      <div className="card" id="puzzle-card"><span className="icon">🧩</span><h3>Puzzle</h3><p>Relax and challenge your mind.</p></div>
      <div className="card"><span className="icon">🏆</span><h3>Wordle</h3><p>Guess word you are daily obligated hehe.</p></div>
      <div className="card"><span className="icon">📍</span><h3>WE Need YOU</h3><p>Are YOU a game developer? Do you wanna share your works with the world? Click here to learn more!</p></div>
    </div>
  </section>
);
export default GamesTab;