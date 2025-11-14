import React from "react";
import Connect from "./Connect";

export default function CommunityTab() {
  /**
   * Handler for messages sent from the Connect component.
   * JSDoc used to help the type-checker when workspace checks JS/TS.
   * @param {any} message
   */
  function handleSend(message) {
    console.log("Message sent from Connect component:", message);
    // You could extend this to send the message to a backend:
    // fetch("/api/messages", { method: "POST", body: JSON.stringify(message) });
  }

  return (
    <section style={{ padding: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Community</h1>
          <p style={{ margin: 0 }}>Connect with classmates and teachers.</p>
        </div>
      </div>

      {/* The chat interface */}
      <Connect onSend={handleSend} />
    </section>
  );
}
