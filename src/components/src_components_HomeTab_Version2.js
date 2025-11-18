import React from "react";
const HomeTab = ({ onClose }) => (
  <section>
    <button className="close-tab-button" onClick={onClose}>×</button>
    <h1>Welcome to Crooms Connect</h1>
    <p>Your student hub with resources, schedules, and tools.</p>
    <div id="welcome-message">
      <h3>Latest Announcement</h3>
      <p id="home-announcement-text">Loading announcement...</p>
    </div>
    <div className="card-grid">
      <div className="card" id="events-card">
        <span className="icon" role="img" aria-label="events">📅</span>
        <h3>Events</h3>
        <p>See what’s happening this week.</p>
      </div>
    </div>
  </section>
);
export default HomeTab;