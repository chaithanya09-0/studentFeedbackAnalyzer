const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { analyzeSentiment, analyzeSentimentSync } = require('../sentiment');
const { requireAuth } = require('../middleware/auth');

// ─── POST /api/feedback ── Submit new feedback (NO auth required) ─────────────
router.post('/', async (req, res) => {
  try {
    const {
      course, instructor, feedback,
      q1, q2, q3, q4, q5, q6, q7, q8, q9, q10
    } = req.body;
    const category = req.body.category || 'general';

    // Validate required fields
    if (!course || !feedback) {
      return res.status(400).json({ error: 'Please fill in all required fields (Course, Feedback).' });
    }

    // Parse and validate all 10 question ratings
    const questions = [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10].map(v => parseInt(v));
    const allValid  = questions.every(v => v >= 1 && v <= 5);
    if (!allValid) {
      return res.status(400).json({ error: 'Please rate all 10 questions (1-5).' });
    }

    // Overall rating = average of q1–q10 (rounded)
    const ratingNum   = Math.round(questions.reduce((a, b) => a + b, 0) / questions.length);
    const isAnonymous = 1; // Always anonymous

    // Run sentiment analysis
    const sentimentResult = await analyzeSentiment(feedback, ratingNum);

    const [result] = await db.execute(
      `INSERT INTO feedbacks
         (student_name, student_id, course, instructor, category, rating,
          feedback_text, is_anonymous,
          q1, q2, q3, q4, q5, q6, q7, q8, q9, q10,
          sentiment, sentiment_score, sentiment_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Anonymous', 'N/A', course, instructor || 'Not Specified', category,
        ratingNum, feedback, isAnonymous,
        ...questions,
        sentimentResult.sentiment, sentimentResult.score, sentimentResult.source
      ]
    );

    res.status(201).json({
      success:  true,
      id:       result.insertId,
      sentiment: sentimentResult.sentiment,
      score:     sentimentResult.score,
      source:    sentimentResult.source,
      message:  'Feedback submitted successfully!'
    });
  } catch (err) {
    console.error('POST /api/feedback error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── GET /api/feedback/preview ── Quick rule-based preview (NO auth) ─────────
router.get('/preview', (req, res) => {
  const { text, rating } = req.query;
  if (!text) return res.status(400).json({ error: 'text query param required' });
  const result = analyzeSentimentSync(text, parseInt(rating) || 3);
  res.json(result);
});

// ─── GET /api/feedback ── List feedbacks (REQUIRES auth, filtered by role) ────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { course, instructor, days, limit = 20, offset = 0 } = req.query;
    const user = req.user;

    let sql    = 'SELECT * FROM feedbacks WHERE 1=1';
    const params = [];

    // Teacher role: restrict to their courses only
    if (user.role === 'teacher' && user.courses && user.courses.length > 0) {
      const placeholders = user.courses.map(() => '?').join(',');
      sql += ` AND course IN (${placeholders})`;
      params.push(...user.courses);
    }

    if (course && course !== 'all') {
      sql += ' AND course = ?';
      params.push(course);
    }
    if (instructor && instructor !== 'all') {
      sql += ' AND instructor = ?';
      params.push(instructor);
    }
    if (days && !isNaN(parseInt(days))) {
      sql += ' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(parseInt(days));
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/feedback error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/feedback/:id ── Single feedback entry (REQUIRES auth) ──────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM feedbacks WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found.' });

    // Teachers can only see feedback for their courses
    const item = rows[0];
    if (req.user.role === 'teacher' && !req.user.courses.includes(item.course)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('GET /api/feedback/:id error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
