import React from "react";

const SettingsTab = () => (
  <section>
    <button className="close-tab-button">×</button>
    <h1>User Settings &amp; Customization</h1>
    <p>Personalize your experience. Your selections are saved locally.</p>
    <div className="card-grid">
      <div className="card theme-selector-card">
        <span className="icon"> 🌓 </span>
        <h3>Appearance</h3>
        <p style={{ marginBottom: 20, fontSize: 14 }}>
          Toggle between Dark and Light mode.
        </p>
        <div className="flex flex-col space-y-4">
          <button className="theme-button" id="dark-mode-button">
            <span className="icon"> 🌙 </span> Dark Mode
          </button>
          <button className="theme-button" id="light-mode-button">
            <span className="icon"> ☀️ </span> Light Mode
          </button>
        </div>
        <div
          className="p-3 mt-4 text-center rounded-lg font-medium hidden"
          id="messageBox"
          style={{
            backgroundColor: "var(--primary-bg)",
            color: "var(--text-color)",
          }}
        ></div>
      </div>
      <div className="card period-names-card">
        <span className="icon"> 📚 </span>
        <h3>Period Names</h3>
        <form className="settings-form" id="period-names-form">
          <button className="save-settings-button" type="submit">
            Save Period Names
          </button>
        </form>
        <div
          className="p-3 mt-4 text-center rounded-lg font-medium hidden"
          id="periodMessage"
          style={{
            backgroundColor: "var(--primary-bg)",
            color: "var(--text-color)",
          }}
        ></div>
      </div>
      {/* More settings cards ... */}
    </div>
  </section>
);

export default SettingsTab;