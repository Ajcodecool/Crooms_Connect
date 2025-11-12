import React from "react";
const PollsTab = () => (
  <section>
    <button className="close-tab-button">×</button>
    <h1>Community Daily Poll</h1>
    <p>Vote on important topics.</p>
    <div id="polls-container"></div>
    <p id="no-polls">Loading polls...</p>
  </section>
);
export default PollsTab;