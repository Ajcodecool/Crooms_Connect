import React, { useState, useEffect } from "react";

// Example stub components for tabs
const HomeTab = () => (
  <section>
    <CloseTabButton />
    <h1>Welcome to Crooms Connect</h1>
    <p>Your student hub with resources, schedules, and tools.</p>
    <div id="welcome-message" style={{ background: "var(--card-bg-subtle)", border: "1px solid var(--border-color)", borderRadius: "var(--radius)", padding: 15, marginTop: 20, fontWeight: "bold", color: "var(--accent-blue)" }}>
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

// ... Stub other tab components similarly

const CloseTabButton = () => (
  <button className="close-tab-button" style={{
    position: "absolute",
    top: 15,
    right: 15,
    background: "none",
    border: "none",
    color: "var(--text-color)",
    fontSize: 24,
    cursor: "pointer",
    lineHeight: 1,
    padding: 5,
    opacity: 0.7,
    transition: "opacity 0.2s, color 0.2s",
    zIndex: 2
  }}>×</button>
);

const TAB_CONFIG = [
  { key: 'home', label: 'Home', component: HomeTab },
  { key: 'news', label: 'News', component: () => <div>News Tab Content</div> },
  { key: 'study', label: 'Study Tools', component: () => <div>Study Tab Content</div> },
  { key: 'weather', label: 'Weather', component: () => <div>Weather Tab Content</div> },
  { key: 'legal', label: 'Legal', component: () => <div>Legal Tab Content</div> },
  { key: 'community', label: 'Community', component: () => <div>Community Tab Content</div> },
  { key: 'polls', label: 'Polls', component: () => <div>Polls Tab Content</div> },
  { key: 'games', label: 'Games', component: () => <div>Games Tab Content</div> },
  { key: 'settings', label: 'Settings', component: () => <div>Settings Tab Content</div> },
];

function App() {
  const [activeTab, setActiveTab] = useState("home");

  // Example: useEffect for announcements if needed
  // useEffect(() => {
  //   fetch('/announcement').then(...);
  // }, []);

  return (
    <div id="app-body">
      {/* Header */}
      <div className="header" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 15px",
        background: "var(--primary-bg)",
        position: "fixed",
        top: 0, left: 0, width: "100%", zIndex: 100
      }}>
        <div className="flex items-center">
          <span className="title-text" style={{
            fontWeight: "bold",
            fontSize: "clamp(16px, 4vw, 20px)",
            color: "var(--accent-blue)"
          }}>CROOMS CONNECT</span>
          <span className="user-id-display" id="userIdDisplay" style={{
            fontSize: 10,
            color: "var(--text-color)",
            opacity: 0.6,
            paddingLeft: 10,
            maxWidth: "40%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            Local Theme Storage Active
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <img alt="Profile"
            id="header-profile-picture"
            src="https://api.dicebear.com/6.x/thumbs/svg?seed=Anonymous"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              cursor: "pointer",
              objectFit: "cover"
            }} />
          {/* Simulate Sign in/out scheduling by authentication state */}
          <a
            href="auth41.html"
            id="header-signin-button"
            style={{
              backgroundColor: "var(--accent-blue)",
              padding: "10px 20px",
              color: "white",
              borderRadius: "8px",
              textDecoration: "none",
              transition: "background 0.3s"
            }}>
            SIGN IN
          </a>
          <button id="logout-btn" style={{
            display: "none",
            padding: "10px 20px",
            backgroundColor: "#e74c3c",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}>
            Logout
          </button>
        </div>
      </div>

      {/* Announcement Bar */}
      <div id="announcement-bar"
        style={{
          backgroundColor: "#ffcc00",
          color: "#000",
          padding: 10,
          textAlign: "center",
          fontWeight: "bold",
          display: "none"
        }}>
      </div>

      {/* Left Navigation */}
      <div className="left-box" style={{
        position: "fixed",
        left: 0,
        top: 65,
        width: 200,
        height: "calc(100vh - 65px)",
        display: "flex",
        flexDirection: "column",
        gap: 15,
        padding: 20,
        background: "var(--content-bg)",
        borderRight: "1px solid var(--border-color)",
        overflowY: "auto"
      }}>
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? "active" : ""}
            style={{
              background: "var(--content-bg)",
              color: "var(--text-color)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius)",
              padding: "12px 20px",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 8,
              ...(activeTab === tab.key
                ? {
                  background: "linear-gradient(45deg, var(--accent-blue), #2a8dff)",
                  color: "var(--primary-bg)",
                  boxShadow: "0 4px 10px rgba(76, 201, 240, 0.6)"
                }
                : {})
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right Info/Timer Panel */}
      <div className="right-box" style={{
        position: "fixed",
        right: 0,
        top: 65,
        width: 280,
        height: "calc(100vh - 65px)",
        display: "flex",
        flexDirection: "column",
        gap: 15,
        padding: 20,
        background: "var(--content-bg)",
        borderLeft: "1px solid var(--border-color)",
        overflowY: "auto"
      }}>
        <div className="section" id="info-section" style={{
          color: "var(--accent-yellow)",
          fontWeight: "bold"
        }}>
          Loading current time and day type...
        </div>
        {/* ...add other sections similarly */}
      </div>

      {/* Main Tab Content */}
      <div style={{
        margin: "0 auto",
        maxWidth: 900,
        paddingTop: 85
      }}>
        {TAB_CONFIG.map(tab =>
          <div
            key={tab.key}
            style={{
              display: activeTab === tab.key ? "block" : "none",
              animation: "fadeInUp 0.7s ease"
            }}>
            <tab.component />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: "center",
        padding: 20,
        background: "var(--primary-bg)",
        marginTop: 40,
        color: "var(--text-color)",
        fontSize: 14,
        transition: "background-color 0.3s, color 0.3s"
      }}>
        Crooms Connect &copy; 2025{ " " }
        <a href="#" style={{ color: "var(--accent-blue)" }}>Legal Disclaimer</a>
      </footer>
    </div>
  );
}

export default App;