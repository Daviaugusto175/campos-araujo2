/* Dados (localStorage) e regras de negócio do rebanho. Nenhuma função aqui toca no DOM. */
(() => {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const { today, addDays, daysBetween, uid } = CA.util;

  const KEY = 'campos_araujo_ovinos_v1'; // mesma chave da versão anterior: os dados já salvos continuam valendo
  const COLLECTIONS = ['animals', 'weights', 'meds', 'famacha', 'gest', 'tasks'];
  const GESTATION_DAYS = 150;

  function emptyData() {
    return { animals: [], weights: [], meds: [], famacha: [], gest: [], tasks: [] };
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch { /* storage indisponível */ }
    if (!raw) return emptyData();
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') throw new Error('formato inválido');
      COLLECTIONS.forEach(k => { if (!Array.isArray(data[k])) data[k] = []; });
      return data;
    } catch {
      // Dados corrompidos: guarda uma cópia antes de recomeçar, para não perder nada.
      try { localStorage.setItem(KEY + '_backup', raw); } catch { /* ignore */ }
      return emptyData();
    }
  }

  const db = load();

  /** Persiste os dados. Retorna false se o navegador recusar (ex.: armazenamento cheio). */
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch { return false; }
  }
  save();

  /* ---------- Consultas ---------- */
  const animal = id => db.animals.find(a => a.id === id);
  const activeAnimals = () => db.animals.filter(a => a.status === 'Ativo');
  const animalLabel = a => (a ? (a.nome ? `${a.brinco} · ${a.nome}` : a.brinco) : '—');
  const latest = (arr, id) => arr.filter(x => x.animalId === id).sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0];
  const weightsOf = id => db.weights.filter(w => w.animalId === id).sort((a, b) => a.data.localeCompare(b.data));

  /* ---------- Regras ---------- */
  const carenciaEnd = m => addDays(m.data, Number(m.carencia || 0));
  const isCarencia = m => !!m && Number(m.carencia) > 0 && carenciaEnd(m) >= today();
  const partoEstimado = g => addDays(g.cobertura, GESTATION_DAYS);
  const isHealthAlert = f => Number(f.valor) >= 4 || Number(f.opg) > 500;

  /** Remove o animal e todos os registros ligados a ele. */
  function removeAnimal(id) {
    db.animals = db.animals.filter(x => x.id !== id);
    ['weights', 'meds', 'famacha', 'gest', 'tasks'].forEach(k => { db[k] = db[k].filter(x => x.animalId !== id); });
  }

  CA.store = { db, save, animal, activeAnimals, animalLabel, latest, weightsOf, carenciaEnd, isCarencia, partoEstimado, isHealthAlert, removeAnimal };
})();
