const express = require('express');
const router  = express.Router();
const db      = require('../db');

/**
 * Helper: build WHERE clause for teacher course filtering
 */
function courseFilter(user) {
  if (user.role === 'admin') return { clause: '', params: [] };
  if (user.courses && user.courses.length > 0) {
    const placeholders = user.courses.map(() => '?').join(',');
    return { clause: ` AND course IN (${placeholders})`, params: [...user.courses] };
  }
  return { clause: ' AND 1=0', params: [] }; // teacher with no courses sees nothing
}

// ─── GET /api/analytics/summary ── Overall totals + sentiment breakdown ────────
router.get('/summary', async (req, res) => {
  try {
    const cf = courseFilter(req.user);
    const [rows] = await db.query(`
      SELECT
        COUNT(*)                                              AS total,
        SUM(sentiment = 'positive')                          AS positive,
        SUM(sentiment = 'neutral')                           AS neutral,
        SUM(sentiment = 'negative')                          AS negative,
        ROUND(AVG(rating), 2)                                AS avg_rating,
        COUNT(DISTINCT course)                               AS courses_count
      FROM feedbacks
      WHERE 1=1 ${cf.clause}
    `, cf.params);

    const totals   = rows[0];
    const total    = totals.total    || 0;
    const positive = totals.positive || 0;
    const neutral  = totals.neutral  || 0;
    const negative = totals.negative || 0;

    res.json({
      success: true,
      data: {
        total,
        positive,
        neutral,
        negative,
        avg_rating:     totals.avg_rating    || 0,
        courses_count:  totals.courses_count || 0,
        positive_pct:   total ? Math.round((positive / total) * 100) : 0,
        neutral_pct:    total ? Math.round((neutral  / total) * 100) : 0,
        negative_pct:   total ? Math.round((negative / total) * 100) : 0
      }
    });
  } catch (err) {
    console.error('GET /api/analytics/summary error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/analytics/by-course ── Per-course stats ────────────────────────
router.get('/by-course', async (req, res) => {
  try {
    const cf = courseFilter(req.user);
    const [rows] = await db.query(`
      SELECT
        course,
        COUNT(*)                         AS total,
        SUM(sentiment = 'positive')      AS positive,
        SUM(sentiment = 'neutral')       AS neutral,
        SUM(sentiment = 'negative')      AS negative,
        ROUND(AVG(rating), 2)            AS avg_rating
      FROM feedbacks
      WHERE 1=1 ${cf.clause}
      GROUP BY course
      ORDER BY total DESC
    `, cf.params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/analytics/by-course error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/analytics/by-category ── Per-category avg rating ───────────────
router.get('/by-category', async (req, res) => {
  try {
    const cf = courseFilter(req.user);
    const [rows] = await db.query(`
      SELECT
        category,
        COUNT(*)                         AS total,
        ROUND(AVG(rating), 2)            AS avg_rating,
        SUM(sentiment = 'positive')      AS positive,
        SUM(sentiment = 'negative')      AS negative
      FROM feedbacks
      WHERE 1=1 ${cf.clause}
      GROUP BY category
      ORDER BY total DESC
    `, cf.params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/analytics/by-category error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/analytics/trends ── Monthly sentiment counts ───────────────────
router.get('/trends', async (req, res) => {
  try {
    const cf = courseFilter(req.user);
    const [rows] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m')   AS month,
        DATE_FORMAT(created_at, '%b %Y')   AS label,
        COUNT(*)                           AS total,
        SUM(sentiment = 'positive')        AS positive,
        SUM(sentiment = 'neutral')         AS neutral,
        SUM(sentiment = 'negative')        AS negative
      FROM feedbacks
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) ${cf.clause}
      GROUP BY month, label
      ORDER BY month ASC
    `, cf.params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/analytics/trends error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
