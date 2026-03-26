require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const feedbackRoutes  = require('./routes/feedback');
const analyticsRoutes = require('./routes/analytics');
const authRoutes      = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static HTML/CSS/JS files from project root
app.use(express.static(path.join(__dirname)));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/feedback',  feedbackRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);  // Protected

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Catch-all → index.html ───────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Student Feedback Analyzer running at http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop\n`);
});
