import React from "react";
import { useTheme } from "./ClientLayout";

const Header = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className="header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        background: "var(--primary-bg)",
        borderBottom: "1px solid var(--border-color)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "65px",
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "var(--accent-blue)",
        }}
      >
        Crooms Connect
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          className={`theme-button ${theme === 'dark' ? 'active' : ''}`}
          onClick={theme === 'dark' ? undefined : toggleTheme}
          style={{
            padding: "8px 16px",
            borderRadius: "5px",
            background: theme === 'dark' ? "var(--accent-blue)" : "var(--content-bg)",
            color: theme === 'dark' ? "var(--primary-bg)" : "var(--text-color)",
            border: "1px solid var(--border-color)",
            cursor: theme === 'dark' ? "default" : "pointer",
          }}
        >
          🌙 Dark
        </button>
        <button
          className={`theme-button ${theme === 'light' ? 'active' : ''}`}
          onClick={theme === 'light' ? undefined : toggleTheme}
          style={{
            padding: "8px 16px",
            borderRadius: "5px",
            background: theme === 'light' ? "var(--accent-blue)" : "var(--content-bg)",
            color: theme === 'light' ? "var(--primary-bg)" : "var(--text-color)",
            border: "1px solid var(--border-color)",
            cursor: theme === 'light' ? "default" : "pointer",
          }}
        >
          ☀️ Light
        </button>
      </div>
    </div>
  );
};

export default Header;
