/**
 * analytics.js — Chart.js charts (Editorial cream theme)
 */
let trendChart, distributionChart, volumeChart, ratingChart;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireLogin()) return;
  try {
    const [summaryRes, trendsRes, byCourseRes, byCatRes] = await Promise.all([
      apiFetch('/analytics/summary'), apiFetch('/analytics/trends'),
      apiFetch('/analytics/by-course'), apiFetch('/analytics/by-category')
    ]);
    renderDistributionChart(summaryRes.data);
    renderTrendChart(trendsRes.data);
    renderVolumeChart(byCourseRes.data);
    renderRatingChart(byCatRes.data);
    renderInsights(summaryRes.data, byCourseRes.data, byCatRes.data);
    renderPieLegend(summaryRes.data);
  } catch (err) {
    document.querySelectorAll('.chart-error').forEach(el => el.classList.remove('hidden'));
    console.error('Analytics load error:', err);
  }
});

const chartDefaults = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const gridColor = 'rgba(26,28,27,0.08)';

function renderDistributionChart(data) {
  const ctx = document.getElementById('distributionChart');
  if (!ctx) return;
  if (distributionChart) distributionChart.destroy();
  distributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Positive','Neutral','Negative'],
      datasets: [{ data: [data.positive, data.neutral, data.negative],
        backgroundColor: ['#059669','#D97706','#DC2626'], borderWidth: 3, borderColor: '#F4F1EA', hoverOffset: 8 }]
    },
    options: { ...chartDefaults, cutout: '65%',
      plugins: { legend: { display: true, position: 'bottom', labels: { padding: 16, font: { size: 12, family: 'Manrope' }, color: 'rgba(26,28,27,0.5)' } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed/(data.total||1)*100)}%)` } } } }
  });
}

function renderTrendChart(data) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        { label: 'Positive', data: data.map(d => d.positive), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#059669' },
        { label: 'Neutral',  data: data.map(d => d.neutral),  borderColor: '#D97706', backgroundColor: 'rgba(217,119,6,0.08)',  tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#D97706' },
        { label: 'Negative', data: data.map(d => d.negative), borderColor: '#DC2626', backgroundColor: 'rgba(220,38,38,0.08)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#DC2626' }
      ]
    },
    options: { ...chartDefaults,
      plugins: { legend: { display: true, position: 'top', labels: { font: { size: 11, family: 'Manrope' }, color: 'rgba(26,28,27,0.55)' } } },
      scales: { x: { grid: { display: false }, ticks: { color: 'rgba(26,28,27,0.4)', font: { family: 'Manrope' } } },
               y: { beginAtZero: true, grid: { color: gridColor }, ticks: { precision: 0, color: 'rgba(26,28,27,0.4)', font: { family: 'Manrope' } } } }
    }
  });
}

function renderVolumeChart(data) {
  const ctx = document.getElementById('volumeChart');
  if (!ctx) return;
  if (volumeChart) volumeChart.destroy();
  volumeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.course.toUpperCase()),
      datasets: [{ label: 'Count', data: data.map(d => d.total),
        backgroundColor: data.map(() => 'rgba(109,139,123,0.6)'), borderRadius: 2, borderSkipped: false }]
    },
    options: { ...chartDefaults,
      scales: { x: { grid: { display: false }, ticks: { color: 'rgba(26,28,27,0.45)', font: { family: 'Manrope', size: 11 } } },
               y: { beginAtZero: true, grid: { color: gridColor }, ticks: { precision: 0, color: 'rgba(26,28,27,0.4)', font: { family: 'Manrope' } } } }
    }
  });
}

function renderRatingChart(data) {
  const ctx = document.getElementById('ratingChart');
  if (!ctx) return;
  if (ratingChart) ratingChart.destroy();
  const labels = { teaching:'Teaching', content:'Content', materials:'Materials', assessment:'Assessment', support:'Support', facilities:'Facilities', other:'Other' };
  ratingChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => labels[d.category] || d.category),
      datasets: [{ label: 'Avg Rating', data: data.map(d => d.avg_rating),
        backgroundColor: data.map(d => d.avg_rating >= 4 ? '#059669' : d.avg_rating >= 3 ? '#D97706' : '#DC2626'),
        borderRadius: 2, borderSkipped: false }]
    },
    options: { ...chartDefaults, indexAxis: 'y',
      scales: { x: { min: 0, max: 5, ticks: { stepSize: 1, color: 'rgba(26,28,27,0.4)', font: { family: 'Manrope' } }, grid: { color: gridColor } },
               y: { grid: { display: false }, ticks: { color: 'rgba(26,28,27,0.55)', font: { family: 'Manrope' } } } }
    }
  });
}

function renderInsights(summary, byCourse, byCategory) {
  const sorted = [...byCourse].sort((a,b) => b.avg_rating - a.avg_rating);
  const best = sorted[0], worst = sorted[sorted.length-1];
  const cats = [...byCategory].sort((a,b) => b.avg_rating - a.avg_rating);
  const bestCat = cats[0], worstCat = cats[cats.length-1];

  const s = document.getElementById('insightStrengths');
  if (s && best) s.innerHTML = `<ul class="space-y-2 text-sm text-emerald-700"><li>✅ <strong>${best.course.toUpperCase()}</strong> — highest rating (${best.avg_rating}★)</li><li>✅ <strong>${summary.positive_pct}%</strong> positive feedback</li>${bestCat?`<li>✅ <strong>${bestCat.category}</strong> rated best (${bestCat.avg_rating}★)</li>`:''}</ul>`;
  else if (s) s.innerHTML = '<p class="text-charcoal/40">Not enough data yet.</p>';

  const i = document.getElementById('insightImprove');
  if (i && worst) i.innerHTML = `<ul class="space-y-2 text-sm text-amber-700"><li>⚠️ <strong>${worst.course.toUpperCase()}</strong> — lowest rating (${worst.avg_rating}★)</li><li>⚠️ <strong>${summary.negative_pct}%</strong> negative feedback</li>${worstCat?`<li>⚠️ <strong>${worstCat.category}</strong> lowest rated (${worstCat.avg_rating}★)</li>`:''}</ul>`;
  else if (i) i.innerHTML = '<p class="text-charcoal/40">Not enough data yet.</p>';

  const r = document.getElementById('insightRecs');
  if (r) r.innerHTML = `<ul class="space-y-2 text-sm text-sage-darker"><li>📌 Focus on <strong>${worst?.course?.toUpperCase()||'low-rated courses'}</strong></li><li>📌 Replicate patterns from <strong>${best?.course?.toUpperCase()||'top courses'}</strong></li><li>📌 Schedule regular feedback cycles</li><li>📌 Target <strong>${worstCat?.category||'key areas'}</strong> training</li></ul>`;
}

function renderPieLegend(data) {
  ['positive','neutral','negative'].forEach(t => {
    const el = document.getElementById(`${t}PiePct`);
    if (el) el.textContent = `${data[t+'_pct']}%`;
  });
}
