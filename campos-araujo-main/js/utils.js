/* Utilitários puros: datas, números, escape de HTML. */
(() => {
  'use strict';
  const CA = (window.CA = window.CA || {});

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = v => new Date(v + 'T12:00:00');

  const today = () => iso(new Date());
  const fmtDate = v => (v ? parse(v).toLocaleDateString('pt-BR') : '—');
  const addDays = (v, n) => { const d = parse(v); d.setDate(d.getDate() + n); return iso(d); };
  const daysBetween = (a, b) => Math.floor((parse(b) - parse(a)) / 86400000);

  function age(v) {
    if (!v) return '—';
    const n = daysBetween(v, today());
    if (n < 0) return 'Data futura';
    const m = Math.floor(n / 30), y = Math.floor(m / 12);
    if (y) return `${y} ano(s) e ${m % 12} mês(es)`;
    return m ? `${m} mês(es) e ${n % 30} dia(s)` : `${n} dia(s)`;
  }

  const fmt = (n, d = 1) =>
    Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

  const uid = () => Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 8);

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Últimos n meses (inclui o atual): [{ key: '2026-11', label: 'nov' }]. */
  function lastMonths(n = 6) {
    const now = new Date();
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (n - 1) + i, 1);
      return {
        key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
        label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      };
    });
  }

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  CA.util = { $, $$, iso, today, fmtDate, addDays, daysBetween, age, fmt, uid, esc, lastMonths };
})();
