'use client';
import React, { useState } from "react";

const categories = {
  "Programming": [
    { q: "What does 'HTML' stand for?", a: "HyperText Markup Language", value: 100 },
    { q: "Which language is used to style web pages?", a: "CSS", value: 200 },
    { q: "What does 'API' stand for?", a: "Application Programming Interface", value: 300 },
  ],
  "Computer History": [
    { q: "Who is known as the father of computing?", a: "Charles Babbage", value: 100 },
    { q: "What year was the first iPhone released?", a: "2007", value: 200 },
    { q: "Who founded Microsoft?", a: "Bill Gates", value: 300 },
  ],
  "Cybersecurity": [
    { q: "What does 'VPN' stand for?", a: "Virtual Private Network", value: 100 },
    { q: "What type of attack floods a server with traffic?", a: "DDoS", value: 200 },
    { q: "What is phishing?", a: "A fraudulent attempt to obtain sensitive info by disguising as a trusted entity", value: 300 },
  ],
  "AI & Robotics": [
    { q: "What does 'AI' stand for?", a: "Artificial Intelligence", value: 100 },
    { q: "What is the name of the humanoid robot developed by Hanson Robotics?", a: "Sophia", value: 200 },
    { q: "What programming language is most commonly used in AI research?", a: "Python", value: 300 },
  ],
};

const TechJeopardyGame = () => {
  const [score, setScore] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [answered, setAnswered] = useState({});
  const [userAnswer, setUserAnswer] = useState("");
  const [gameOver, setGameOver] = useState(false);

  const handleSelect = (category, index) => {
    const key = `${category}-${index}`;
    if (answered[key]) return;
    setActiveQuestion({ category, index });
    setUserAnswer("");
  };

  const handleSubmit = () => {
    if (!activeQuestion) return;
    const { category, index } = activeQuestion;
    const question = categories[category][index];
    const key = `${category}-${index}`;
    const correct = userAnswer.trim().toLowerCase() === question.a.trim().toLowerCase();

    setScore(prev => prev + (correct ? question.value : -question.value));
    setAnswered(prev => ({ ...prev, [key]: { correct } }));
    setActiveQuestion(null);

    const total = Object.values(categories).flat().length;
    if (Object.keys(answered).length + 1 === total) setGameOver(true);
  };

  if (gameOver) {
    return (
      <div className="jeopardy-end">
        <h1>Game Over!</h1>
        <h2>Your Final Score: {score}</h2>
        <button onClick={() => window.location.reload()}>Play Again</button>
      </div>
    );
  }

  return (
    <div className="jeopardy-container">
      <h1>💻 Tech Jeopardy!</h1>
      <h2>Score: {score}</h2>

      <div className="jeopardy-board">
        {Object.keys(categories).map((category) => (
          <div key={category} className="category">
            <h3>{category}</h3>
            {categories[category].map((question, i) => {
              const key = `${category}-${i}`;
              const state = answered[key];
              return (
                <button
                  key={i}
                  className={`question-btn ${state ? (state.correct ? "correct" : "wrong") : ""}`}
                  disabled={!!state}
                  onClick={() => handleSelect(category, i)}
                >
                  {state ? (state.correct ? "✔️" : "❌") : `$${question.value}`}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {activeQuestion && (
        <div className="question-modal">
          <div className="question-box">
            <h2>{categories[activeQuestion.category][activeQuestion.index].q}</h2>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Your answer..."
            />
            <div className="modal-actions">
              <button onClick={handleSubmit}>Submit</button>
              <button onClick={() => setActiveQuestion(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechJeopardyGame;
