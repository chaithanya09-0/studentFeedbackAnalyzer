/**
 * Dual Sentiment Analysis Engine
 * 1. Rule-based: keyword matching + rating weighting (always available)
 * 2. ML via HuggingFace Inference API (distilbert-sst-2) — used when token is set
 */
const fetch = require('node-fetch');

// ─── Keyword Dictionaries ────────────────────────────────────────────────────
const POSITIVE_WORDS = [
  'excellent','amazing','outstanding','brilliant','fantastic','great','good',
  'wonderful','superb','love','loved','enjoyed','helpful','clear','engaging',
  'informative','fun','easy','intuitive','efficient','professional','knowledgeable',
  'supportive','inspiring','motivating','recommend','best','perfect','awesome',
  'impressive','thorough','well structured','well-structured','learned','useful',
  'rewarding','challenging','interesting','passionate','dedicated','talented'
];

const NEGATIVE_WORDS = [
  'terrible','awful','horrible','bad','poor','worst','boring','confusing',
  'unclear','useless','waste','difficult','hard','frustrating','disappointed',
  'disappointing','slow','late','rude','unprofessional','unprepared','vague',
  'disorganized','irrelevant','outdated','never answered','ignored','failed',
  'missed','absent','lazy','pathetic','dreadful','unacceptable'
];

const NEGATION_WORDS = ['not','no','never','hardly','barely','rarely','doesn\'t','don\'t','wasn\'t','weren\'t','isn\'t'];

// ─── Rule-Based Engine ───────────────────────────────────────────────────────
function analyzeRuleBased(text, rating = 3) {
  const lower = text.toLowerCase();

  // Count keyword hits
  let posCount = 0;
  let negCount = 0;
  POSITIVE_WORDS.forEach(pw => { if (lower.includes(pw)) posCount++; });
  NEGATIVE_WORDS.forEach(nw => { if (lower.includes(nw)) negCount++; });

  // Rating contributes to score (1-5 → -1 to +1 normalized)
  const ratingScore = (rating - 3) / 2; // -1 to +1

  // Text score: (pos - neg) / max(pos + neg, 1) → -1 to +1
  const textScore = (posCount - negCount) / Math.max(posCount + negCount, 1);

  // Combined (60% text, 40% rating)
  const combined = (textScore * 0.6) + (ratingScore * 0.4);

  let sentiment, confidence;
  if (combined > 0.15) {
    sentiment  = 'positive';
    confidence = Math.min(0.5 + combined * 0.5, 0.99);
  } else if (combined < -0.15) {
    sentiment  = 'negative';
    confidence = Math.min(0.5 + Math.abs(combined) * 0.5, 0.99);
  } else {
    sentiment  = 'neutral';
    confidence = 0.5 + (0.15 - Math.abs(combined));
  }

  return { sentiment, score: parseFloat(confidence.toFixed(2)), source: 'rule' };
}

// ─── HuggingFace ML Engine ───────────────────────────────────────────────────
async function analyzeML(text) {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) return null; // fallback to rule-based

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english',
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify({ inputs: text.slice(0, 512) }),
        timeout: 5000
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    // HuggingFace returns: [[{label:'POSITIVE',score:0.99},{label:'NEGATIVE',score:0.01}]]
    if (!Array.isArray(data) || !data[0]) return null;

    const results = data[0];
    const best    = results.reduce((a, b) => a.score > b.score ? a : b);
    const label   = best.label.toLowerCase(); // 'positive' or 'negative'
    const score   = parseFloat(best.score.toFixed(2));

    // Map to our 3-class system: score > 0.75 → positive/negative, else neutral
    let sentiment;
    if (score >= 0.75) {
      sentiment = label === 'positive' ? 'positive' : 'negative';
    } else {
      sentiment = 'neutral';
    }

    return { sentiment, score, source: 'ml' };
  } catch (err) {
    console.warn('HuggingFace API error (falling back to rule-based):', err.message);
    return null;
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────
async function analyzeSentiment(text, rating = 3) {
  // Try ML first; fall back to rule-based
  const mlResult = await analyzeML(text);
  if (mlResult) return mlResult;
  return analyzeRuleBased(text, rating);
}

// Synchronous rule-based only (for live frontend preview via API)
function analyzeSentimentSync(text, rating = 3) {
  return analyzeRuleBased(text, rating);
}

module.exports = { analyzeSentiment, analyzeSentimentSync };
