/**
 * js/auth.js — Shared authentication helper (Editorial theme)
 */
const AUTH_TOKEN_KEY = 'fb_auth_token';
const AUTH_USER_KEY  = 'fb_auth_user';

function getToken()   { return localStorage.getItem(AUTH_TOKEN_KEY); }
function getUser()    { try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY)); } catch { return null; } }
function isLoggedIn() { return !!getToken(); }
function saveAuth(token, user) { localStorage.setItem(AUTH_TOKEN_KEY, token); localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)); }
function logout()     { localStorage.removeItem(AUTH_TOKEN_KEY); localStorage.removeItem(AUTH_USER_KEY); window.location.href = 'index.html'; }

function requireLogin() {
  if (!isLoggedIn()) { window.location.href = 'login.html'; return false; }
  return true;
}

function updateNavbar() {
  const navList = document.querySelector('nav ul');
  if (!navList) return;

  const loggedIn = isLoggedIn();
  const user     = getUser();

  // Hide Dashboard/Analytics for non-logged-in users
  navList.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === 'dashboard.html' || href === 'analytics.html') {
      a.parentElement.style.display = loggedIn ? '' : 'none';
    }
  });

  // Remove existing auth button
  const existing = navList.querySelector('.auth-nav-item');
  if (existing) existing.remove();

  const li = document.createElement('li');
  li.className = 'auth-nav-item';

  if (loggedIn && user) {
    li.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-xs text-charcoal/50 hidden lg:inline">
          <span class="text-charcoal font-semibold">${user.name}</span>
          <span class="text-charcoal/35">(${user.role})</span>
        </span>
        <button onclick="logout()" class="border border-charcoal/15 text-charcoal/60 hover:text-charcoal hover:border-charcoal/30 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors">
          Logout
        </button>
      </div>`;
  } else {
    li.innerHTML = `
      <a href="login.html" class="bg-sage text-charcoal px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage-dark transition-colors">
        Login
      </a>`;
  }

  navList.appendChild(li);
}

document.addEventListener('DOMContentLoaded', updateNavbar);

window.getToken     = getToken;
window.getUser      = getUser;
window.isLoggedIn   = isLoggedIn;
window.saveAuth     = saveAuth;
window.logout       = logout;
window.requireLogin = requireLogin;
