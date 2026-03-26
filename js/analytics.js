/**
 * analytics.js — Chart.js charts (Editorial dark theme)
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
const gridColor = 'rgba(255,255,255,0.06)';

function renderDistributionChart(data) {
  const ctx = document.getElementById('distributionChart');
  if (!ctx) return;
  if (distributionChart) distributionChart.destroy();
  distributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Positive','Neutral','Negative'],
      datasets: [{ data: [data.positive, data.neutral, data.negative],
        backgroundColor: ['#34D399','#FBBF24','#F87171'], borderWidth: 3, borderColor: '#1A1C1B', hoverOffset: 8 }]
    },
    options: { ...chartDefaults, cutout: '65%',
      plugins: { legend: { display: true, position: 'bottom', labels: { padding: 16, font: { size: 12, family: 'Manrope' }, color: 'rgba(255,255,255,0.5)' } },
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
        { label: 'Positive', data: data.map(d => d.positive), borderColor: '#34D399', backgroundColor: 'rgba(52,211,153,0.05)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#34D399' },
        { label: 'Neutral',  data: data.map(d => d.neutral),  borderColor: '#FBBF24', backgroundColor: 'rgba(251,191,36,0.05)',  tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#FBBF24' },
        { label: 'Negative', data: data.map(d => d.negative), borderColor: '#F87171', backgroundColor: 'rgba(248,113,113,0.05)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#F87171' }
      ]
    },
    options: { ...chartDefaults,
      plugins: { legend: { display: true, position: 'top', labels: { font: { size: 11, family: 'Manrope' }, color: 'rgba(255,255,255,0.5)' } } },
      scales: { x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { family: 'Manrope' } } },
               y: { beginAtZero: true, grid: { color: gridColor }, ticks: { precision: 0, color: 'rgba(255,255,255,0.3)', font: { family: 'Manrope' } } } }
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
        backgroundColor: data.map(() => 'rgba(165,192,179,0.6)'), borderRadius: 2, borderSkipped: false }]
    },
    options: { ...chartDefaults,
      scales: { x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.35)', font: { family: 'Manrope', size: 11 } } },
               y: { beginAtZero: true, grid: { color: gridColor }, ticks: { precision: 0, color: 'rgba(255,255,255,0.3)', font: { family: 'Manrope' } } } }
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
        backgroundColor: data.map(d => d.avg_rating >= 4 ? '#34D399' : d.avg_rating >= 3 ? '#FBBF24' : '#F87171'),
        borderRadius: 2, borderSkipped: false }]
    },
    options: { ...chartDefaults, indexAxis: 'y',
      scales: { x: { min: 0, max: 5, ticks: { stepSize: 1, color: 'rgba(255,255,255,0.3)', font: { family: 'Manrope' } }, grid: { color: gridColor } },
               y: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Manrope' } } } }
    }
  });
}

function renderInsights(summary, byCourse, byCategory) {
  const sorted = [...byCourse].sort((a,b) => b.avg_rating - a.avg_rating);
  const best = sorted[0], worst = sorted[sorted.length-1];
  const cats = [...byCategory].sort((a,b) => b.avg_rating - a.avg_rating);
  const bestCat = cats[0], worstCat = cats[cats.length-1];

  const s = document.getElementById('insightStrengths');
  if (s && best) s.innerHTML = `<ul class="space-y-2 text-sm text-emerald-300"><li>✅ <strong>${best.course.toUpperCase()}</strong> — highest rating (${best.avg_rating}★)</li><li>✅ <strong>${summary.positive_pct}%</strong> positive feedback</li>${bestCat?`<li>✅ <strong>${bestCat.category}</strong> rated best (${bestCat.avg_rating}★)</li>`:''}</ul>`;

  const i = document.getElementById('insightImprove');
  if (i && worst) i.innerHTML = `<ul class="space-y-2 text-sm text-amber-300"><li>⚠️ <strong>${worst.course.toUpperCase()}</strong> — lowest rating (${worst.avg_rating}★)</li><li>⚠️ <strong>${summary.negative_pct}%</strong> negative feedback</li>${worstCat?`<li>⚠️ <strong>${worstCat.category}</strong> lowest rated (${worstCat.avg_rating}★)</li>`:''}</ul>`;

  const r = document.getElementById('insightRecs');
  if (r) r.innerHTML = `<ul class="space-y-2 text-sm text-sage-light"><li>📌 Focus on <strong>${worst?.course?.toUpperCase()||'low-rated courses'}</strong></li><li>📌 Replicate patterns from <strong>${best?.course?.toUpperCase()||'top courses'}</strong></li><li>📌 Schedule regular feedback cycles</li><li>📌 Target <strong>${worstCat?.category||'key areas'}</strong> training</li></ul>`;
}

function renderPieLegend(data) {
  ['positive','neutral','negative'].forEach(t => {
    const el = document.getElementById(`${t}PiePct`);
    if (el) el.textContent = `${data[t+'_pct']}%`;
  });
}
