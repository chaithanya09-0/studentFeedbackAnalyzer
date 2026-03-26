/**
 * dashboard.js — Loads live data and populates the dashboard (Editorial cream theme)
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireLogin()) return;

  const user = getUser();
  const subtitle = document.getElementById('dashboardSubtitle');
  if (subtitle && user) {
    subtitle.textContent = user.role === 'admin'
      ? 'Admin view — showing all courses'
      : `Showing feedback for your courses: ${(user.courses || []).join(', ').toUpperCase()}`;
  }

  loadDashboard();
  document.getElementById('courseFilter')?.addEventListener('change', loadDashboard);
  document.getElementById('dayFilter')?.addEventListener('change', loadDashboard);
});

async function loadDashboard() {
  const course = document.getElementById('courseFilter')?.value || 'all';
  const days   = document.getElementById('dayFilter')?.value   || '';
  try {
    await Promise.all([loadSummary(), loadRecentFeedback(course, days), loadCategoryBreakdown(), loadCourseTable()]);
  } catch (err) {
    console.error('Dashboard load error:', err);
    showError('Could not connect to server. Is node server.js running?');
  }
}

async function loadSummary() {
  const res = await apiFetch('/analytics/summary');
  const d   = res.data;
  setEl('posCount', d.positive); setEl('neuCount', d.neutral); setEl('negCount', d.negative);
  setEl('posPct', d.positive_pct + '%'); setEl('neuPct', d.neutral_pct + '%'); setEl('negPct', d.negative_pct + '%');
  setEl('totalCount', d.total);
  setEl('avgRating', d.avg_rating ? d.avg_rating + ' ★' : '—');
  setEl('coursesCount', d.courses_count || '—');
}

async function loadRecentFeedback(course, days) {
  const params = new URLSearchParams({ limit: 8 });
  if (course && course !== 'all') params.set('course', course);
  if (days) params.set('days', days);

  const res  = await apiFetch(`/feedback?${params}`);
  const list = document.getElementById('feedbackList');
  if (!list) return;

  if (!res.data.length) {
    list.innerHTML = '<p class="text-center text-charcoal/30 py-8">No feedback found.</p>';
    return;
  }

  list.innerHTML = res.data.map(item => {
    const badge = {
      positive: { cls: 'text-emerald-700 border-emerald-300 bg-emerald-50', icon: '😊' },
      neutral:  { cls: 'text-amber-700 border-amber-300 bg-amber-50',       icon: '😐' },
      negative: { cls: 'text-red-700 border-red-300 bg-red-50',              icon: '😞' }
    }[item.sentiment] || { cls: 'text-charcoal/60 border-charcoal/15 bg-cream-dark', icon: '🤖' };

    const date  = new Date(item.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    const text  = item.feedback_text.length > 120 ? item.feedback_text.slice(0, 120) + '…' : item.feedback_text;
    const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);

    return `
      <div class="p-4 border border-charcoal/8 hover:border-charcoal/15 transition-colors bg-white/60">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-charcoal text-sm">Anonymous</span>
            <span class="text-xs text-charcoal/35">${item.course.toUpperCase()}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-amber-500 text-xs">${stars}</span>
            <span class="px-2.5 py-0.5 border text-xs font-medium ${badge.cls}">${badge.icon} ${item.sentiment}</span>
          </div>
        </div>
        <p class="text-charcoal/65 text-sm italic">"${text}"</p>
        <p class="text-charcoal/30 text-xs mt-2">${item.category} · ${date}</p>
      </div>`;
  }).join('');
}

async function loadCategoryBreakdown() {
  const res    = await apiFetch('/analytics/by-category');
  const cats   = res.data;
  const maxVal = Math.max(...cats.map(c => c.total), 1);
  const el     = document.getElementById('categoryList');
  if (!el) return;

  if (!cats.length) {
    el.innerHTML = '<p class="text-center text-charcoal/30 py-8 text-sm">No category data yet.</p>';
    return;
  }

  const labels = { teaching:'Teaching Quality', content:'Course Content', materials:'Learning Materials', assessment:'Assessment', support:'Student Support', facilities:'Facilities', other:'Other' };

  el.innerHTML = cats.map(c => {
    const pct = Math.round((c.total / maxVal) * 100);
    return `
      <div class="space-y-1.5">
        <div class="flex justify-between text-sm">
          <span class="text-charcoal/75">${labels[c.category] || c.category}</span>
          <span class="text-charcoal/40">${c.total} · ★${c.avg_rating}</span>
        </div>
        <div class="h-1.5 bg-cream-darker overflow-hidden">
          <div class="h-full bg-sage-dark transition-all duration-700" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

async function loadCourseTable() {
  const res   = await apiFetch('/analytics/by-course');
  const tbody = document.getElementById('courseTableBody');
  if (!tbody) return;

  if (!res.data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-charcoal/30 py-6">No data</td></tr>';
    return;
  }

  tbody.innerHTML = res.data.map(row => `
    <tr class="hover:bg-cream-dark transition-colors border-b border-charcoal/6 last:border-0">
      <td class="px-4 py-3 font-semibold text-sage-darker">${row.course.toUpperCase()}</td>
      <td class="px-4 py-3 text-center text-charcoal/75">${row.total}</td>
      <td class="px-4 py-3 text-center text-emerald-600">${row.positive}</td>
      <td class="px-4 py-3 text-center text-amber-600">${row.neutral}</td>
      <td class="px-4 py-3 text-center text-red-600">${row.negative}</td>
      <td class="px-4 py-3 text-center font-semibold text-amber-600">${row.avg_rating} ★</td>
    </tr>`).join('');
}

function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function showError(msg) { const el = document.getElementById('feedbackList'); if (el) el.innerHTML = `<div class="text-center text-red-600 py-8 text-sm">${msg}</div>`; }
