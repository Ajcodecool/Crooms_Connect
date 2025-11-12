import React, { useState } from "react";
import GamesTab from "./components/GamesTab";
import SettingsTab from "./components/SettingsTab";
// import other tabs...

const TABS = {
  games: <GamesTab />,
  settings: <SettingsTab />,
  // ...other tabs
};

function App() {
  const [activeTab, setActiveTab] = useState("games");
  return (
    <div>
      <aside>
        <button onClick={() => setActiveTab("games")}>Games</button>
        <button onClick={() => setActiveTab("settings")}>Settings</button>
        {/* ...other buttons */}
      </aside>
      <main>{TABS[activeTab]}</main>
    </div>
  );
}

export default App;