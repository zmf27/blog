(function () {
  'use strict';

  const main = document.querySelector('#site-main');
  if (!main || !window.fetch || !window.DOMParser) return;
  history.scrollRestoration = 'manual';

  let navigating = false;

  function isInternalLink(link, event) {
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target === '_blank' || link.hasAttribute('download') || link.dataset.noTransition !== undefined) return false;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return false;
    return true;
  }

  async function navigate(url, push) {
    if (navigating) return;
    navigating = true;
    main.classList.add('is-leaving');

    try {
      const response = await fetch(url, { headers: { 'X-NilCherDim-Navigation': 'true' } });
      if (!response.ok) throw new Error('Navigation failed');
      const html = await response.text();
      const documentNext = new DOMParser().parseFromString(html, 'text/html');
      const mainNext = documentNext.querySelector('#site-main');
      if (!mainNext) throw new Error('Missing page content');

      await new Promise((resolve) => setTimeout(resolve, 150));
      main.innerHTML = mainNext.innerHTML;
      document.title = documentNext.title;
      document.body.className = documentNext.body.className;
      if (push) history.pushState({ nilcherdim: true }, '', url);
      const target = new URL(url, window.location.origin);
      if (target.hash) {
        requestAnimationFrame(() => document.querySelector(target.hash)?.scrollIntoView({ behavior: 'smooth' }));
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      window.dispatchEvent(new CustomEvent('nilcherdim:navigated'));
    } catch (_) {
      window.location.href = url;
      return;
    } finally {
      main.classList.remove('is-leaving');
      navigating = false;
    }
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!isInternalLink(link, event)) return;
    event.preventDefault();
    navigate(link.href, true);
  });

  window.addEventListener('popstate', () => navigate(window.location.href, false));
})();
