(function () {
  'use strict';

  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');

  function updateHeader() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 30);
  }

  function updateActiveNav() {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('[data-nav-link]').forEach((link) => {
      const target = new URL(link.href, window.location.origin).pathname.replace(/\/$/, '') || '/';
      const active = target === '/' ? path === '/' : path === target || path.startsWith(target + '/');
      link.classList.toggle('is-active', active);
    });
  }

  function closeMenu() {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '打开导航');
    nav.classList.remove('is-open');
  }

  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
    nav?.classList.toggle('is-open', open);
  });

  document.addEventListener('click', async (event) => {
    const link = event.target.closest('a');
    if (link && nav?.contains(link)) closeMenu();

    const copyButton = event.target.closest('[data-copy]');
    if (!copyButton) return;
    const value = copyButton.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
    } catch (_) {
      const input = document.createElement('textarea');
      input.value = value;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    showToast('已复制：' + value);
  });

  function showToast(message) {
    let toast = document.querySelector('.copy-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'copy-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    clearTimeout(window.__nilcherToastTimer);
    window.__nilcherToastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1800);
  }

  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('nilcherdim:navigated', () => {
    updateActiveNav();
    closeMenu();
  });
  updateHeader();
  updateActiveNav();
})();
