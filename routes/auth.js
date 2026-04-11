/**
 * routes/auth.js — Login & token verification routes
 */
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// ─── POST /api/auth/login ── Authenticate user ────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user by email
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Parse courses — MySQL JSON columns return already-parsed arrays
    let courses = [];
    if (user.courses) {
      if (Array.isArray(user.courses)) {
        courses = user.courses;
      } else if (typeof user.courses === 'string') {
        try { courses = JSON.parse(user.courses); } catch { courses = []; }
      }
    }

    // Generate JWT
    const tokenPayload = {
      id:      user.id,
      name:    user.name,
      email:   user.email,
      role:    user.role,
      courses: courses
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      token,
      user: {
        id:      user.id,
        name:    user.name,
        email:   user.email,
        role:    user.role,
        courses: courses
      }
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── GET /api/auth/me ── Get current user from token ──────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id:      req.user.id,
      name:    req.user.name,
      email:   req.user.email,
      role:    req.user.role,
      courses: req.user.courses
    }
  });
});

// ─── GET /api/auth/feedback-password ── Admin: get current feedback password ──
router.get('/feedback-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT setting_value FROM settings WHERE setting_key = 'feedback_password'"
    );
    const password = rows.length > 0 ? rows[0].setting_value : '';
    res.json({ success: true, password });
  } catch (err) {
    console.error('GET /api/auth/feedback-password error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── PUT /api/auth/feedback-password ── Admin: update feedback password ───────
router.put('/feedback-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (password === undefined || password === null) {
      return res.status(400).json({ error: 'Password is required.' });
    }
    await db.execute(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('feedback_password', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [password.trim(), password.trim()]
    );
    res.json({ success: true, message: 'Feedback password updated successfully.' });
  } catch (err) {
    console.error('PUT /api/auth/feedback-password error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

