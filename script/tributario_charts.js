// tributario_charts.js - Gerenciamento de Gráficos Chart.js (Whealth Planner Pro)

(function (window) {
  'use strict';

  const TributarioCharts = {
    instancias: {},

    // Registrar plugins do Chart.js se disponível
    initPlugins() {
      if (window.Chart && window.ChartDataLabels) {
        try {
          Chart.register(ChartDataLabels);
        } catch (e) {
          // Já registrado
        }
      }
    },

    // Gráfico 1: Distribuição Geral do Patrimônio (Rosca)
    renderizarGraficoGeral(canvasId, dadosPatrimonio) {
      this.initPlugins();
      const canvas = document.getElementById(canvasId);
      if (!canvas || !window.Chart) return;

      if (this.instancias[canvasId]) {
        this.instancias[canvasId].destroy();
      }

      const totalA = (Number(dadosPatrimonio.rf) || 0) + (Number(dadosPatrimonio.rv) || 0) + 
                     (Number(dadosPatrimonio.inter) || 0) + (Number(dadosPatrimonio.prev) || 0) + 
                     (Number(dadosPatrimonio.offshore) || 0);

      const totalI = (Number(dadosPatrimonio.apt) || 0) + (Number(dadosPatrimonio.casa) || 0) + 
                     (Number(dadosPatrimonio.terr) || 0) + (Number(dadosPatrimonio.galp) || 0) + 
                     (Number(dadosPatrimonio.bens_particulares) || 0);

      let totalEmpresas = 0;
      if (Array.isArray(dadosPatrimonio.empresas)) {
        dadosPatrimonio.empresas.forEach(emp => {
          totalEmpresas += (Number(emp.valor) || 0) * ((Number(emp.pct) || 0) / 100);
        });
      }

      const totalBens = Number(dadosPatrimonio.bens) || 0;

      const ctx = canvas.getContext('2d');
      this.instancias[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Aplicações Financeiras', 'Imóveis', 'Participações Societárias', 'Bens & Outros'],
          datasets: [{
            data: [totalA, totalI, totalEmpresas, totalBens],
            backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            datalabels: {
              color: '#ffffff',
              font: { weight: 'bold' },
              formatter: (value, ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                if (total === 0 || value === 0) return '';
                const pct = ((value / total) * 100).toFixed(1);
                return pct + '%';
              }
            }
          }
        }
      });
    },

    // Gráfico 2: Comparativo de Estratégias de Preservação (Barras)
    renderizarGraficoEstrategias(canvasId, totalPrejuizo, prejuizoComEstrategia) {
      this.initPlugins();
      const canvas = document.getElementById(canvasId);
      if (!canvas || !window.Chart) return;

      if (this.instancias[canvasId]) {
        this.instancias[canvasId].destroy();
      }

      const ctx = canvas.getContext('2d');
      this.instancias[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Prejuízo Sem Planejamento', 'Prejuízo Com Estratégia'],
          datasets: [{
            label: 'Custo de Inventário (R$)',
            data: [totalPrejuizo, prejuizoComEstrategia],
            backgroundColor: ['#ef4444', '#10b981'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            datalabels: {
              anchor: 'end',
              align: 'top',
              formatter: (val) => 'R$ ' + Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
            }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }
  };

  window.TributarioCharts = TributarioCharts;
})(window);
