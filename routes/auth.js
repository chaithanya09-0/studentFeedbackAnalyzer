/**
 * routes/auth.js — Login & token verification routes
 */
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

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

module.exports = router;
