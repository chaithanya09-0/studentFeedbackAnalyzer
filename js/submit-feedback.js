/**
 * submit-feedback.js — Form logic + sentiment preview (Editorial cream theme)
 */
document.addEventListener('DOMContentLoaded', () => {
  const form         = document.getElementById('feedbackForm');
  const feedbackText = document.getElementById('feedback');
  const successMsg   = document.getElementById('successMessage');
  const previewBadge = document.getElementById('sentimentPreview');
  const submitBtn    = document.getElementById('submitBtn');
  const courseSelect = document.getElementById('course');

  // Block staff from submitting
  if (typeof isLoggedIn === 'function' && isLoggedIn()) {
    const user = getUser();
    if (form) {
      form.innerHTML = `
        <div class="flex flex-col items-center text-center py-14 space-y-4">
          <div class="text-5xl">🚫</div>
          <h3 class="font-serif text-3xl italic text-charcoal">Access Restricted</h3>
          <p class="text-charcoal/55 max-w-md">
            You are logged in as <strong>${user?.name || 'Staff'}</strong> (${user?.role || 'teacher'}).
            Only students can submit feedback.
          </p>
          <div class="flex gap-3 mt-4">
            <a href="dashboard.html" class="bg-sage text-charcoal px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-sage-dark transition-colors">Go to Dashboard</a>
            <button onclick="logout()" class="border border-charcoal/15 text-charcoal/60 px-6 py-2.5 rounded-full text-sm font-semibold hover:border-charcoal/30 hover:text-charcoal transition-colors">Logout</button>
          </div>
        </div>`;
      return;
    }
  }

  const instrSelect = document.getElementById('instructor');
  let previewTimer  = null;

  const courseTeachers = {
    oop:['Dr. Sharma','Prof. Mehta','Dr. Kapoor'], os:['Dr. Rao','Prof. Iyer'],
    cn:['Dr. Nair','Prof. Singh','Dr. Joshi'], aiml:['Dr. Verma','Prof. Pandey'],
    ml:['Dr. Verma','Prof. Pandey','Dr. Saxena'], dbms:['Dr. Gupta','Prof. Reddy'],
    dsa:['Dr. Sharma','Prof. Mishra','Dr. Kapoor'], se:['Prof. Thakur','Dr. Das'],
    cc:['Dr. Bose','Prof. Chawla']
  };

  // Dynamic instructor dropdown
  if (courseSelect && instrSelect) {
    instrSelect.disabled = true;
    courseSelect.addEventListener('change', () => {
      const c = courseSelect.value;
      instrSelect.innerHTML = '';
      if (!c || !courseTeachers[c]) { instrSelect.innerHTML = '<option value="">Select a course first</option>'; instrSelect.disabled = true; return; }
      instrSelect.disabled = false;
      instrSelect.innerHTML = '<option value="">Select an instructor</option>';
      courseTeachers[c].forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; instrSelect.appendChild(o); });
    });
  }

  // Rating pill buttons
  const ratingState = {};
  document.querySelectorAll('.question-row').forEach(row => {
    const qKey = row.dataset.question;
    row.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        ratingState[qKey] = parseInt(btn.dataset.value);
        row.querySelectorAll('.rating-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.value) === ratingState[qKey]));
        updateAvgRating();
      });
    });
  });

  function updateAvgRating() {
    const vals = Object.values(ratingState);
    const avgEl = document.getElementById('avgRating');
    const valEl = document.getElementById('avgRatingValue');
    if (!vals.length) { if (avgEl) avgEl.classList.add('hidden'); return; }
    if (valEl) valEl.textContent = (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1);
    if (avgEl) avgEl.classList.remove('hidden');
  }

  // Live sentiment preview
  if (feedbackText && previewBadge) {
    feedbackText.addEventListener('input', () => {
      clearTimeout(previewTimer);
      const text = feedbackText.value.trim();
      if (text.length < 10) { previewBadge.className = 'hidden'; return; }
      previewTimer = setTimeout(async () => {
        const vals = Object.values(ratingState);
        const rating = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 3;
        try {
          const res = await apiFetch(`/feedback/preview?text=${encodeURIComponent(text)}&rating=${rating}`);
          updatePreviewBadge(previewBadge, res.sentiment, res.score);
        } catch { updatePreviewBadge(previewBadge, 'analyzing...', null); }
      }, 400);
    });
  }

  // Form submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const required = ['course','instructor','feedback'];
      let firstErr = null;
      required.forEach(name => {
        const el = form.querySelector(`[name="${name}"]`);
        if (!el) return;
        const empty = !el.value.trim();
        el.classList.toggle('ring-1', empty); el.classList.toggle('ring-red-400', empty);
        if (empty && !firstErr) firstErr = el;
      });

      let qOk = true;
      document.querySelectorAll('.question-row').forEach(row => {
        const qk = row.dataset.question;
        if (!ratingState[qk]) { qOk = false; row.style.background = 'rgba(239,68,68,0.05)'; if (!firstErr) firstErr = row; }
        else { row.style.background = ''; }
      });

      if (firstErr) { firstErr.scrollIntoView({behavior:'smooth',block:'center'}); if (!qOk) alert('Please rate all 10 questions.'); return; }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Analyzing...'; }
      const fd = new FormData(form);
      const payload = {};
      fd.forEach((v,k) => { payload[k] = v; });
      for (let i=1; i<=10; i++) payload[`q${i}`] = ratingState[`q${i}`] || 0;

      try {
        const res = await apiFetch('/feedback', { method:'POST', body: JSON.stringify(payload) });
        const emoji = {positive:'😊',neutral:'😐',negative:'😞'};
        const color = {positive:'text-emerald-700',neutral:'text-amber-700',negative:'text-red-700'};
        document.getElementById('successSentiment').textContent = `${emoji[res.sentiment]||'🤖'} Classified as "${res.sentiment}" (${Math.round(res.score*100)}% · ${res.source})`;
        document.getElementById('successSentiment').className = `mt-2 text-sm font-semibold ${color[res.sentiment]}`;
        form.style.display = 'none';
        successMsg.classList.remove('hidden'); successMsg.classList.add('flex');
      } catch(err) { alert('❌ Error: ' + err.message); }
      finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Feedback'; } }
    });

    form.addEventListener('reset', () => {
      Object.keys(ratingState).forEach(k => delete ratingState[k]);
      document.querySelectorAll('.rating-btn.active').forEach(b => b.classList.remove('active'));
      document.getElementById('avgRating')?.classList.add('hidden');
      if (instrSelect) { instrSelect.innerHTML = '<option value="">Select a course first</option>'; instrSelect.disabled = true; }
      if (previewBadge) previewBadge.className = 'hidden';
    });
  }
});

function updatePreviewBadge(el, sentiment, score) {
  const map = {
    positive: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '😊 Positive' },
    neutral:  { cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: '😐 Neutral' },
    negative: { cls: 'bg-red-50 text-red-700 border-red-200',              icon: '😞 Negative' }
  };
  const s = map[sentiment] || { cls: 'bg-cream-dark text-charcoal/60 border-charcoal/15', icon: '🤖 Analyzing' };
  el.className = `inline-flex items-center gap-1 px-3 py-1 border text-xs font-medium ${s.cls}`;
  el.textContent = s.icon + (score !== null ? ` · ${Math.round(score*100)}%` : '');
}
