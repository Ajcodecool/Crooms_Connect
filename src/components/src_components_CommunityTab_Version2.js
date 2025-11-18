import React from "react";

/**
 * CommunityTab component displaying clubs and forum sections.
 * @param {Object} props - The component props.
 * @param {Function} props.onClose - Function to close the tab.
 */
export default function CommunityTab({ onClose }) {
  // Sample data for clubs
  const clubs = [
    { name: "Science Club", description: "Explore science experiments and discussions." },
    { name: "Art Club", description: "Express creativity through various art forms." },
    { name: "Sports Club", description: "Stay active with team sports and activities." },
  ];

  // Sample data for forum posts
  const forumPosts = [
    { title: "Welcome to the Forum!", author: "Admin", replies: 5 },
    { title: "Homework Help Thread", author: "Student1", replies: 12 },
    { title: "Event Announcements", author: "Teacher", replies: 3 },
  ];

  return (
    <section style={{ padding: 12 }}>
      <button className="close-tab-button" onClick={onClose}>×</button>
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

      {/* Clubs Section */}
      <div style={{ marginBottom: 24 }}>
        <h2>Clubs</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {clubs.map((club, index) => (
            <div key={index} style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8 }}>
              <h3>{club.name}</h3>
              <p>{club.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Forum Section */}
      <div>
        <h2>Forum</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {forumPosts.map((post, index) => (
            <div key={index} style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8 }}>
              <h3>{post.title}</h3>
              <p>By {post.author} • {post.replies} replies</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
