/* Chart.js com a identidade do site (verde #426344 + areia #D6C8A8).
   Uso nas telas:
     var c = AppCharts.colors();                       // cores do tema atual
     AppCharts.make(canvas, { type: 'bar', data: {...}, options: {...} });
   As cores mudam sozinhas quando o tema claro/escuro é trocado. */
(function () {
  'use strict';
  if (!window.Chart) return;

  var root = document.documentElement;
  function css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  var AppCharts = {
    colors: function () {
      return {
        tint: css('--tint'),
        tintSoft: css('--tint-soft'),
        sand: css('--sand'),
        sandDeep: css('--series-b'),
        sandInk: css('--sand-ink'),
        red: css('--red'),
        gray: css('--gray'),
        label: css('--label'),
        label2: css('--label-2'),
        grid: css('--sep'),
        surface: css('--surface')
      };
    },

    /* Padrões globais: fonte do sistema, cantos arredondados, animação suave */
    apply: function () {
      var c = this.colors();
      var D = Chart.defaults;
      D.font.family = css('--font');
      D.font.size = 12;
      D.color = c.label2;
      D.borderColor = c.grid;
      D.responsive = true;
      D.maintainAspectRatio = false;
      D.animation = { duration: 900, easing: 'easeOutQuart' };
      D.transitions.active = { animation: { duration: 250 } };
      D.elements.bar.borderRadius = 8;
      D.elements.bar.borderSkipped = false;
      D.elements.line.tension = 0.38;
      D.elements.line.borderWidth = 2.5;
      D.elements.line.borderCapStyle = 'round';
      D.elements.point.radius = 0;
      D.elements.point.hoverRadius = 5;
      D.elements.point.hitRadius = 14;
      D.elements.arc.borderWidth = 3;
      D.elements.arc.borderColor = c.surface;
      D.elements.arc.hoverOffset = 6;
      D.plugins.legend.position = 'bottom';
      D.plugins.legend.labels.usePointStyle = true;
      D.plugins.legend.labels.pointStyle = 'circle';
      D.plugins.legend.labels.boxWidth = 8;
      D.plugins.legend.labels.padding = 16;
      D.plugins.tooltip.backgroundColor = c.label;
      D.plugins.tooltip.titleColor = c.surface;
      D.plugins.tooltip.bodyColor = c.surface;
      D.plugins.tooltip.cornerRadius = 12;
      D.plugins.tooltip.padding = 12;
      D.plugins.tooltip.boxPadding = 4;
      D.plugins.tooltip.displayColors = true;
      D.plugins.tooltip.usePointStyle = true;
    },

    /* Escalas prontas (grade discreta, sem bordas) */
    scales: function (opts) {
      var c = this.colors();
      opts = opts || {};
      return {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: c.label2 } },
        y: {
          beginAtZero: opts.beginAtZero !== false,
          grid: { color: c.grid }, border: { display: false },
          ticks: { color: c.label2, maxTicksLimit: 5 }
        }
      };
    },

    /* Degradê vertical para áreas de linha */
    gradient: function (ctx, color, height) {
      var g = ctx.createLinearGradient(0, 0, 0, height || 260);
      g.addColorStop(0, color + '55');
      g.addColorStop(1, color + '00');
      return g;
    },

    /* Cria o gráfico e o guarda para ser destruído ao trocar de tela */
    _list: [],
    make: function (canvas, config) {
      if (!canvas) return null;
      var chart = new Chart(canvas, config);
      this._list.push(chart);
      return chart;
    },
    destroyAll: function () {
      this._list.forEach(function (ch) { try { ch.destroy(); } catch (e) {} });
      this._list = [];
    }
  };

  AppCharts.apply();
  window.AppCharts = AppCharts;

  /* Troca de tema: reaplica os padrões; as telas devem redesenhar seus gráficos */
  document.addEventListener('themechange', function () {
    AppCharts.apply();
  });
})();