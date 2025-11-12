'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const navItems = [
    { href: "/home", label: "Home", id: "home" },
    { href: "/news", label: "News", id: "news" },
    { href: "/study", label: "Study Tools", id: "study" },
    { href: "/weather", label: "Weather", id: "weather" },
    { href: "/legal", label: "Legal", id: "legal" },
    { href: "/community", label: "Community", id: "community" },
    { href: "/polls", label: "Polls", id: "polls" },
    { href: "/games", label: "Games", id: "games" },
    { href: "/settings", label: "Settings", id: "settings" },
  ];

  return (
    <div className="geist variable-root">
      <header className="header">
        <div>
          <span className="title-text">CROOMS CONNECT</span>
          <span className="user-id-display" id="userIdDisplay">
            Local Theme Storage Active
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            alt="Profile"
            id="header-profile-picture"
            src="https://api.dicebear.com/6.x/thumbs/svg?seed=Anonymous"
            style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid var(--accent-blue)" }}
            title="View My Posts"
          />
        </div>
      </header>

      <div id="announcement-bar" style={{ display: "none" }} />

      <aside className="left-box">
        {navItems.map((n) => {
          const active = pathname?.startsWith(n.href) || (n.href === "/home" && pathname === "/");
          return (
            <Link key={n.id} href={n.href} className=""> 
              <button className={active ? "active" : ""} data-tab={n.id}>{n.label}</button>
            </Link>
          );
        })}
      </aside>

      <aside className="right-box">
        <div className="section" id="info-section">Loading current time and day type...</div>
        <div className="section" id="period-timer">Loading Period Timer...</div>
        <div className="section" id="current-lunch-display">Loading Lunch...</div>
        <div className="info">
          <p data-food="Boneless Wings">M – Boneless Wings</p>
          <p data-food="Orange Chicken">T – Orange Chicken</p>
          <p data-food="Baked Pasta">W – Baked Pasta</p>
          <p data-food="Burrito Bowl">T – Burrito Bowl</p>
          <p data-food="Nachos">F – Nachos</p>
        </div>
      </aside>

      <main>
        {children}
      </main>

      {isHomePage && (
        <footer className="footer">
          Crooms Connect &copy; 2025&nbsp;
          <Link href="/legal" style={{ color: "var(--accent-blue)" }}>Legal Disclaimer</Link>
        </footer>
      )}
    </div>
  );
}
