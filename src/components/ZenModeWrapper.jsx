import React, { useState, useEffect } from 'react';
import ZenMode from '../pages/ZenMode';
import Dashboard from '../pages/Dashboard';

const ZenModeWrapper = ({ session, onLogout }) => {
  const [isZenMode, setIsZenMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Listen for Ctrl + Shift + F
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* 1. The Zen Mode Overlay */}
      <ZenMode isActive={isZenMode} />

      {/* 2. The Dashboard Container (Removed the 'scale' transform so backgrounds behave normally) */}
      <div
        className={`transition-opacity duration-1000 ease-in-out ${
          isZenMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <Dashboard session={session} onLogout={onLogout} />
      </div>
    </>
  );
};

export default ZenModeWrapper;
