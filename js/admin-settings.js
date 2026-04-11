/**
 * admin-settings.js — Feedback password management for admins (Dashboard)
 */
document.addEventListener('DOMContentLoaded', () => {
  // Only show for admins
  if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return;
  const user = typeof getUser === 'function' ? getUser() : null;
  if (!user || user.role !== 'admin') return;

  const panel    = document.getElementById('adminSettingsPanel');
  const pwdInput = document.getElementById('adminFeedbackPassword');
  const toggleBtn = document.getElementById('adminTogglePwd');
  const saveBtn  = document.getElementById('adminSavePwd');
  const msgEl    = document.getElementById('adminPwdMsg');
  const statusEl = document.getElementById('adminPwdStatus');

  if (!panel || !pwdInput) return;

  // Show the panel
  panel.classList.remove('hidden');

  // Load current password
  (async () => {
    try {
      const res = await apiFetch('/auth/feedback-password');
      pwdInput.value = res.password || '';
      updateStatus(res.password);
    } catch {
      pwdInput.placeholder = 'Error loading password';
    }
  })();

  // Toggle visibility
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = pwdInput.type === 'password';
      pwdInput.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? '🙈' : '👁️';
    });
  }

  // Save password
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        const res = await apiFetch('/auth/feedback-password', {
          method: 'PUT',
          body: JSON.stringify({ password: pwdInput.value })
        });
        showMsg('✅ ' + res.message, 'text-emerald-600');
        updateStatus(pwdInput.value);
      } catch (err) {
        showMsg('❌ ' + err.message, 'text-red-600');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    });
  }

  function updateStatus(pwd) {
    if (!statusEl) return;
    if (pwd && pwd.trim()) {
      statusEl.textContent = 'Active';
      statusEl.className = 'text-xs font-medium px-3 py-1 bg-sage/15 text-sage-darker border border-sage/20';
    } else {
      statusEl.textContent = 'Disabled';
      statusEl.className = 'text-xs font-medium px-3 py-1 bg-red-50 text-red-600 border border-red-200';
    }
  }

  function showMsg(text, cls) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = `text-xs ${cls}`;
    msgEl.classList.remove('hidden');
    setTimeout(() => msgEl.classList.add('hidden'), 4000);
  }
});
