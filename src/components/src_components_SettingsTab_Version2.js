import React from "react";
const SettingsTab = () => (
  <section>
    <button className="close-tab-button">×</button>
    <h1>User Settings &amp; Customization</h1>
    <p>Personalize your experience. Your selections are saved locally.</p>
    <div className="card-grid">
      <div className="card theme-selector-card">
        <span className="icon">🌓</span>
        <h3>Appearance</h3>
        <p>Toggle between Dark and Light mode.</p>
        <div>
          <button className="theme-button" id="dark-mode-button"><span className="icon">🌙</span> Dark Mode</button>
          <button className="theme-button" id="light-mode-button"><span className="icon">☀️</span> Light Mode</button>
        </div>
      </div>
      {/* ...other settings cards from your index.html */}
    </div>
  </section>
);
export default SettingsTab;