const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const ANNOUNCEMENTS_FILE = path.join(__dirname, 'announcements.json');

// Helper to load announcements from file
const loadAnnouncements = () => {
  try {
    if (fs.existsSync(ANNOUNCEMENTS_FILE)) {
      const data = fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading announcements:', err);
  }
  return [];
};

// Helper to save announcements to file
const saveAnnouncements = (announcements) => {
  try {
    fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(announcements, null, 2));
  } catch (err) {
    console.error('Error saving announcements:', err);
  }
};

// Endpoint to get the latest announcement (for main site)
app.get('/announcement', (req, res) => {
  const announcements = loadAnnouncements();
  const latest = announcements.length > 0 ? announcements[announcements.length - 1] : null;
  const announcementText = latest ? `${latest.title}: ${latest.content}` : 'No current announcement.';
  res.json({ announcement: announcementText });
});

// Endpoint to get all announcements (for admin panel)
app.get('/announcements', (req, res) => {
  const announcements = loadAnnouncements();
  res.json(announcements);
});

// Endpoint to post a new announcement (admin use)
app.post('/announcement', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }
  const announcements = loadAnnouncements();
  const newAnnouncement = {
    id: Date.now(),
    title,
    content,
    timestamp: new Date().toISOString()
  };
  announcements.push(newAnnouncement);
  saveAnnouncements(announcements);
  res.json({ message: "Announcement posted successfully!", announcement: newAnnouncement });
});

// Endpoint to get a welcome message with logging
app.get('/welcome', (req, res) => {
  console.log(`${req.method} ${req.path}`);
  res.json({ message: "Welcome to the API!" });
});

// New endpoint to greet with enhanced logging
app.get('/greet', (req, res) => {
  console.log(`Request received: ${req.method} ${req.path}`);
  res.json({ message: "Welcome to the Express API Service!" });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
