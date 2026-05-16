import { useState, useCallback } from 'react';

const useHistory = <T>(
  initialState: T,
): [
  state: T,
  setState: (newState: T) => void,
  undo: () => void,
  redo: () => void,
  changed: boolean,
  notLatest: boolean,
] => {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([initialState]);

  const setState = useCallback(
    (newState: T) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, index + 1);
        return [...newHistory, newState];
      });
      setIndex((prev) => prev + 1);
    },
    [index],
  );

  const undo = useCallback(() => {
    setIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const redo = useCallback(() => {
    setIndex((prev) => (prev < history.length - 1 ? prev + 1 : prev));
  }, [history.length]);

  return [
    history[index],
    setState,
    undo,
    redo,
    index > 0,
    index < history.length - 1,
  ];
};

export default useHistory;
