/**
 * js/login.js — Login form handler
 */
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to dashboard
  if (isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form     = document.getElementById('loginForm');
  const errorEl  = document.getElementById('loginError');
  const submitBtn = document.getElementById('loginBtn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        showError('Please enter both email and password.');
        return;
      }

      // Disable button
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Logging in...';
      }
      hideError();

      try {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        // Save token & user info
        saveAuth(res.token, res.user);

        // Redirect to dashboard
        window.location.href = 'dashboard.html';
      } catch (err) {
        showError(err.message || 'Login failed. Please check your credentials.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
        }
      }
    });
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
    }
  }
  function hideError() {
    if (errorEl) errorEl.classList.add('hidden');
  }
});
