const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

let globalAnnouncement = ""; // Store the current announcement

// Endpoint to get the current announcement
app.get('/announcement', (req, res) => {
  res.json({ announcement: globalAnnouncement });
});

// Endpoint to update the announcement (admin use)
app.post('/announcement', (req, res) => {
  const { announcement } = req.body;
  if (!announcement) {
    return res.status(400).json({ error: "Announcement cannot be empty" });
  }
  globalAnnouncement = announcement;
  res.json({ message: "Announcement updated successfully!" });
});

// Endpoint to get a welcome message with logging
app.get('/welcome', (req, res) => {
  console.log(`${req.method} ${req.path}`);
  res.json({ message: "Welcome to the API!" });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
