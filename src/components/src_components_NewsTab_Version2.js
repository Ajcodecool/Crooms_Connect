import React from "react";
const NewsTab = ({ onClose }) => (
  <section>
    <button className="close-tab-button" onClick={onClose}>×</button>
    <h1>News</h1>
    <p>Latest campus announcements and updates.</p>
    <div id="announcement-content">
      <h2>Current Announcement</h2>
      <p id="announcement-text">Loading announcement...</p>
      <p id="announcement-text">We are live! testing from new framework</p>
    </div>
    <div id="news-content">Loading news...</div>
  </section>
);
export default NewsTab;
