/**
 * index.js — Live animated stats on homepage & about page
 * Fetches public stats (no auth needed) for total feedbacks, courses, roles
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Always fetch public stats (no auth required)
  try {
    const stats = await apiFetch('/feedback/public-stats');
    animateCount('stat-total',   stats.total);
    animateCount('stat-courses', stats.courses);
    animateCount('stat-roles',   stats.roles);
  } catch {
    // server not running — leave placeholder zeros
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
