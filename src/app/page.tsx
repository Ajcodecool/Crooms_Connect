'use client';

import Link from "next/link";

export default function HomePage() {
  const links = [
    { href: "/home", label: "Home" },
    { href: "/news", label: "News" },
    { href: "/study", label: "Study Tools" },
    { href: "/weather", label: "Weather" },
    { href: "/legal", label: "Legal" },
    { href: "/community", label: "Community" },
    { href: "/polls", label: "Polls" },
    { href: "/games", label: "Games" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <>
      {/* Left-side navigation */}
      <div
        className="left-box"
        style={{
          position: "fixed",
          left: 0,
          top: "65px",
          width: "200px",
          height: "calc(100vh - 65px)",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          padding: "20px",
          background: "var(--content-bg)",
          borderRight: "1px solid var(--border-color)",
          overflowY: "auto",
        }}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="nav-button"
            style={{
              display: "block",
              padding: "10px",
              textAlign: "center",
              borderRadius: "5px",
              background: "var(--button-bg)",
              color: "var(--text-color)",
              textDecoration: "none",
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Main content placeholder */}
      <div
        style={{
          marginLeft: "200px",
          padding: "20px",
          marginTop: "65px",
        }}
      >
        <h1>Welcome to Crooms Connect</h1>
        <p>This is the site framework. Navigate using the menu on the left.</p>
      </div>
    </>
  );
}
