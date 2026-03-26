/**
 * index.js — Live animated stats on homepage
 * Note: /analytics/summary requires auth, so stats only animate when logged in
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Only fetch stats if user is logged in (analytics endpoint requires auth)
  if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return;

  try {
    const res  = await apiFetch('/analytics/summary');
    const data = res.data;

    animateCount('stat-total',    data.total);
    animateCount('stat-positive', data.positive_pct, '%');
    animateCount('stat-courses',  data.courses_count);
    animateCount('stat-rating',   Math.round((data.avg_rating / 5) * 100), '%');
  } catch {
    // server not running or auth error — leave placeholder zeros
  }
});

function animateCount(id, target, suffix = '') {
  const el = document.getElementById(id);
  if (!el || !target) return;
  let current  = 0;
  const step   = Math.max(1, Math.round(target / 60));
  const timer  = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current + suffix;
  }, 20);
}
