'use client';
import React, { useState, useEffect } from "react";

const GRID_SIZE = 3; // change to 4 for 4x4 puzzle

const generateGrid = () => {
  const arr = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i);
  return shuffle(arr);
};

const shuffle = (arr) => {
  let shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const isSolvable = (arr) => {
  const inversions = arr.filter(x => x !== 0).reduce((inv, val, i) => {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] && arr[j] < val) inv++;
    }
    return inv;
  }, 0);
  return inversions % 2 === 0;
};

const SlidingPuzzleGame = () => {
  const [tiles, setTiles] = useState([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(() => {
    let newGrid;
    do {
      newGrid = generateGrid();
    } while (!isSolvable(newGrid));
    setTiles(newGrid);
  }, []);

  const handleTileClick = (index) => {
    const emptyIndex = tiles.indexOf(0);
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const emptyRow = Math.floor(emptyIndex / GRID_SIZE);
    const emptyCol = emptyIndex % GRID_SIZE;

    const isAdjacent =
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (isAdjacent) {
      const newTiles = [...tiles];
      [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
      setTiles(newTiles);
      setMoves((m) => m + 1);
      checkWin(newTiles);
    }
  };

  const checkWin = (arr) => {
    const goal = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i);
    if (arr.every((v, i) => v === goal[i])) {
      setWon(true);
    }
  };

  const resetGame = () => {
    let newGrid;
    do {
      newGrid = generateGrid();
    } while (!isSolvable(newGrid));
    setTiles(newGrid);
    setMoves(0);
    setWon(false);
  };

  return (
    <div className="puzzle-container">
      <h1>🧩 Sliding Puzzle</h1>
      <h3>Moves: {moves}</h3>

      {won ? (
        <div className="puzzle-win">
          <h2>🎉 You solved it!</h2>
          <button onClick={resetGame}>Play Again</button>
        </div>
      ) : (
        <div
          className="puzzle-grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 80px)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 80px)`,
          }}
        >
          {tiles.map((val, i) => (
            <div
              key={i}
              className={`tile ${val === 0 ? "empty" : ""}`}
              onClick={() => handleTileClick(i)}
            >
              {val !== 0 && val}
            </div>
          ))}
        </div>
      )}

      {!won && <button onClick={resetGame}>🔄 Shuffle</button>}
    </div>
  );
};

export default SlidingPuzzleGame;
