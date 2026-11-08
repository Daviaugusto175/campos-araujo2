/* Inicialização: navegação por hash, busca global, delegação de eventos e renderização. */
(() => {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const { $, $$, esc } = CA.util;
  const { icon } = CA;
  const S = CA.store, U = CA.ui, V = CA.views;

  let current = 'dashboard';

  /* ---------- Navegação (gerada uma única vez a partir de V.NAV) ---------- */
  const TAB_IDS = V.NAV.filter(n => n.tab).map(n => n.id);

  function buildNav() {
    $('#sideNav').innerHTML = V.NAV.map(n =>
      `<a class="nav-link" href="#/${n.id}" data-nav="${n.id}" title="${esc(n.label)}">${icon(n.icon)}<span>${esc(n.label)}</span></a>`).join('');
    $('#tabBar').innerHTML = V.NAV.filter(n => n.tab).map(n =>
      `<a class="tab" href="#/${n.id}" data-nav="${n.id}">${icon(n.icon)}<span>${esc(n.tab)}</span></a>`).join('')
      + `<button type="button" class="tab" id="moreTab" data-action="more-open" aria-haspopup="dialog">${icon('more')}<span>Mais</span></button>`;
  }

  function openMore() {
    const rest = V.NAV.filter(n => !TAB_IDS.includes(n.id));
    U.openModal('Mais', `<div class="card list inset">${rest.map(n =>
      `<a class="list-row link" href="#/${n.id}" data-action="modal-close">
        <span class="row-icon">${icon(n.icon)}</span><span class="row-label">${esc(n.label)}</span>${icon('chevronRight', 'chev')}</a>`).join('')}</div>`);
  }

  function setActiveNav() {
    $$('[data-nav]').forEach(a => {
      const on = a.dataset.nav === current;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $('#moreTab').classList.toggle('active', !TAB_IDS.includes(current));
  }

  /* ---------- Renderização ---------- */
  function render({ animate = false } = {}) {
    const view = $('#view');
    view.innerHTML = V.screens[current]();
    view.classList.toggle('enter', false);
    if (animate) { void view.offsetWidth; view.classList.add('enter'); }
    view.removeAttribute('aria-busy');
  }

  function route() {
    const id = location.hash.replace(/^#\/?/, '');
    current = V.screens[id] ? id : 'dashboard';
    const nav = V.NAV.find(n => n.id === current);
    $('#pageTitle').textContent = nav.title;
    document.title = `${nav.title} · Campos Araújo`;
    setActiveNav();
    render({ animate: true });
    window.scrollTo(0, 0);
  }

  CA.app = { render };

  /* ---------- Eventos globais ---------- */
  const actions = {
    ...V.actions,
    'modal-close': () => U.closeModal(),
    'modal-backdrop': (_, el, e) => { if (e.target === el) U.closeModal(); },
    'more-open': openMore,
  };

  function showChartPoint(point) {
    if (!point) return;
    const host = point.closest('.chart-interactive');
    const detail = host && host.querySelector('.chart-point-detail');
    if (detail) {
      detail.textContent = `${point.dataset.series} · ${point.dataset.period} · ${point.dataset.valueLabel || 'Valor'}: ${point.dataset.value}. ${point.dataset.detail || ''}`;
      detail.classList.remove('hidden');
    }
  }

  // Mouse, toque/clique e foco do teclado mostram o mesmo detalhamento.
  document.addEventListener('mouseover', e => {
    const point = e.target.closest('.chart .pt[data-series]');
    if (point) showChartPoint(point);
  });
  document.addEventListener('focusin', e => {
    const point = e.target.closest('.chart .pt[data-series]');
    if (point) showChartPoint(point);
  });

  document.addEventListener('click', e => {
    const point = e.target.closest('.chart .pt[data-series]');
    if (point) showChartPoint(point);
    const el = e.target.closest('[data-action]');
    if (el) { const fn = actions[el.dataset.action]; if (fn) fn(el.dataset.id, el, e); }
    if (!e.target.closest('.search')) hideResults();
  });

  document.addEventListener('change', e => {
    const el = e.target.closest('[data-change]');
    if (el && V.changes[el.dataset.change]) V.changes[el.dataset.change](el);
  });

  document.addEventListener('submit', e => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const handler = V.forms[form.dataset.form];
    if (handler) handler(Object.fromEntries(new FormData(form)), form);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.querySelector('.alert-backdrop')) { U.closeModal(); hideResults(); }
  });

  /* ---------- Busca global por brinco ---------- */
  const input = $('#globalSearch'), results = $('#searchResults');
  const hideResults = () => results.classList.add('hidden');

  function search(q) {
    const found = S.db.animals.filter(a => a.brinco.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
    results.innerHTML = found.length
      ? found.map(a => `<button type="button" class="result" data-id="${a.id}"><b>${esc(a.brinco)}</b><span>${esc(a.nome || 'Sem nome')}</span><small>${esc(a.status)}</small></button>`).join('')
      : '<div class="result none">Nenhum brinco encontrado.</div>';
    results.classList.remove('hidden');
  }

  function openResult(id) {
    hideResults(); input.value = '';
    V.profile(id);
  }

  input.addEventListener('input', () => { const q = input.value.trim(); q ? search(q) : hideResults(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const first = results.querySelector('.result[data-id]'); if (first) openResult(first.dataset.id); }
  });
  results.addEventListener('click', e => { const b = e.target.closest('.result[data-id]'); if (b) openResult(b.dataset.id); });

  /* ---------- Início ---------- */
  buildNav();
  window.addEventListener('hashchange', route);
  // Refaz os gráficos quando a tela cruza o limite entre celular e telas maiores.
  window.matchMedia('(max-width: 699px)').addEventListener('change', () => render());
  route();
})();
