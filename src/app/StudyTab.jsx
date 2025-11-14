import React, { useState, useEffect } from "react";

const StudyTab = () => {
  // --- Pomodoro Timer State ---
  const DEFAULT_TIME = 25 * 60; // 25 minutes in seconds
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_TIME);
  const [isActive, setIsActive] = useState(false);

  // --- Timer Logic ---
  useEffect(() => {
    let interval = null;

    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsActive(false); // stop automatically when it hits 0
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft]);

  // --- Controls ---
  const toggleTimer = () => {
    setIsActive((prev) => !prev);
  };

  const resetTimer = () => {
    setSecondsLeft(DEFAULT_TIME);
    setIsActive(false);
  };

  // --- Format seconds as mm:ss ---
  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <section>
      <button className="close-tab-button">×</button>
      <h1>Study Tools</h1>
      <p>Helpful tools to keep you learning.</p>

      <div className="card-grid">
        {/* Flashcards */}
        <div
          className="card"
          onClick={() =>
            window.open("https://quizlet.com/study-guides/upload?inFolder=159572797", "_blank")
          }
          style={{ cursor: "pointer" }}
        >
          <span className="icon">📝</span>
          <h3>Flashcards</h3>
          <p>Review terms quickly.</p>
        </div>

        {/* Practice Quizzes */}
        <div
          className="card"
          onClick={() =>
            window.open("https://minitoolai.com/ai-test-generator/", "_blank")
          }
          style={{ cursor: "pointer" }}
        >
          <span className="icon">❓</span>
          <h3>Practice Quizzes</h3>
          <p>Test your knowledge.</p>
        </div>

        {/* Pomodoro Timer */}
        <div className="card">
          <span className="icon">⏱️</span>
          <h3>Pomodoro Timer</h3>
          <p>{formatTime(secondsLeft)}</p>

          <div className="timer-controls">
            <button onClick={toggleTimer}>
              {isActive ? "Pause" : "Start"}
            </button>
            <button onClick={resetTimer}>Reset</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StudyTab;
