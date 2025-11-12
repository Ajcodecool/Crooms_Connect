"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const TechJeopardyGame = dynamic(
  () => import("./src_components_TechJeopardyGame"),
  { ssr: false }
);

const SlidingPuzzleGame = dynamic(
  () => import("./src_components_SlidingPuzzleGame"),
  { ssr: false }
);

const GamesTab = () => {
  const [openGame, setOpenGame] = useState("");

  /** @param {string} game */
  const openModal = (game) => setOpenGame(game);
  const closeModal = () => setOpenGame("");

  return (
    <section className="games-tab">
      <div className="card-grid">
        <div className="card" onClick={() => openModal("trivia")}>
          <span className="icon">🎮</span>
          <h3>Trivia</h3>
          <p>Test your knowledge in quick rounds.</p>
        </div>

        <div className="card" onClick={() => openModal("puzzle")}>
          <span className="icon">🧩</span>
          <h3>Puzzle</h3>
          <p>Relax and challenge your mind.</p>
        </div>
      </div>

      {/* External / Additional Games */}
      <div className="card-grid extra-cards mt-8">
        <div
          className="card"
          onClick={() =>
            window.open("https://www.nytimes.com/games/wordle/index.html", "_blank")
          }
        >
          <span className="icon">🏆</span>
          <h3>Wordle</h3>
          <p>Guess the word you are daily obligated hehe.</p>
        </div>

        <div
          className="card"
          onClick={() =>
            window.open(
              "https://docs.google.com/forms/d/e/1FAIpQLScEqgYX1gD8hl9kldzTUq5hQ_-L-sp2ME1q_6HV0hPK1GaPLA/viewform?usp=header",
              "_blank"
            )
          }
        >
          <span className="icon">📍</span>
          <h3>WE Need YOU</h3>
          <p>
            Are YOU a game developer? Do you wanna share your works with the world?
            Click here to learn more!
          </p>
        </div>

        <div
          className="card"
          onClick={() =>
            window.open("https://the-archivis7.github.io/CC_Space/", "_blank")
          }
        >
          <span className="icon">🚀</span>
          <h3>Space Game</h3>
          <p>Play the game, fight the aliens. -The_Corvid (yea I made this game)</p>
        </div>
      </div>

      {/* Game modal (renders selected game) */}
      {openGame && (
        <div className="game-modal modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="game-modal-content modal-content bg-white dark:bg-neutral-900 p-6 rounded-lg max-w-[90%] max-h-[90%] overflow-auto">
            <div className="flex justify-end mb-2">
              <button
                aria-label="Close game"
                className="px-3 py-1 bg-red-500 text-white rounded"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
            <div className="game-area">
              {openGame === "trivia" ? <TechJeopardyGame /> : <SlidingPuzzleGame />}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GamesTab;
