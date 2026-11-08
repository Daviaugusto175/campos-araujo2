/* Tema claro/escuro + barra superior estilo iOS.
   - Sem escolha manual: segue o tema do sistema.
   - Ao clicar no botão: grava "light" ou "dark" no navegador. */
(function () {
  'use strict';

  var root = document.documentElement;
  var btn = document.getElementById('themeToggle');
  var topbar = document.getElementById('topbar');
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  var ICON_MOON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var ICON_SUN = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';

  function saved() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  function current() {
    return root.dataset.theme || (mq.matches ? 'dark' : 'light');
  }

  function sync() {
    var dark = current() === 'dark';
    // Cor da barra de status do navegador/PWA
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.setAttribute('content', dark ? '#0f140f' : '#f4f0e6');
      m.removeAttribute('media');
    });
    // Botão mostra a ação disponível: no escuro mostra o sol, no claro mostra a lua
    if (btn) {
      btn.innerHTML = dark ? ICON_SUN : ICON_MOON;
      btn.setAttribute('aria-label', dark ? 'Mudar para tema claro' : 'Mudar para tema escuro');
      btn.title = dark ? 'Tema claro' : 'Tema escuro';
    }
  }

  if (btn) {
    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      sync();
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
    });
  }

  // Se o usuário nunca escolheu, acompanha mudanças do sistema em tempo real
  var onSystemChange = function () { if (!saved()) sync(); };
  if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
  else if (mq.addListener) mq.addListener(onSystemChange);

  // Título grande que encolhe e ganha divisória ao rolar (como no iOS)
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 8);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  sync();
})();