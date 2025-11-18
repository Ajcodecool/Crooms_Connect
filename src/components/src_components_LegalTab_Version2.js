import React from "react";
const LegalTab = () => (
  <section>
    <button className="close-tab-button">×</button>
    <h1>Legal Disclaimer <span style={{ fontSize: 14 }}> (Last Updated: November 6th, 2025)</span></h1>
    <div className="disclaimer-point">
      <p>Effective Date: 11/6/2025</p>
      {/* Add other legal content here */}
      <h2>General Information &amp; Accuracy</h2>
      {/* ...rest of disclaimer content */}
    </div>
  </section>
);
export default LegalTab;