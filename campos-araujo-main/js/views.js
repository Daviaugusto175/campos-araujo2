/* Telas do sistema. Cada tela é uma função que devolve HTML; os formulários ficam em `forms`. */
(() => {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const { $, $$, esc, fmt, fmtDate, today, addDays, daysBetween, age, uid, lastMonths } = CA.util;
  const { icon } = CA;
  const S = CA.store, U = CA.ui, db = S.db;

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', title: 'Dashboard', icon: 'dashboard', tab: 'Início' },
    { id: 'animais', label: 'Animais', title: 'Cadastro de animais', icon: 'paw', tab: 'Animais' },
    { id: 'pesagens', label: 'Pesagens', title: 'Controle de pesagens', icon: 'scale', tab: 'Pesagens' },
    { id: 'medicacoes', label: 'Medicações', title: 'Medicações', icon: 'syringe' },
    { id: 'famacha', label: 'Famacha / OPG', title: 'Famacha / OPG', icon: 'heartPulse' },
    { id: 'gestacao', label: 'Gestação', title: 'Gestação', icon: 'baby' },
    { id: 'tarefas', label: 'Tarefas', title: 'Tarefas', icon: 'listChecks', tab: 'Tarefas' },
  ];

  const state = { animalFilter: 'Todos', selectedAnimal: '', medFilters: { animalId: '', medicamento: '', responsavel: '', inicio: '', fim: '' } };
  const rerender = () => CA.app.render();
  const label = id => S.animalLabel(S.animal(id));
  const brinco = id => esc(S.animal(id)?.brinco || '—');

  const addBtn = (text, action) => U.button(text, { action, tone: 'primary', ic: 'plus' });
  const needAnimals = () => {
    if (db.animals.length) return false;
    U.toast('Cadastre um animal primeiro.', 'error');
    location.hash = '#/animais';
    return true;
  };
  const noAnimalsState = () => U.emptyState({
    ic: 'paw', title: 'Nenhum animal cadastrado',
    text: 'Cadastre os animais do rebanho para começar a registrar pesagens e medicações.',
    action: addBtn('Novo animal', 'animal-new'),
  });

  /* =========================================================== Dashboard */
  function dashboard() {
    const act = S.activeAnimals(), t0 = today();
    const inCarencia = db.meds.filter(S.isCarencia);
    const pending = db.tasks.filter(t => t.status !== 'Feita').sort((a, b) => a.data.localeCompare(b.data));
    const late = pending.filter(t => t.data < t0);
    const pregnant = db.gest.filter(g => g.resultado === 'positivo');
    const births = pregnant.map(g => ({ g, parto: g.previsao || S.partoEstimado(g) })).filter(x => x.parto >= t0 && x.parto <= addDays(t0, 30));
    const sanitary = db.famacha.filter(S.isHealthAlert);
    const males = act.filter(a => a.sexo === 'Macho').length;

    const alerts = [
      ...inCarencia.map(m => ({ tone: 'red', ic: 'syringe', title: `Carência: ${brinco(m.animalId)}`, desc: `${esc(S.animal(m.animalId)?.nome || '')} · até ${fmtDate(S.carenciaEnd(m))} (${Math.max(0, daysBetween(t0, S.carenciaEnd(m)))} dia(s) restante(s))` })),
      ...late.map(t => ({ tone: 'red', ic: 'alert', title: 'Tarefa atrasada', desc: `${esc(t.titulo)} · prevista para ${fmtDate(t.data)}` })),
      ...sanitary.map(x => ({ tone: 'amber', ic: 'heartPulse', title: `Atenção sanitária: ${brinco(x.animalId)}`, desc: `Famacha ${esc(x.valor)} · OPG ${esc(x.opg)} · ${fmtDate(x.data)}` })),
      ...births.map(x => ({ tone: 'green', ic: 'baby', title: `Parto próximo: ${brinco(x.g.animalId)}`, desc: `Previsão ${fmtDate(x.parto)}` })),
    ];
    const alertsHtml = alerts.length
      ? `<div class="alert-list">${alerts.slice(0, 7).map(x => `<div class="alert ${x.tone}"><span class="alert-icon">${icon(x.ic)}</span><div><strong>${x.title}</strong><span>${x.desc}</span></div></div>`).join('')}</div>${alerts.length > 7 ? `<p class="hint">Mostrando 7 de ${alerts.length} alertas.</p>` : ''}`
      : U.emptyState({ ic: 'circleCheck', title: 'Nenhum alerta no momento', text: 'Bom trabalho!' });

    const tasksHtml = pending.length
      ? `<div class="task-list">${pending.slice(0, 5).map(t => {
        const isLate = t.data < t0, a = S.animal(t.animalId);
        return `<div class="task-row"><div><strong>${esc(t.titulo)}</strong><small>${fmtDate(t.data)}${a ? ` · Brinco ${esc(a.brinco)}` : ''}</small></div>${U.pill(isLate ? 'Atrasada' : 'Pendente', isLate ? 'red' : 'amber')}</div>`;
      }).join('')}</div>`
      : U.emptyState({ ic: 'listChecks', title: 'Sem tarefas pendentes' });

    const months = lastMonths(6), labels = months.map(m => m.label);
    const born = (key, sexo) => db.animals.filter(a => a.nascimento?.startsWith(key) && a.sexo === sexo).length;
    const avgWeight = key => { const w = db.weights.filter(x => x.data.startsWith(key)); return w.length ? w.reduce((s, x) => s + x.peso, 0) / w.length : null; };

    return `${U.toolbar('Visão geral da propriedade', U.button('Exportar banco de dados (.xlsx)', { action: 'dashboard-export', tone: 'primary', ic: 'download' }))}
      <div class="grid three">
        ${U.group('Rebanho', [
          { ic: 'mars', label: 'Machos ativos', value: males },
          { ic: 'venus', label: 'Fêmeas ativas', value: act.length - males },
          { ic: 'layers', label: 'Cadastrados (inclui vendidos e mortos)', value: db.animals.length },
        ])}
      </div>
      <div class="grid tiles">
        ${U.tile({ label: 'Animais ativos', value: act.length, note: 'Rebanho atual', ic: 'paw', tone: 'green' })}
        ${U.tile({ label: 'Em carência', value: inCarencia.length, note: 'Aguardando liberação', ic: 'timer', tone: inCarencia.length ? 'red' : 'gray' })}
        ${U.tile({ label: 'Tarefas pendentes', value: pending.length, note: `${late.length} atrasada(s)`, ic: 'listChecks', tone: late.length ? 'amber' : 'gray' })}
      </div>
      <div class="grid two">
        ${U.panel('Painel de alertas', alertsHtml, `<span class="subtle">${alerts.length} alerta(s)</span>`)}
        ${U.panel('Próximas tarefas', tasksHtml, U.button('Ver tarefas', { href: '#/tarefas', small: true }))}
      </div>
      <div class="grid two">
        ${U.panel('Nascimentos · machos × fêmeas', U.barChart({ labels, a: { name: 'Machos', values: months.map(m => born(m.key, 'Macho')) }, b: { name: 'Fêmeas', values: months.map(m => born(m.key, 'Fêmea')) } }))}
        ${U.panel('Peso médio do rebanho', U.lineChart({ labels, series: [{ name: 'Peso médio (kg)', values: months.map(m => avgWeight(m.key)) }] }))}
      </div>
      <div class="grid two">
        ${U.group('Sanidade', [
          { ic: 'heartPulse', label: 'Registros com Famacha 4 ou 5', value: db.famacha.filter(x => x.valor >= 4).length },
          { ic: 'bug', label: 'Registros com OPG acima de 500', value: db.famacha.filter(x => x.opg > 500).length },
        ])}
        ${U.group('Reprodução e rotina', [
          { ic: 'baby', label: 'Fêmeas gestantes', value: pregnant.length },
          { ic: 'calendar', label: 'Partos em 30 dias', value: births.length },
          { ic: 'alert', label: 'Tarefas atrasadas', value: late.length },
        ])}
      </div>`;
  }

  /* ============================================================= Animais */
  function animalsView() {
    const filters = [['Todos', 'Todos'], ['Ativo', 'Ativos'], ['Vendido', 'Vendidos'], ['Morto', 'Mortos']];
    const count = f => (f === 'Todos' ? db.animals.length : db.animals.filter(a => a.status === f).length);
    const list = db.animals.filter(a => state.animalFilter === 'Todos' || a.status === state.animalFilter)
      .sort((a, b) => a.brinco.localeCompare(b.brinco, undefined, { numeric: true }));
    const seg = `<div class="segmented" role="group" aria-label="Filtrar por status">${filters.map(([v, l]) =>
      `<button type="button" data-action="animal-filter" data-id="${v}" aria-pressed="${state.animalFilter === v}" class="${state.animalFilter === v ? 'on' : ''}">${l}<small>${count(v)}</small></button>`).join('')}</div>`;
    const rows = list.map(a => [
      `<strong>${esc(a.brinco)}</strong>`, esc(a.nome || '—'), esc(a.sexo), fmtDate(a.nascimento), age(a.nascimento),
      U.pill(a.status, a.status === 'Ativo' ? 'green' : 'gray'),
      `<div class="row-actions">${U.rowBtn('Ficha', 'animal-profile', a.id, 'fileText')}${U.rowBtn('Exportar Excel', 'animal-export', a.id, 'download')}${U.rowBtn('Editar', 'animal-edit', a.id, 'pencil')}${U.rowBtn('Excluir', 'animal-delete', a.id, 'trash', 'danger')}</div>`,
    ]);
    const empty = db.animals.length
      ? { ic: 'paw', title: 'Nenhum animal neste filtro' }
      : { ic: 'paw', title: 'Nenhum animal cadastrado', text: 'Cadastre o primeiro animal do rebanho.', action: addBtn('Novo animal', 'animal-new') };
    return `${U.toolbar('Rebanho cadastrado', `${U.button('Relatório completo Excel', { action: 'animals-export-all', tone: 'primary', ic: 'fileSpreadsheet' })}${addBtn('Novo animal', 'animal-new')}`)}${db.animals.length ? seg : ''}
      <section class="card panel flush">${U.table(['Brinco', 'Nome', 'Sexo', 'Nascimento', 'Idade', 'Status', ''], rows, empty)}</section>`;
  }

  function animalForm(a = {}) {
    U.openModal(a.id ? 'Editar animal' : 'Novo animal', `<form data-form="animal" data-id="${esc(a.id || '')}" novalidate>
      <div class="form-grid">
        ${U.field({ label: 'Brinco *', name: 'brinco', value: a.brinco, required: true })}
        ${U.field({ label: 'Nome', name: 'nome', value: a.nome })}
        ${U.select({ label: 'Sexo', name: 'sexo', options: ['Macho', 'Fêmea'], value: a.sexo || 'Fêmea' })}
        ${U.field({ label: 'Raça', name: 'raca', value: a.raca || '' })}
        ${U.field({ label: 'Categoria', name: 'categoria', value: a.categoria || '' })}
        ${U.field({ label: 'Lote', name: 'lote', value: a.lote || '' })}
        ${U.field({ label: 'Origem / procedência', name: 'origem', value: a.origem || '' })}
        ${U.field({ label: 'Nascimento', name: 'nascimento', value: a.nascimento, type: 'date' })}
        ${U.field({ label: 'Data de entrada na propriedade', name: 'dataEntrada', value: a.dataEntrada || '', type: 'date' })}
        ${U.field({ label: 'Data de saída (venda/óbito)', name: 'dataSaida', value: a.dataSaida || '', type: 'date' })}
        ${U.field({ label: 'Peso ao nascer (kg)', name: 'pesoNascer', value: a.pesoNascer, type: 'number' })}
        ${U.field({ label: 'Data do desmame', name: 'dataDesmame', value: a.dataDesmame, type: 'date' })}
        ${U.field({ label: 'Peso do desmame (kg)', name: 'pesoDesmame', value: a.pesoDesmame, type: 'number' })}
        ${U.select({ label: 'Status', name: 'status', options: ['Ativo', 'Vendido', 'Morto'], value: a.status || 'Ativo' })}
        <div class="field full"><label for="f-obs">Observações</label><textarea id="f-obs" name="obs" rows="3">${esc(a.obs || '')}</textarea></div>
      </div>${formActions('Salvar animal')}</form>`);
  }

  function profile(id) {
    const a = S.animal(id); if (!a) return;
    const med = S.latest(db.meds, id), fam = S.latest(db.famacha, id), g = S.latest(db.gest, id);
    const weights = S.weightsOf(id).reverse(), preg = g?.resultado === 'positivo';
    const reproductiveHistory = db.gest.filter(x => x.animalId === id || x.reprodutorId === id).sort((x,y) => (y.cobertura || '').localeCompare(x.cobertura || ''));
    const items = [
      ['Nome', a.nome || '—'], ['Sexo', a.sexo], ['Status', a.status], ['Nascimento', fmtDate(a.nascimento)], ['Idade', age(a.nascimento)],
      ['Raça', a.raca || '—'], ['Categoria', a.categoria || '—'], ['Lote', a.lote || '—'],
      ['Origem / procedência', a.origem || '—'],
      ['Peso ao nascer', a.pesoNascer ? `${fmt(a.pesoNascer)} kg` : '—'], ['Desmame', fmtDate(a.dataDesmame)],
      ['Peso no desmame', a.pesoDesmame ? `${fmt(a.pesoDesmame)} kg` : '—'],
    ];
    const line = (k, v) => `<div class="list-row"><span class="row-label">${k}</span><strong class="row-value wrap">${v}</strong></div>`;
    U.openModal(`Ficha · Brinco ${esc(a.brinco)}`, `
      <div class="profile-grid">${items.map(([k, v]) => `<div class="profile-item"><small>${k}</small><strong>${esc(v)}</strong></div>`).join('')}</div>
      <h3 class="group-title">Sanidade e reprodução</h3>
      <div class="card list inset">
        ${line('Última medicação', med ? `${esc(med.medicamento)} · ${fmtDate(med.data)} ${esc(med.hora || '')}` : 'Sem registro')}
        ${line('Carência', S.isCarencia(med) ? `Até ${fmtDate(S.carenciaEnd(med))} · ${daysBetween(today(), S.carenciaEnd(med))} dia(s) restante(s)` : 'Sem carência ativa')}
        ${line('Último Famacha / OPG', fam ? `Famacha ${esc(fam.valor)} · OPG ${esc(fam.opg)} · ${fmtDate(fam.data)}` : 'Sem registro')}
        ${line('Gestação', g ? `${esc(g.resultado)} · cobertura ${fmtDate(g.cobertura)}${preg ? ` · parto estimado ${fmtDate(g.previsao || S.partoEstimado(g))}` : ''}` : 'Sem registro')}
      </div>
      <h3 class="group-title">Histórico reprodutivo</h3>
      <div class="card panel flush inset">${U.table(['Papel','Fêmea','Reprodutor','Data','Tipo','Resultado'], reproductiveHistory.map(x => { const female=S.animal(x.animalId), male=S.animal(x.reprodutorId); return [x.animalId === id ? 'Matriz' : 'Reprodutor', esc(female?.brinco || '—'), esc(male?.brinco || 'Não informado'), fmtDate(x.cobertura), esc(x.tipoReproducao || 'Monta natural'), U.pill(x.resultado || 'pendente', gestTone(x.resultado))]; }), { ic: 'baby', title: 'Sem histórico reprodutivo' })}</div>
      <h3 class="group-title">Histórico de pesagens</h3>
      <div class="card panel flush inset">${U.table(['Data', 'Peso (kg)'], weights.map(w => [fmtDate(w.data), `<strong>${fmt(w.peso)}</strong>`]), { ic: 'scale', title: 'Sem pesagens registradas' })}</div>
      <p class="hint">Observações: ${esc(a.obs || 'Nenhuma')}</p>
      <h3 class="group-title">Histórico completo de medicações</h3>
      <div class="card panel flush inset">${U.table(['Data', 'Hora', 'Produto', 'Dose', 'Responsável'], db.meds.filter(m => m.animalId === id).sort((x,y) => (x.data+x.hora).localeCompare(y.data+y.hora)).map(m => [fmtDate(m.data), esc(m.hora || '—'), esc(m.medicamento), esc(`${m.dose || ''} ${m.unidade || ''}`.trim()), esc(m.responsavel || '—')]), { ic: 'syringe', title: 'Sem medicações registradas' })}</div>
      <div class="form-actions">${U.button('Exportar ficha Excel', { action: 'animal-export', id, tone: 'primary', ic: 'download' })}${U.button('Editar animal', { action: 'animal-edit', id, ic: 'pencil' })}</div>`);
  }

  /* ============================================================ Pesagens */
  function pesagensView() {
    if (!db.animals.length) return `${U.toolbar('Controle de pesagens')}${noAnimalsState()}`;
    const id = S.animal(state.selectedAnimal) ? state.selectedAnimal : (S.activeAnimals()[0] || db.animals[0]).id;
    const a = S.animal(id), w = S.weightsOf(id).reverse();
    const months = lastMonths(12);
    const monthly = months.map(m => {
      const entries = w.filter(x => x.data.startsWith(m.key));
      return { ...m, entries, avg: entries.length ? entries.reduce((sum,x) => sum + Number(x.peso), 0) / entries.length : null };
    });
    // Cada pesagem cadastrada deve gerar seu próprio ponto no gráfico.
    // A versão anterior calculava uma média por mês; por isso, vários registros
    // no mesmo mês apareciam como um único ponto (e meses vazios não apareciam).
    const chartWeights = [...w].reverse(); // ordem cronológica: mais antigo → mais recente
    const chart = U.lineChart({
      full: true,
      labels: chartWeights.map(x => fmtDate(x.data)),
      series: [{
        name: `Pesagens · ${a.brinco}`,
        valueLabel: 'Peso registrado',
        values: chartWeights.map(x => Number(x.peso)),
        details: chartWeights.map((x, i) => {
          const previous = chartWeights[i - 1];
          const diff = previous ? Number(x.peso) - Number(previous.peso) : null;
          return `Brinco ${a.brinco}${x.hora ? ` · ${x.hora}` : ''}${diff === null ? '' : ` · Variação: ${diff > 0 ? '+' : ''}${fmt(diff)} kg`}`;
        })
      }],
    });
    const rows = w.map((x, i) => {
      const prev = w[i + 1];
      const diff = prev ? Number(x.peso) - Number(prev.peso) : null;
      return [`${fmtDate(x.data)} ${esc(x.hora || '')}`, esc(a.brinco), `<strong>${fmt(x.peso)} kg</strong>`, diff === null ? '—' : `${diff > 0 ? '+' : ''}${fmt(diff)} kg`];
    });
    const monthlyDetails = monthly.filter(m => m.entries.length).map(m =>
      `<details class="weight-month"><summary>${esc(m.label)} · ${m.entries.length} pesagem(ns) · média ${fmt(m.avg)} kg</summary>
        ${U.table(['Data', 'Peso', 'Diferença'], m.entries.map(x => {
          const idx = w.findIndex(y => y.id === x.id), prev = w[idx + 1], d = prev ? Number(x.peso)-Number(prev.peso) : null;
          return [fmtDate(x.data), `${fmt(x.peso)} kg`, d === null ? '—' : `${d > 0 ? '+' : ''}${fmt(d)} kg`];
        }), { title: 'Sem registros' })}
      </details>`).join('');
    return `${U.toolbar('Controle de pesagens', `${U.button('Exportar animal', { action: 'weights-export-selected', tone: 'primary', ic: 'download' })}${U.button('Exportar todas', { action: 'weights-export', ic: 'fileSpreadsheet' })}${addBtn('Registrar pesagem', 'weight-new')}`)}
      <section class="card panel"><div class="form-grid">
        ${U.select({ label: 'Animal selecionado', name: 'animal', id: 'weightAnimal', options: U.animalOptions(db.animals), value: id, attrs: 'data-change="weight-animal"' })}
        <div class="readout"><small>Total de pesagens</small><strong>${w.length}</strong></div>
        <div class="readout"><small>Último peso registrado</small><strong>${w.length ? `${fmt(w[0].peso)} kg` : '—'}</strong></div>
      </div></section>
      ${U.panel('Evolução mensal do peso · passe o mouse ou clique nos pontos', chart)}
      ${monthlyDetails ? U.panel('Detalhamento mensal', monthlyDetails) : ''}
      <section class="card panel flush">${U.table(['Data', 'Brinco', 'Peso', 'Diferença para pesagem anterior'], rows, { ic: 'scale', title: 'Nenhuma pesagem para este animal', action: addBtn('Registrar pesagem', 'weight-new') })}</section>`;
  }

  function weightForm() {
    if (needAnimals()) return;
    U.openModal('Registrar pesagem', `<form data-form="weight" novalidate><div class="form-grid">
      ${U.select({ label: 'Animal', name: 'animalId', options: U.animalOptions(db.animals), value: state.selectedAnimal || db.animals[0].id })}
      ${U.field({ label: 'Data', name: 'data', value: today(), type: 'date', required: true })}
      ${U.field({ label: 'Hora (opcional)', name: 'hora', value: new Date().toTimeString().slice(0,5), type: 'time' })}
      ${U.field({ label: 'Peso (kg)', name: 'peso', type: 'number', required: true })}
    </div>${formActions('Registrar')}</form>`);
  }

  /* ========================================================== Medicações */
  function medicacoesView() {
    const f = state.medFilters;
    const hist = db.meds.filter(m => (!f.animalId || m.animalId === f.animalId)
      && (!f.medicamento || (m.medicamento || '').toLowerCase().includes(f.medicamento.toLowerCase()))
      && (!f.responsavel || (m.responsavel || '').toLowerCase().includes(f.responsavel.toLowerCase()))
      && (!f.inicio || m.data >= f.inicio) && (!f.fim || m.data <= f.fim))
      .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
    const empty = { ic: 'syringe', title: 'Nenhuma medicação encontrada', action: addBtn('Registrar medicação', 'med-new') };
    const rows = hist.map(m => [
      fmtDate(m.data), esc(m.hora || '—'), `<strong>${esc(S.animal(m.animalId)?.brinco || '—')}</strong>`,
      esc(m.medicamento), esc(`${m.dose || ''} ${m.unidade || ''}`.trim()), esc(m.finalidade || '—'),
      esc(m.responsavel || '—'), esc(m.carencia || 0)
    ]);
    return `${U.toolbar('Controle de medicações', `${U.button('Exportar filtrado', { action: 'meds-export', tone: 'primary', ic: 'download' })}${U.button('Exportar tudo', { action: 'meds-export-all', ic: 'fileSpreadsheet' })}${addBtn('Registrar medicação', 'med-new')}`)}
      <section class="card panel"><div class="form-grid">
        ${U.select({ label: 'Animal', name: 'medAnimal', options: [{ value: '', label: 'Todos os animais' }, ...U.animalOptions(db.animals)], value: f.animalId, attrs: 'data-change="med-animal"' })}
        ${U.field({ label: 'Medicação', name: 'medSearch', value: f.medicamento, placeholder: 'Filtrar pelo produto' }).replace('name="medSearch"', 'name="medSearch" data-change="med-search"')}
        ${U.field({ label: 'Responsável', name: 'medResponsible', value: f.responsavel, placeholder: 'Quem aplicou' }).replace('name="medResponsible"', 'name="medResponsible" data-change="med-responsible"')}
        ${U.field({ label: 'De', name: 'medStart', value: f.inicio, type: 'date' }).replace('name="medStart"', 'name="medStart" data-change="med-start"')}
        ${U.field({ label: 'Até', name: 'medEnd', value: f.fim, type: 'date' }).replace('name="medEnd"', 'name="medEnd" data-change="med-end"')}
      </div><div class="form-actions">${U.button('Limpar filtros', { action: 'med-filters-clear' })}<span class="subtle">${hist.length} registro(s) encontrado(s)</span></div></section>
      ${U.panel('Histórico de aplicações', U.table(['Data', 'Hora', 'Brinco', 'Medicação', 'Dosagem', 'Finalidade', 'Quem aplicou', 'Carência (dias)'], rows, empty), '', { flush: true })}`;
  }

  function medicationForm() {
    if (needAnimals()) return;
    U.openModal('Registrar aplicação / medicação', `<form data-form="med" novalidate><div class="form-grid">
      ${U.select({ label: 'Animal', name: 'animalId', options: U.animalOptions(db.animals), value: state.selectedAnimal || db.animals[0].id })}
      ${U.field({ label: 'Data da aplicação', name: 'data', value: today(), type: 'date', required: true })}
      ${U.field({ label: 'Hora da aplicação', name: 'hora', value: new Date().toTimeString().slice(0,5), type: 'time', required: true })}
      ${U.field({ label: 'Medicação / produto', name: 'medicamento', required: true })}
      ${U.field({ label: 'Dosagem', name: 'dose', required: true, placeholder: 'Ex.: 5' })}
      ${U.select({ label: 'Unidade', name: 'unidade', options: ['ml', 'mg', 'g', 'comprimido(s)', 'dose(s)', 'outro'], value: 'ml' })}
      ${U.field({ label: 'Finalidade / motivo', name: 'finalidade', required: true })}
      ${U.field({ label: 'Responsável pela aplicação', name: 'responsavel', required: true })}
      ${U.field({ label: 'Carência (dias)', name: 'carencia', value: '0', type: 'number' })}
      <div class="field full"><label for="f-observacoes">Observações</label><textarea id="f-observacoes" name="observacoes" rows="3"></textarea></div>
    </div>${formActions('Salvar aplicação')}</form>`);
  }

  /* ======================================================== Famacha / OPG */
  function famachaView() {
    const rows = db.famacha.slice().sort((a, b) => b.data.localeCompare(a.data));
    const bad = rows.filter(S.isHealthAlert);
    const alerts = bad.length
      ? `<div class="alert-list">${bad.map(x => `<div class="alert red"><span class="alert-icon">${icon('heartPulse')}</span><div><strong>Brinco ${brinco(x.animalId)} · ${fmtDate(x.data)}</strong><span>Famacha ${esc(x.valor)} · OPG ${esc(x.opg)}. Avaliação e conduta devem ser definidas pelo responsável técnico.</span></div></div>`).join('')}</div>`
      : U.emptyState({ ic: 'circleCheck', title: 'Nenhum exame em faixa de alerta' });
    return `${U.toolbar('Monitoramento sanitário', addBtn('Registrar exame', 'fam-new'))}
      ${U.panel('Alertas sanitários', alerts)}
      ${U.panel('Exames registrados', U.table(['Data', 'Brinco', 'Animal', 'Famacha', 'OPG', 'Resultado'],
        rows.map(x => [fmtDate(x.data), `<strong>${brinco(x.animalId)}</strong>`, esc(S.animal(x.animalId)?.nome || '—'),
          U.pill(x.valor, x.valor >= 4 ? 'red' : 'gray'), U.pill(x.opg, x.opg > 500 ? 'amber' : 'gray'),
          S.isHealthAlert(x) ? 'Atenção' : 'Dentro dos limites de alerta']),
        { ic: 'heartPulse', title: 'Nenhum exame registrado', action: addBtn('Registrar exame', 'fam-new') }), '', { flush: true })}`;
  }

  function famachaForm() {
    if (needAnimals()) return;
    U.openModal('Novo exame Famacha / OPG', `<form data-form="famacha" novalidate><div class="form-grid">
      ${U.select({ label: 'Animal', name: 'animalId', options: U.animalOptions(db.animals), value: state.selectedAnimal || db.animals[0].id })}
      ${U.field({ label: 'Data', name: 'data', value: today(), type: 'date', required: true })}
      ${U.select({ label: 'Famacha', name: 'valor', options: ['1', '2', '3', '4', '5'], value: '1' })}
      ${U.field({ label: 'OPG', name: 'opg', value: '0', type: 'number' })}
    </div>${formActions('Salvar exame')}</form>`);
  }

  /* ============================================================ Gestação */
  const gestTone = r => (r === 'positivo' ? 'green' : r === 'abortada' ? 'red' : r === 'negativo' ? 'gray' : 'amber');

  function gestView() {
    const ordered = db.gest.slice().sort((a, b) => b.cobertura.localeCompare(a.cobertura));
    const active = ordered.filter(g => g.resultado !== 'abortada');
    const aborted = ordered.filter(g => g.resultado === 'abortada');
    const rows = active.map(g => {
      const p = g.previsao || S.partoEstimado(g), n = daysBetween(today(), p);
      const remain = n > 0 ? `${Math.floor(n / 30)} mês(es) e ${n % 30} dia(s)` : 'Data prevista já passou';
      const sire = S.animal(g.reprodutorId);
      return [`<strong>${esc(label(g.animalId))}</strong>`, sire ? `${esc(sire.brinco)}${sire.nome ? ` · ${esc(sire.nome)}` : ''}` : 'Não informado', fmtDate(g.cobertura), esc(g.tipoReproducao || 'Monta natural'), fmtDate(g.diagnostico), U.pill(g.resultado, gestTone(g.resultado)), fmtDate(g.previsao || p), g.resultado === 'positivo' ? remain : '—', `<div class="row-actions">${U.rowBtn('Editar', 'gest-edit', g.id, 'pencil')}</div>`];
    });
    const abortedRows = aborted.map(g => {
      const sire = S.animal(g.reprodutorId);
      return [`<strong>${esc(label(g.animalId))}</strong>`, sire ? `${esc(sire.brinco)}${sire.nome ? ` · ${esc(sire.nome)}` : ''}` : 'Não informado', fmtDate(g.cobertura), fmtDate(g.dataAborto), U.pill('Aborto registrado', 'red'), esc(g.observacoes || '—'), `<div class="row-actions">${U.rowBtn('Editar', 'gest-edit', g.id, 'pencil')}</div>`];
    });
    return `${U.toolbar('Acompanhamento reprodutivo', `${U.button('Relatório gestação Excel', { action: 'gest-export', tone: 'secondary', ic: 'fileSpreadsheet' })}${addBtn('Registrar cobertura', 'gest-new')}`)}
      <section class="card panel flush">${U.table(['Fêmea', 'Reprodutor utilizado', 'Cobertura', 'Tipo', 'Diagnóstico', 'Resultado', 'Parto estimado', 'Previsão', 'Ação'], rows,
        { ic: 'baby', title: 'Nenhuma gestação em acompanhamento', action: addBtn('Registrar cobertura', 'gest-new') })}</section>
      ${U.panel('Histórico de abortos', U.table(['Fêmea', 'Reprodutor', 'Cobertura', 'Data do aborto', 'Situação', 'Observações', 'Ação'], abortedRows, { ic: 'heartCrack', title: 'Nenhum aborto registrado' }), '', { flush: true })}
      <p class="hint">Use o botão Editar para alterar o resultado (pendente, positivo ou negativo), datas, reprodutor e demais informações do registro. A previsão considera 150 dias após a cobertura.</p>`;
  }

  function gestForm(id = '') {
    const g = id ? db.gest.find(x => x.id === id) : null;
    if (id && !g) return U.toast('Gestação não encontrada.', 'error');
    const females = db.animals.filter(a => a.sexo === 'Fêmea');
    const males = db.animals.filter(a => a.sexo === 'Macho');
    if (!females.length) { U.toast('Cadastre uma fêmea primeiro.', 'error'); location.hash = '#/animais'; return; }
    U.openModal(g ? 'Editar gestação' : 'Registrar cobertura / diagnóstico', `<form data-form="gest" data-id="${esc(g?.id || '')}" novalidate><div class="form-grid">
      ${U.select({ label: 'Fêmea', name: 'animalId', options: U.animalOptions(females), value: g?.animalId || females[0].id })}
      ${U.select({ label: 'Reprodutor utilizado', name: 'reprodutorId', options: [{ value: '', label: 'Não informado' }, ...U.animalOptions(males)], value: g?.reprodutorId || '' })}
      ${U.select({ label: 'Tipo de reprodução', name: 'tipoReproducao', options: ['Monta natural', 'Inseminação artificial'], value: g?.tipoReproducao || 'Monta natural' })}
      ${U.field({ label: 'Data da cobertura / IA', name: 'cobertura', value: g?.cobertura || today(), type: 'date', required: true })}
      ${U.field({ label: 'Previsão de parto', name: 'previsao', value: g?.previsao || '', type: 'date' })}
      ${U.field({ label: 'Data do diagnóstico', name: 'diagnostico', value: g?.diagnostico || '', type: 'date' })}
      ${U.select({ label: 'Resultado / situação', name: 'resultado', options: ['pendente', 'positivo', 'negativo', 'abortada'], value: g?.resultado || 'pendente' })}
      ${U.field({ label: 'Data do aborto (se aplicável)', name: 'dataAborto', value: g?.dataAborto || '', type: 'date' })}
      ${U.field({ label: 'Observações', name: 'observacoes', value: g?.observacoes || '', full: true })}
    </div>${formActions(g ? 'Salvar alterações' : 'Salvar registro')}</form>`);
  }

  /* ============================================================= Tarefas */
  function tasksView() {
    const planned = db.tasks.filter(t => t.status !== 'Feita').sort((a, b) => a.data.localeCompare(b.data));
    const done = db.tasks.filter(t => t.status === 'Feita').sort((a, b) => (b.concluidaEm || '').localeCompare(a.concluidaEm || ''));
    return `${U.toolbar('Tarefas da propriedade', addBtn('Nova tarefa', 'task-new'))}
      ${U.panel('Planejadas', U.table(['Tarefa', 'Data prevista', 'Animal', 'Status', ''],
        planned.map(t => {
          const late = t.data < today();
          return [`<strong>${esc(t.titulo)}</strong>`, fmtDate(t.data), brinco(t.animalId), U.pill(late ? 'Atrasada' : 'Planejada', late ? 'red' : 'amber'),
            `<div class="row-actions">${U.button('Marcar feita', { action: 'task-done', id: t.id, ic: 'check', small: true })}</div>`];
        }), { ic: 'listChecks', title: 'Nenhuma tarefa planejada', action: addBtn('Nova tarefa', 'task-new') }), '', { flush: true })}
      ${U.panel('Realizadas', U.table(['Tarefa', 'Data prevista', 'Concluída em', 'Animal'],
        done.map(t => [esc(t.titulo), fmtDate(t.data), new Date(t.concluidaEm).toLocaleString('pt-BR'), brinco(t.animalId)]),
        { ic: 'circleCheck', title: 'Nenhuma tarefa concluída ainda' }), '', { flush: true })}`;
  }

  function taskForm() {
    U.openModal('Planejar tarefa', `<form data-form="task" novalidate><div class="form-grid">
      ${U.field({ label: 'Descrição da tarefa *', name: 'titulo', required: true, full: true })}
      ${U.field({ label: 'Data prevista', name: 'data', value: today(), type: 'date', required: true })}
      ${U.select({ label: 'Animal (opcional)', name: 'animalId', options: [{ value: '', label: 'Nenhum' }, ...U.animalOptions(db.animals)], value: '' })}
    </div>${formActions('Criar tarefa')}</form>`);
  }

  /* ========================================================== Formulários */
  function formActions(submitLabel) {
    return `<div class="form-actions">${U.button('Cancelar', { action: 'modal-close' })}<button type="submit" class="btn primary"><span>${submitLabel}</span></button></div>`;
  }

  /** Persiste, fecha o modal, redesenha e avisa. */
  function commit(msg, { modal = true } = {}) {
    if (!S.save()) { U.toast('Não foi possível salvar: o armazenamento do navegador recusou os dados.', 'error'); return false; }
    if (modal) U.closeModal();
    rerender();
    U.toast(msg);
    return true;
  }

  const num = v => (v === '' || v == null ? null : Number(v));
  const animalById = id => S.animal(id);

  const forms = {
    animal(f, form) {
      const id = form.dataset.id, code = f.brinco.trim();
      if (!code) return U.toast('Informe o número do brinco.', 'error');
      if (db.animals.some(x => x.brinco.toLowerCase() === code.toLowerCase() && x.id !== id)) return U.toast('Este brinco já está cadastrado.', 'error');
      const obj = { ...(id ? S.animal(id) : {}), ...f, id: id || uid(), brinco: code, nome: f.nome.trim(), pesoNascer: num(f.pesoNascer), pesoDesmame: num(f.pesoDesmame), raca: (f.raca || '').trim(), categoria: (f.categoria || '').trim(), lote: (f.lote || '').trim(), origem: (f.origem || '').trim() };
      if (id) db.animals = db.animals.map(x => (x.id === id ? obj : x)); else db.animals.push(obj);
      commit('Cadastro salvo com sucesso.');
    },
    weight(f) {
      if (!animalById(f.animalId)) return U.toast('Selecione um animal.', 'error');
      if (!f.data || f.peso === '' || Number(f.peso) <= 0) return U.toast('Informe a data e um peso válido.', 'error');
      db.weights.push({ id: uid(), animalId: f.animalId, data: f.data, hora: f.hora || '', peso: Number(f.peso) });
      state.selectedAnimal = f.animalId;
      commit('Pesagem registrada.');
    },
    med(f) {
      if (!animalById(f.animalId)) return U.toast('Selecione um animal.', 'error');
      if (!f.data || !f.hora || !f.medicamento.trim() || !f.dose.trim() || !f.finalidade.trim() || !f.responsavel.trim()) return U.toast('Preencha animal, data, hora, medicação, dosagem, finalidade e responsável.', 'error');
      db.meds.push({ id: uid(), animalId: f.animalId, data: f.data, hora: f.hora || '', medicamento: f.medicamento.trim(), dose: f.dose.trim(), unidade: f.unidade || '', finalidade: (f.finalidade || '').trim(), responsavel: (f.responsavel || '').trim(), observacoes: (f.observacoes || '').trim(), carencia: Number(f.carencia || 0), criadoEm: new Date().toISOString(), alteracoes: [] });
      commit('Medicação registrada.');
    },
    famacha(f) {
      if (!animalById(f.animalId)) return U.toast('Selecione um animal.', 'error');
      if (!f.data) return U.toast('Informe a data do exame.', 'error');
      db.famacha.push({ id: uid(), animalId: f.animalId, data: f.data, valor: Number(f.valor), opg: Number(f.opg || 0) });
      commit('Exame registrado.');
    },
    gest(f, form) {
      if (!animalById(f.animalId) || animalById(f.animalId).sexo !== 'Fêmea') return U.toast('Selecione uma fêmea válida.', 'error');
      if (!f.cobertura) return U.toast('Informe a data da cobertura.', 'error');
      if (f.reprodutorId && (!animalById(f.reprodutorId) || animalById(f.reprodutorId).sexo !== 'Macho')) return U.toast('Selecione um reprodutor macho válido.', 'error');
      const id = form.dataset.id;
      const values = { animalId: f.animalId, reprodutorId: f.reprodutorId || '', tipoReproducao: f.tipoReproducao || 'Monta natural', cobertura: f.cobertura, diagnostico: f.diagnostico || '', previsao: f.previsao || '', resultado: f.resultado || 'pendente', observacoes: (f.observacoes || '').trim(), dataAborto: f.dataAborto || '' };
      if (id) {
        const index = db.gest.findIndex(x => x.id === id);
        if (index < 0) return U.toast('Gestação não encontrada.', 'error');
        db.gest[index] = { ...db.gest[index], ...values };
        commit('Gestação atualizada com sucesso.');
      } else {
        db.gest.push({ id: uid(), ...values });
        commit('Gestação registrada.');
      }
    },
    task(f) {
      if (!f.titulo.trim()) return U.toast('Descreva a tarefa.', 'error');
      if (!f.data) return U.toast('Informe a data prevista.', 'error');
      db.tasks.push({ id: uid(), titulo: f.titulo.trim(), data: f.data, animalId: f.animalId || '', status: 'Pendente', concluidaEm: '' });
      commit('Tarefa planejada.');
    },
  };


  /* ======================================================== Exportações Excel */
  function excelReady() {
    if (!window.XLSX) {
      U.toast('Biblioteca Excel indisponível. Verifique sua conexão e recarregue a página.', 'error');
      return false;
    }
    return true;
  }
  const excelDate = value => value ? new Date(`${value}T12:00:00`) : '';
  function makeSheet(rows, widths, dateColumns = []) {
    const ws = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
    ws['!cols'] = widths.map(w => ({ wch: w }));
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
    if (rows.length > 1) ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: rows[0].length - 1 } }) };
    const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: '426344' } }, alignment: { vertical: 'center', horizontal: 'left' } };
    for (let c = 0; c < rows[0].length; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) cell.s = headerStyle;
    }
    dateColumns.forEach(c => {
      for (let r = 1; r < rows.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.v instanceof Date) cell.z = 'dd/mm/yyyy';
      }
    });
    ws['!rows'] = [{ hpt: 24 }];
    return ws;
  }
  function saveWorkbook(wb, filename) {
    XLSX.writeFile(wb, filename, { bookType: 'xlsx', compression: true });
    U.toast('Planilha Excel gerada com sucesso.');
  }
  function animalIdentity(a) {
    return [
      ['Campo', 'Informação'],
      ['Nome / identificação', a.nome || '—'],
      ['Número do brinco', a.brinco || '—'],
      ['Raça', a.raca || '—'],
      ['Sexo', a.sexo || '—'],
      ['Data de nascimento', a.nascimento ? excelDate(a.nascimento) : '—'],
      ['Idade na exportação', age(a.nascimento)],
      ['Categoria', a.categoria || '—'],
      ['Lote', a.lote || '—'],
      ['Origem / procedência', a.origem || '—'],
      ['Status', a.status || '—'],
      ['Peso ao nascer (kg)', a.pesoNascer ?? '—'],
      ['Data do desmame', a.dataDesmame ? excelDate(a.dataDesmame) : '—'],
      ['Peso no desmame (kg)', a.pesoDesmame ?? '—'],
      ['Observações', a.obs || '—'],
      ['Exportado em', new Date().toLocaleString('pt-BR')]
    ];
  }
  function weightRows(list) {
    const ordered = list.slice().sort((a,b) => (a.data || '').localeCompare(b.data || '') || (a.hora || '').localeCompare(b.hora || ''));
    return [['Data', 'Hora', 'Animal', 'Brinco', 'Categoria', 'Lote', 'Peso (kg)', 'Peso anterior (kg)', 'Diferença (kg)'],
      ...ordered.map((w, i) => {
        const a = S.animal(w.animalId), prev = ordered.slice(0, i).filter(x => x.animalId === w.animalId).at(-1);
        return [excelDate(w.data), w.hora || '', a?.nome || '', a?.brinco || '', a?.categoria || '', a?.lote || '', Number(w.peso), prev ? Number(prev.peso) : '', prev ? Number((Number(w.peso)-Number(prev.peso)).toFixed(2)) : ''];
      })];
  }
  function medicationRows(list) {
    return [['Animal', 'Brinco', 'Medicação / produto', 'Dosagem', 'Unidade', 'Finalidade', 'Responsável pela aplicação', 'Data', 'Hora', 'Carência (dias)', 'Observações'],
      ...list.slice().sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora)).map(m => {
        const a = S.animal(m.animalId);
        return [a?.nome || '', a?.brinco || '', m.medicamento || '', m.dose || '', m.unidade || '', m.finalidade || '', m.responsavel || '', excelDate(m.data), m.hora || '', Number(m.carencia || 0), m.observacoes || ''];
      })];
  }
  function exportWeights(selectedOnly = false) {
    if (!excelReady()) return;
    const selected = S.animal(state.selectedAnimal) ? state.selectedAnimal : (S.activeAnimals()[0] || {}).id;
    const list = selectedOnly && selected ? db.weights.filter(w => w.animalId === selected) : db.weights;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, makeSheet(weightRows(list), [14,10,22,16,18,16,14,18,16], [0]), 'PESAGENS');
    const animal = selectedOnly ? S.animal(selected) : null;
    saveWorkbook(wb, `Relatorio_Pesagens_${animal ? 'Brinco_' + animal.brinco + '_' : ''}${today()}.xlsx`);
  }
  function exportMeds(filtered = true) {
    if (!excelReady()) return;
    const f = state.medFilters;
    const list = filtered ? db.meds.filter(m => (!f.animalId || m.animalId === f.animalId)
      && (!f.medicamento || (m.medicamento || '').toLowerCase().includes(f.medicamento.toLowerCase()))
      && (!f.responsavel || (m.responsavel || '').toLowerCase().includes(f.responsavel.toLowerCase()))
      && (!f.inicio || m.data >= f.inicio) && (!f.fim || m.data <= f.fim)) : db.meds;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, makeSheet(medicationRows(list), [22,16,26,14,14,24,28,14,10,16,36], [7]), 'MEDICACOES');
    saveWorkbook(wb, `Relatorio_Medicacoes_${filtered ? 'Filtrado_' : ''}${today()}.xlsx`);
  }
  function exportAnimalSheet(id) {
    if (!excelReady()) return;
    const a = S.animal(id);
    if (!a) return U.toast('Animal não encontrado.', 'error');
    const weights = db.weights.filter(w => w.animalId === id);
    const meds = db.meds.filter(m => m.animalId === id);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, makeSheet(animalIdentity(a), [28, 46], [1]), 'IDENTIFICACAO');
    XLSX.utils.book_append_sheet(wb, makeSheet(weightRows(weights), [14,10,22,16,18,16,14,18,16], [0]), 'PESAGENS');
    XLSX.utils.book_append_sheet(wb, makeSheet(medicationRows(meds), [22,16,26,14,14,24,28,14,10,16,36], [7]), 'MEDICACOES');
    const safe = String(a.brinco || id).replace(/[^a-z0-9_-]/gi, '_');
    saveWorkbook(wb, `Ficha_Animal_Brinco_${safe}.xlsx`);
  }


  function animalRows(list) {
    return [['Brinco','Nome','Raça','Sexo','Nascimento','Idade','Categoria','Lote','Origem','Status','Data de entrada','Data de saída','Observações'],
      ...list.map(a => [a.brinco || '', a.nome || '', a.raca || '', a.sexo || '', excelDate(a.nascimento), age(a.nascimento), a.categoria || '', a.lote || '', a.origem || '', a.status || 'Ativo', excelDate(a.dataEntrada), excelDate(a.dataSaida), a.obs || ''])];
  }
  function gestationRows(list) {
    return [['Fêmea','Brinco da fêmea','Reprodutor','Brinco do reprodutor','Tipo','Cobertura / IA','Diagnóstico','Resultado','Previsão de parto','Data do aborto','Observações'],
      ...list.map(g => { const f=S.animal(g.animalId), m=S.animal(g.reprodutorId); return [f?.nome || '', f?.brinco || '', m?.nome || '', m?.brinco || '', g.tipoReproducao || '', excelDate(g.cobertura), excelDate(g.diagnostico), g.resultado || '', excelDate(g.previsao || S.partoEstimado(g)), excelDate(g.dataAborto), g.observacoes || '']; })];
  }

  // Relatório reprodutivo independente, com células editáveis no Excel.
  function exportGestationReport() {
    if (!excelReady()) return;
    const wb = XLSX.utils.book_new();
    const rows = [['Fêmea (nome)','Brinco da fêmea','Data da monta / IA','Reprodutor (nome)','Brinco do reprodutor','Tipo de reprodução','Data do diagnóstico (DG)','Resultado do DG','Previsão de parto','Data do aborto','Observações'],
      ...db.gest.slice().sort((a,b)=>(a.cobertura||'').localeCompare(b.cobertura||'')).map(g => {
        const f = S.animal(g.animalId), m = S.animal(g.reprodutorId);
        return [f?.nome || '', f?.brinco || '', excelDate(g.cobertura), m?.nome || '', m?.brinco || '', g.tipoReproducao || 'Monta natural', excelDate(g.diagnostico), g.resultado || 'pendente', excelDate(g.previsao || S.partoEstimado(g)), excelDate(g.dataAborto), g.observacoes || ''];
      })];
    XLSX.utils.book_append_sheet(wb, makeSheet(rows, [24,18,20,24,20,22,24,18,20,18,40], [2,6,8,9]));
    saveWorkbook(wb, `Relatorio_Gestacao_Campos_Araujo_${today()}.xlsx`);
  }
  function exportAllAnimals() {
    if (!excelReady()) return;
    const wb=XLSX.utils.book_new(), all=db.animals;
    XLSX.utils.book_append_sheet(wb, makeSheet(animalRows(all), [16,22,20,12,15,14,18,14,24,14,16,16,36], [4,10,11]), 'TODOS');
    [['ATIVOS','Ativo'],['VENDIDOS','Vendido'],['MORTOS','Morto']].forEach(([name,status]) => XLSX.utils.book_append_sheet(wb, makeSheet(animalRows(all.filter(a => a.status === status)), [16,22,20,12,15,14,18,14,24,14,16,16,36], [4,10,11]), name));
    saveWorkbook(wb, `Relatorio_Animais_Campos_Araujo_${today()}.xlsx`);
  }
  function exportDatabase() {
    if (!excelReady()) return;
    const wb=XLSX.utils.book_new();
    const append=(name, rows, widths, dates=[]) => XLSX.utils.book_append_sheet(wb, makeSheet(rows, widths, dates), name);
    append('RESUMO', [['Indicador','Quantidade'],['Total cadastrado',db.animals.length],['Ativos',db.animals.filter(a=>a.status==='Ativo').length],['Vendidos',db.animals.filter(a=>a.status==='Vendido').length],['Mortos',db.animals.filter(a=>a.status==='Morto').length],['Pesagens',db.weights.length],['Medicações',db.meds.length],['Registros reprodutivos',db.gest.length],['Exames Famacha / OPG',db.famacha.length],['Tarefas',db.tasks.length],['Exportado em',new Date().toLocaleString('pt-BR')]], [32,24]);
    append('ANIMAIS', animalRows(db.animals), [16,22,20,12,15,14,18,14,24,14,16,16,36], [4,10,11]);
    append('PESAGENS', weightRows(db.weights), [14,10,22,16,18,16,14,18,16], [0]);
    append('MEDICACOES', medicationRows(db.meds), [22,16,26,14,14,24,28,14,10,16,36], [7]);
    append('GESTACAO', gestationRows(db.gest), [22,16,22,18,22,16,16,14,18,16,36], [5,6,8,9]);
    append('FAMACHA_OPG', [['Animal','Brinco','Data','Famacha','OPG'], ...db.famacha.map(x=>{const a=S.animal(x.animalId);return [a?.nome||'',a?.brinco||'',excelDate(x.data),x.valor,x.opg];})], [22,16,14,12,14], [2]);
    append('TAREFAS', [['Tarefa','Data prevista','Animal','Brinco','Status','Concluída em'], ...db.tasks.map(t=>{const a=S.animal(t.animalId);return [t.titulo,excelDate(t.data),a?.nome||'',a?.brinco||'',t.status||'',t.concluidaEm||''];})], [32,16,22,16,16,24], [1]);
    saveWorkbook(wb, `Backup_Geral_Campos_Araujo_${today()}.xlsx`);
  }

  /* ============================================================== Ações */
  const actions = {
    'animal-new': () => animalForm(),
    'animal-edit': id => animalForm(S.animal(id)),
    'animal-profile': id => profile(id),
    'animal-export': id => exportAnimalSheet(id),
    'animals-export-all': () => exportAllAnimals(),
    'dashboard-export': () => exportDatabase(),
    'gest-export': () => exportGestationReport(),
    'weights-export': () => exportWeights(false),
    'weights-export-selected': () => exportWeights(true),
    'meds-export': () => exportMeds(true),
    'meds-export-all': () => exportMeds(false),
    'med-filters-clear': () => { state.medFilters = { animalId: '', medicamento: '', responsavel: '', inicio: '', fim: '' }; rerender(); },
    async 'animal-delete'(id) {
      const a = S.animal(id); if (!a) return;
      const ok = await U.confirmDialog({ title: `Excluir o animal ${a.brinco}?`, text: 'Todos os registros vinculados a ele (pesagens, medicações, exames, gestações e tarefas) também serão excluídos. Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true });
      if (!ok) return;
      S.removeAnimal(id);
      commit('Animal e registros vinculados excluídos.');
    },
    'animal-filter': v => { state.animalFilter = v; rerender(); },
    'weight-new': weightForm,
    'med-new': medicationForm,
    'fam-new': famachaForm,
    'gest-new': () => gestForm(),
    'gest-edit': id => gestForm(id),
    'task-new': taskForm,
    'task-done'(id) {
      const t = db.tasks.find(x => x.id === id); if (!t) return;
      t.status = 'Feita'; t.concluidaEm = new Date().toISOString();
      commit('Tarefa concluída.', { modal: false });
    },
  };

  const changes = {
    'weight-animal': el => { state.selectedAnimal = el.value; rerender(); },
    'med-animal': el => { state.medFilters.animalId = el.value; rerender(); },
    'med-search': el => { state.medFilters.medicamento = el.value; rerender(); },
    'med-responsible': el => { state.medFilters.responsavel = el.value; rerender(); },
    'med-start': el => { state.medFilters.inicio = el.value; rerender(); },
    'med-end': el => { state.medFilters.fim = el.value; rerender(); },
  };

  const screens = { dashboard, animais: animalsView, pesagens: pesagensView, medicacoes: medicacoesView, famacha: famachaView, gestacao: gestView, tarefas: tasksView };

  CA.views = { NAV, screens, actions, changes, forms, profile };
})();
