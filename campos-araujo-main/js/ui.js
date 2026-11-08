/* Componentes visuais reutilizáveis: cartões, tabelas, formulários, gráficos, modal e avisos. */
(() => {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const { $, esc, fmt } = CA.util;
  const { icon } = CA;

  /* ---------- Blocos básicos ---------- */
  const pill = (text, tone = '') => `<span class="pill ${tone}">${esc(text)}</span>`;

  function emptyState({ icon: ic = 'inbox', title, text = '', action = '' }) {
    return `<div class="empty">
      <div class="empty-icon">${icon(ic)}</div>
      <strong>${esc(title)}</strong>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${action}
    </div>`;
  }

  /** Cartão com título. `flush` remove o respiro interno (para tabelas). */
  const panel = (title, body, extra = '', { flush = false } = {}) =>
    `<section class="card panel${flush ? ' flush' : ''}">
      <div class="panel-head"><h3>${title}</h3>${extra}</div>${body}
    </section>`;

  const toolbar = (title, buttons = '') =>
    `<div class="toolbar"><h2>${title}</h2><div class="actions">${buttons}</div></div>`;

  const button = (label, { action, id = '', tone = '', ic = '', small = false, href = '' } = {}) => {
    const cls = `btn ${tone} ${small ? 'small' : ''}`.trim();
    const inner = `${ic ? icon(ic) : ''}<span>${label}</span>`;
    return href
      ? `<a class="${cls}" href="${href}">${inner}</a>`
      : `<button type="button" class="${cls}" data-action="${action}"${id ? ` data-id="${esc(id)}"` : ''}>${inner}</button>`;
  };

  /** Botão de ação de linha: só ícone no desktop, ícone + rótulo nos cartões do celular. */
  const rowBtn = (label, action, id, ic, tone = '') =>
    `<button type="button" class="btn small row-btn ${tone}" data-action="${action}" data-id="${esc(id)}" title="${esc(label)}" aria-label="${esc(label)}">${icon(ic)}<span class="row-btn-label">${esc(label)}</span></button>`;

  /**
   * Tabela responsiva: no celular cada linha vira um cartão (usa data-label).
   * rows: array de arrays de células (HTML já escapado).
   */
  function table(headers, rows, empty) {
    if (!rows.length) return empty ? emptyState(empty) : emptyState({ title: 'Nenhum registro encontrado.' });
    return `<div class="table-scroll"><table class="table">
      <thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td data-label="${esc(headers[i] || '')}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  function tile({ label, value, note = '', ic, tone = '' }) {
    return `<div class="card tile">
      <div class="tile-icon ${tone}">${icon(ic)}</div>
      <div class="tile-value">${value}</div>
      <div class="tile-label">${label}</div>
      <div class="tile-note">${note}</div>
    </div>`;
  }

  /** Lista agrupada estilo iOS (Ajustes): [{ label, value, ic }]. */
  function group(title, rows) {
    return `<section class="group"><h3 class="group-title">${title}</h3>
      <div class="card list">${rows.map(r => `<div class="list-row"><span class="row-icon">${icon(r.ic)}</span><span class="row-label">${r.label}</span><strong class="row-value">${r.value}</strong></div>`).join('')}</div>
    </section>`;
  }

  /* ---------- Formulários ---------- */
  function field({ label, name, value = '', type = 'text', required = false, full = false, placeholder = '' }) {
    const num = type === 'number' ? ' step="0.01" min="0" inputmode="decimal"' : '';
    return `<div class="field${full ? ' full' : ''}"><label for="f-${name}">${label}</label>
      <input id="f-${name}" name="${name}" type="${type}" value="${esc(value ?? '')}"${required ? ' required' : ''}${num}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}></div>`;
  }

  /** options: strings ou { value, label }. */
  function select({ label, name, options, value = '', id = '', attrs = '' }) {
    const opts = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
    return `<div class="field"><label for="${id || 'f-' + name}">${label}</label>
      <select id="${id || 'f-' + name}" name="${name}" ${attrs}>${opts.map(o => `<option value="${esc(o.value)}"${o.value === value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>`;
  }

  const animalOptions = list => list.map(a => ({ value: a.id, label: CA.store.animalLabel(a) }));

  /* ---------- Gráficos SVG ---------- */
  const isCompact = () => window.matchMedia('(max-width: 699px)').matches;

  /** Tamanho do desenho ≈ largura real do cartão, para o texto manter tamanho legível (1:1). */
  function chartSize(full) {
    const vw = window.innerWidth;
    const side = vw >= 1024 ? 268 : vw >= 700 ? 80 : 0, pad = vw >= 700 ? 64 : 32;
    let w = Math.min(vw - side - pad, 1280 - pad) - (vw >= 700 ? 40 : 32); // menos o respiro interno do cartão
    if (!full && vw >= 1024) w = (w + 40 - 16) / 2 - 40;
    w = Math.max(300, Math.min(1100, Math.round(w)));
    return { W: w, H: Math.max(200, Math.min(300, Math.round(w * 0.4))) };
  }
  const legend = items => `<div class="legend">${items.map(i => `<span><i class="dot ${i.cls}"></i>${esc(i.name)}</span>`).join('')}</div>`;

  /** Gráfico de linhas. values pode conter null (mês sem dado → interrompe a linha). */
  function lineChart({ labels, series, full = false }) {
    const vals = series.flatMap(s => s.values).filter(v => v != null);
    if (!vals.length) return emptyState({ ic: 'trendingUp', title: 'Sem pesagens no período', text: 'Registre pesagens para ver a evolução aqui.' });
    const { W, H } = chartSize(full), L = 40, R = 14, T = 14, B = 30;
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.2 || hi * 0.2 || 1;
    const yMin = Math.max(0, lo - pad), yMax = hi + pad, span = yMax - yMin;
    const x = i => L + (labels.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (labels.length - 1));
    const y = v => H - B - ((v - yMin) / span) * (H - T - B);
    const decimals = span < 10 ? 1 : 0;
    const grid = [0, 1, 2, 3].map(i => {
      const v = yMin + (span * i) / 3, yy = y(v);
      return `<line class="gl" x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end">${fmt(v, decimals)}</text>`;
    }).join('');
    const path = vals => vals.map((v, i) => (v == null ? '' : `${i === 0 || vals[i - 1] == null ? 'M' : 'L'}${x(i)},${y(v)}`)).join(' ');
    const lines = series.map((s, k) =>
      `<path class="line s${k}" d="${path(s.values)}"/>${s.values.map((v, i) => (v == null ? '' : `<circle class="pt s${k}" data-series="${esc(s.name)}" data-period="${esc(labels[i])}" data-value="${fmt(v)} kg" data-value-label="${esc(s.valueLabel || 'Valor')}" data-detail="${esc(s.details && s.details[i] ? s.details[i] : 'Sem detalhamento adicional')}" cx="${x(i)}" cy="${y(v)}" r="5" tabindex="0" role="button" aria-label="${esc(s.name)} ${esc(labels[i])}: ${fmt(v)} kg"><title>${esc(s.name)} · ${esc(labels[i])}: ${esc(s.valueLabel || 'Valor')} ${fmt(v)} kg${s.details && s.details[i] ? ' | Registros: ' + esc(s.details[i]) : ''}</title></circle>`)).join('')}`).join('');
    // Evita sobreposição de datas quando há muitas pesagens; todos os pontos
    // continuam visíveis e interativos, apenas os rótulos do eixo são espaçados.
    const labelStep = Math.max(1, Math.ceil(labels.length / 8));
    const xs = labels.map((l, i) => (i % labelStep === 0 || i === labels.length - 1)
      ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>` : '').join('');
    const names = series.map((s, k) => ({ name: s.name, cls: 's' + k }));
    return `<div class="chart-interactive"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(s => s.name).join(' e '))} por mês">${grid}${lines}${xs}</svg><div class="chart-point-detail hidden" aria-live="polite"></div></div>${legend(names)}`;
  }

  /** Gráfico de barras agrupadas (duas séries). */
  function barChart({ labels, a, b }) {
    const max = Math.max(0, ...a.values, ...b.values);
    if (!max) return emptyState({ ic: 'baby', title: 'Sem nascimentos no período', text: 'Os nascimentos aparecem aqui a partir da data de nascimento dos animais.' });
    const { W, H } = chartSize(false), L = 32, R = 10, T = 18, B = 30;
    const step = Math.ceil(max / 4), top = step * 4, slot = (W - L - R) / labels.length, bw = Math.min(26, slot * 0.28);
    const y = v => H - B - (v / top) * (H - T - B);
    const grid = [0, 1, 2, 3, 4].map(i => `<line class="gl" x1="${L}" y1="${y(i * step)}" x2="${W - R}" y2="${y(i * step)}"/><text x="${L - 8}" y="${y(i * step) + 4}" text-anchor="end">${i * step}</text>`).join('');
    const bar = (v, cx, cls, name, label) => (v ? `<rect class="bar ${cls}" x="${cx}" y="${y(v)}" width="${bw}" height="${H - B - y(v)}" rx="4"><title>${esc(name)}: ${v} · ${esc(label)}</title></rect><text x="${cx + bw / 2}" y="${y(v) - 5}" text-anchor="middle" class="val">${v}</text>` : '');
    const bars = labels.map((l, i) => {
      const mid = L + slot * i + slot / 2;
      return `${bar(a.values[i], mid - bw - 2, 's0', a.name, l)}${bar(b.values[i], mid + 2, 's1', b.name, l)}<text x="${mid}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(a.name)} e ${esc(b.name)} por mês">${grid}${bars}</svg>${legend([{ name: a.name, cls: 's0' }, { name: b.name, cls: 's1' }])}`;
  }

  /* ---------- Toast, modal e confirmação ---------- */
  let toastTimer;
  function toast(msg, kind = 'ok') {
    const el = $('#toast');
    el.innerHTML = `${icon(kind === 'error' ? 'circleAlert' : 'circleCheck')}<span>${esc(msg)}</span>`;
    el.className = `toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  let lastFocus = null;
  function openModal(title, body, { onClose } = {}) {
    lastFocus = document.activeElement;
    const root = $('#modalRoot');
    root.innerHTML = `<div class="backdrop" data-action="modal-backdrop">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="grabber" aria-hidden="true"></div>
        <div class="sheet-head"><h2 id="modalTitle">${title}</h2>
          <button type="button" class="icon-btn" data-action="modal-close" aria-label="Fechar">${icon('x')}</button></div>
        <div class="sheet-body">${body}</div>
      </div></div>`;
    root._onClose = onClose;
    document.body.classList.add('modal-open');
    const sheet = root.querySelector('.sheet');
    const first = root.querySelector('input:not([type=hidden]), select, textarea');
    if (first && !isCompact()) first.focus({ preventScroll: true }); // no celular evita abrir o teclado sozinho
    else { sheet.tabIndex = -1; sheet.focus({ preventScroll: true }); }
  }

  function closeModal() {
    const root = $('#modalRoot');
    if (!root.firstChild) return;
    root.innerHTML = '';
    document.body.classList.remove('modal-open');
    if (root._onClose) root._onClose();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  /** Confirmação no estilo de alerta do iOS. Retorna Promise<boolean>. */
  function confirmDialog({ title, text, confirmLabel = 'Confirmar', danger = false }) {
    return new Promise(resolve => {
      const host = document.createElement('div');
      host.className = 'backdrop alert-backdrop';
      host.innerHTML = `<div class="ios-alert" role="alertdialog" aria-modal="true" aria-labelledby="alertTitle" aria-describedby="alertText">
        <div class="ios-alert-body"><h2 id="alertTitle">${esc(title)}</h2><p id="alertText">${esc(text)}</p></div>
        <div class="ios-alert-actions">
          <button type="button" data-v="0">Cancelar</button>
          <button type="button" data-v="1" class="${danger ? 'danger' : 'strong'}">${esc(confirmLabel)}</button>
        </div></div>`;
      const prev = document.activeElement;
      const done = v => { host.remove(); document.removeEventListener('keydown', onKey, true); prev?.focus?.({ preventScroll: true }); resolve(v); };
      const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
      host.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) done(b.dataset.v === '1'); else if (e.target === host) done(false); });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(host);
      host.querySelector('button[data-v="0"]').focus();
    });
  }

  /** Mantém o foco dentro do modal aberto. */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const sheet = $('#modalRoot .sheet');
    if (!sheet || document.querySelector('.alert-backdrop')) return;
    const f = [...sheet.querySelectorAll('button, input, select, textarea, a[href]')].filter(x => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  CA.ui = { pill, emptyState, panel, toolbar, button, rowBtn, table, tile, group, field, select, animalOptions, lineChart, barChart, toast, openModal, closeModal, confirmDialog };
})();
