import React, { useEffect, useState } from "react";

const REMINDERS = [
  {
    title: "Q1 Testing - Thursday 1357 Schedule",
    date: "2025-10-09",
    time: "07:20",
  },
  {
    title: "Q1 Testing - Friday 246 Schedule",
    date: "2025-10-10",
    time: "07:20",
  },
];

function checkIfRemindersExist() {
  const existing = JSON.parse(localStorage.getItem("croomsConnectReminders") || "[]");
  return REMINDERS.every(rem =>
    existing.some(e => e.title === rem.title && e.timestamp === `${rem.date}T${rem.time}:00`)
  );
}

const addReminders = () => {
  let existing = JSON.parse(localStorage.getItem("croomsConnectReminders") || "[]");
  REMINDERS.forEach(rem => {
    existing.push({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      title: rem.title,
      timestamp: `${rem.date}T${rem.time}:00`,
    });
  });
  localStorage.setItem("croomsConnectReminders", JSON.stringify(existing));
};

export default function Events() {
  const [remindersExist, setRemindersExist] = useState(false);

  useEffect(() => {
    setRemindersExist(checkIfRemindersExist());
  }, []);

  const handleAddReminders = () => {
    if (remindersExist) {
      alert("Reminders already added!");
      return;
    }
    addReminders();
    alert("Reminders for Q1 Testing have been added!");
    setRemindersExist(true);
  };

  return (
    <div className="min-h-screen bg-[#1a1b2f] text-[#f8f9fa] pt-[65px] font-segoe-ui">
      <div className="header fixed top-0 left-0 w-full flex justify-between items-center p-2 px-4 bg-[#2b2d42] text-[#4cc9f0] shadow-lg z-50">
        <span className="font-bold text-lg">CROOMS CONNECT – Events</span>
        <span>ALPHA</span>
      </div>

      <section className="bg-[#2b2d42] rounded-[15px] p-8 mx-auto my-8 max-w-2xl shadow-lg border border-[rgba(248,249,250,0.1)]">
        <h2 className="text-[#ffd166] text-2xl mb-2">Q1 Testing Announcement</h2>
        <p>
          Q1 Testing begins on <strong>Thursday, October 9th</strong> with a <strong>1357 schedule</strong>. On <strong>Friday, October 10th</strong>, the school will follow a <strong>Wednesday 246 schedule</strong>.
        </p>
        <button
          className={`reminder-button bg-gradient-to-tr from-[#4cc9f0] to-[#2a8dff] text-[#1a1b2f] py-2 px-4 rounded-[10px] font-bold mt-4 shadow-lg transition-all ${
            remindersExist ? "opacity-70 cursor-not-allowed bg-gray-500 text-gray-300" : "hover:-translate-y-1 hover:shadow-xl"
          }`}
          disabled={remindersExist}
          onClick={handleAddReminders}
        >
          {remindersExist ? "✔ Reminders Added" : "➕ Add Reminder"}
        </button>
      </section>

      <button
        className="back-button bg-[#ef476f] text-[#1a1b2f] py-2 px-4 rounded-[10px] font-bold shadow-lg mx-auto mb-8 block transition-all hover:-translate-y-1 hover:shadow-xl"
        onClick={() => (window.location.href = "index.html")}
      >
        ← Back to Homepage
      </button>

      <style>{`
        @import url('https://fonts.googleapis.com/css?family=Segoe+UI:400,700&display=swap');
        .font-segoe-ui { font-family: "Segoe UI", Arial, sans-serif; }
        .header { box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
        section { box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
        .reminder-button { box-shadow: 0 4px 8px rgba(76, 201, 240, 0.4); }
        .reminder-button:not(:disabled):hover { box-shadow: 0 6px 12px rgba(76, 201, 240, 0.6); }
        .back-button { box-shadow: 0 4px 8px rgba(239, 71, 111, 0.4); }
        .back-button:hover { box-shadow: 0 6px 12px rgba(239, 71, 111, 0.6); }
      `}</style>
    </div>
  );
}