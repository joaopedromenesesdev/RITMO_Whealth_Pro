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
    },

    // Helper defensivo anti-XSS para interpolação em templates HTML
    escapeTexto(valor) {
      if (typeof window.escapeHTML === 'function') {
        return window.escapeHTML(valor);
      }
      return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    // Gráfico 3B: Canibalização de Liquidez / Asfixiamento do Caixa (Abordagem 1)
    renderizarGraficoCanibalizacaoLiquidez(canvasId, dados) {
      this.initPlugins();
      const canvas = document.getElementById(canvasId);

      const liquidezAtual = Math.max(0, Number(dados?.liquidezAtual) || 0);
      const prejuizoAtual = Math.max(0, Number(dados?.prejuizoAtual) || 0);
      const liquidezProjetada = Math.max(0, Number(dados?.liquidezProjetada) || 0);
      const prejuizoProjetado = Math.max(0, Number(dados?.prejuizoProjetado) || 0);
      const anosProjecao = Math.max(0, Math.round(Number(dados?.anosProjecao) || 0));
      const fatorCrescimento = Number(dados?.fatorCrescimento) > 0 ? Number(dados.fatorCrescimento) : 1;

      const siglaComposicao = String(dados?.siglaComposicao || 'RF + RV + Fundos');
      const descricaoComposicao = String(dados?.descricaoComposicao || 'Renda Fixa + Renda Variável + Fundos');
      const componentesAtivos = Array.isArray(dados?.componentesAtivos) ? dados.componentesAtivos : [
        { sigla: 'RF', valor: Math.max(0, Number(dados?.rf) || 0) },
        { sigla: 'RV', valor: Math.max(0, Number(dados?.rv) || 0) },
        { sigla: 'Fundos', valor: Math.max(0, Number(dados?.inter) || 0) }
      ];

      const metricas = (window.TributarioEngine && typeof window.TributarioEngine.calcularMetricasCanibalizacao === 'function')
        ? window.TributarioEngine.calcularMetricasCanibalizacao({
          liquidezAtual,
          prejuizoAtual,
          liquidezProjetada,
          prejuizoProjetado
        })
        : (() => {
          const semLiquidezAtual = liquidezAtual <= 0 && prejuizoAtual > 0;
          const semLiquidezProjetada = liquidezProjetada <= 0 && prejuizoProjetado > 0;
          const pctConsumoAtual = Math.round(liquidezAtual) > 0
            ? (Math.round(prejuizoAtual) / Math.round(liquidezAtual)) * 100
            : (prejuizoAtual > 0 ? null : 0);
          const pctConsumoProjetado = Math.round(liquidezProjetada) > 0
            ? (Math.round(prejuizoProjetado) / Math.round(liquidezProjetada)) * 100
            : (prejuizoProjetado > 0 ? null : 0);
          return {
            semLiquidezAtual,
            semLiquidezProjetada,
            pctConsumoAtual,
            pctConsumoProjetado,
            caixaRestanteAtual: Math.max(0, liquidezAtual - prejuizoAtual),
            deficitAtual: Math.max(0, prejuizoAtual - liquidezAtual),
            caixaRestanteProjetado: Math.max(0, liquidezProjetada - prejuizoProjetado),
            deficitProjetado: Math.max(0, prejuizoProjetado - liquidezProjetada),
            textoComprometimentoAtual: semLiquidezAtual ? 'Sem caixa' : `${(pctConsumoAtual || 0).toFixed(1).replace('.', ',')}% drenados`,
            textoComprometimentoProjetado: semLiquidezProjetada ? 'Sem caixa' : `${(pctConsumoProjetado || 0).toFixed(1).replace('.', ',')}% da liquidez`
          };
        })();

      const labelProjecao = anosProjecao > 0 ? `Projeção Futura (${anosProjecao} anos)` : 'Projeção Futura';
      const notaProjecaoLegenda = anosProjecao > 0 ? ` · Projetada em ${anosProjecao} anos` : '';

      // Injeta legenda da Abordagem 1 com composição explícita da barra azul
      const idLegendaCanib = dados?.legendaContainerId || "canibalizacao_legenda_container";
      const legendaContainer = document.getElementById(idLegendaCanib) || document.getElementById("erosao_legenda_container");
      if (legendaContainer) {
        const descSegura = this.escapeTexto(descricaoComposicao);
        const notaProjSegura = this.escapeTexto(notaProjecaoLegenda);
        const fmtBRL = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        const chavesAtivas = componentesAtivos.map(c => c.chave);
        const parcelas = componentesAtivos
          .filter(c => Number(c.valor) > 0)
          .map(c => `${c.sigla} ${fmtBRL(c.valor)}`);
        const excluidos = ['imóveis', 'empresas', 'bens'];
        if (!chavesAtivas.includes('prev')) excluidos.push('previdência');
        if (!chavesAtivas.includes('offshore')) excluidos.push('offshore');
        const fatorTxt = fatorCrescimento.toFixed(2).replace('.', ',');
        const textoHoje = parcelas.length > 0
          ? `Hoje = ${parcelas.join(' + ')} = ${fmtBRL(liquidezAtual)}.`
          : `Hoje = nenhuma aplicação em ${siglaComposicao} cadastrada (R$ 0).`;
        const textoFuturo = anosProjecao > 0
          ? ` Futuro = essa mesma reserva corrigida pelo crescimento da Evolução Patrimonial em ${anosProjecao} anos (× ${fatorTxt}) = ${fmtBRL(liquidezProjetada)}.`
          : ` Futuro = essa mesma reserva corrigida pelo crescimento patrimonial (× ${fatorTxt}) = ${fmtBRL(liquidezProjetada)}.`;
        const textoExclusao = ` Não entram: ${excluidos.join(', ')}.`;
        const notaComoLer = this.escapeTexto(textoHoje + textoFuturo + textoExclusao);

        legendaContainer.innerHTML = `
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #0f172a;"></span>
            <span class="legenda-texto"><strong>Liquidez Financeira Disponível</strong> (${descSegura}${notaProjSegura})</span>
          </div>
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #dc2626;"></span>
            <span class="legenda-texto"><strong>Exigência Imediata do Inventário</strong> (À Vista em até 60 dias)</span>
          </div>
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #f59e0b;"></span>
            <span class="legenda-texto"><strong>Risco Operacional:</strong> Contas bancárias e investimentos bloqueados até alvará</span>
          </div>
          <div class="legenda-item" style="flex-basis: 100%; align-items: flex-start; padding-top: 8px; border-top: 1px dashed #e4e4e7;">
            <span class="legenda-texto" style="line-height: 1.5;"><strong>Como ler as barras azuis:</strong> ${notaComoLer}</span>
          </div>
        `;
      }

      // Injeta micro-cards de KPI de Choque (Abordagem 1)
      const idKpisCanib = dados?.kpisContainerId || "canibalizacao_kpis_grid_container";
      const kpisGrid = document.getElementById(idKpisCanib) || document.getElementById("erosao_kpis_grid_container");
      if (kpisGrid) {
        const isDeficit = metricas.deficitAtual > 0;
        const isCriticoAtual = metricas.semLiquidezAtual || (metricas.pctConsumoAtual !== null && metricas.pctConsumoAtual >= 50);
        const subAtual = metricas.semLiquidezAtual
          ? `100% descoberto — R$ ${prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} sem liquidez cadastrada`
          : `R$ ${prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} exigidos em dinheiro vivo`;
        const subFuturo = metricas.semLiquidezProjetada
          ? `100% descoberto — R$ ${prejuizoProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} sem caixa projetado`
          : `R$ ${prejuizoProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} retirados do caixa projetado${anosProjecao > 0 ? ` (${anosProjecao} anos)` : ''}`;

        kpisGrid.innerHTML = `
          <div class="erosao-kpi-card ${isCriticoAtual ? 'kpi-perigo-critico' : 'kpi-alerta'}">
            <span class="kpi-label">Comprometimento do Caixa Atual</span>
            <span class="kpi-valor" style="color: #dc2626;">${this.escapeTexto(metricas.textoComprometimentoAtual)}</span>
            <span class="kpi-sub">${this.escapeTexto(subAtual)}</span>
          </div>
          <div class="erosao-kpi-card ${isDeficit ? 'kpi-perigo-critico' : ''}">
            <span class="kpi-label">${isDeficit ? 'Déficit Imediato de Caixa' : 'Caixa Restante para Sobrevivência'}</span>
            <span class="kpi-valor" style="color: ${isDeficit ? '#dc2626' : '#0f172a'};">
              ${isDeficit ? '- R$ ' + metricas.deficitAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : 'R$ ' + metricas.caixaRestanteAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </span>
            <span class="kpi-sub">${isDeficit ? 'A família precisará vender imóveis/bens com deságio' : 'Saldo livre após pagar guias fiscais e custas'}</span>
          </div>
          <div class="erosao-kpi-card ${metricas.semLiquidezProjetada ? 'kpi-perigo-critico' : ''}">
            <span class="kpi-label">Comprometimento Futuro</span>
            <span class="kpi-valor" style="color: #b91c1c;">${this.escapeTexto(metricas.textoComprometimentoProjetado)}</span>
            <span class="kpi-sub">${this.escapeTexto(subFuturo)}</span>
          </div>
          <div class="erosao-kpi-card kpi-alerta">
            <span class="kpi-label">Prazo Fatal SEFAZ / Justiça</span>
            <span class="kpi-valor cor-alerta">60 a 90 dias</span>
            <span class="kpi-sub">Multa legal de até 20% + juros SELIC se não houver caixa</span>
          </div>
        `;
      }

      if (!canvas || !window.Chart) return;

      if (this.instancias[canvasId]) {
        try {
          this.instancias[canvasId].destroy();
        } catch (_) {}
      }

      const breakdownAtualTexto = componentesAtivos
        .filter(c => Number(c.valor) > 0)
        .map(c => `${c.sigla}: R$ ${Number(c.valor).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`)
        .join(' | ');

      const ctx = canvas.getContext('2d');
      this.instancias[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Cenário Atual', labelProjecao],
          datasets: [
            {
              label: `Liquidez Disponível (${siglaComposicao})`,
              data: [liquidezAtual, liquidezProjetada],
              backgroundColor: '#0f172a',
              borderRadius: 6,
              barPercentage: 0.6,
              categoryPercentage: 0.7
            },
            {
              label: 'Custo de Inventário à Vista (Prejuízo)',
              data: [prejuizoAtual, prejuizoProjetado],
              backgroundColor: '#dc2626',
              borderRadius: 6,
              barPercentage: 0.6,
              categoryPercentage: 0.7
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                callback: (val) => {
                  const num = Number(val) || 0;
                  if (num >= 1000000) return 'R$ ' + (num / 1000000).toFixed(1).replace('.', ',') + 'M';
                  if (num >= 1000) return 'R$ ' + (num / 1000).toFixed(0) + 'k';
                  return 'R$ ' + num;
                },
                font: { size: 11, family: 'Outfit' }
              }
            },
            x: {
              grid: { display: false },
              ticks: {
                font: { size: 12, weight: '700', family: 'Outfit' },
                color: '#09090b'
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#09090b',
              titleFont: { family: 'Outfit', size: 13, weight: '700' },
              bodyFont: { family: 'Outfit', size: 12 },
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const val = Number(context.raw) || 0;
                  const idx = context.dataIndex;
                  const liq = idx === 0 ? liquidezAtual : liquidezProjetada;
                  if (context.datasetIndex === 1) {
                    if (liq <= 0 && val > 0) {
                      return ` ${context.dataset.label}: R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (Sem liquidez — 100% descoberto)`;
                    }
                    const pct = liq > 0 ? ((Math.round(val) / Math.round(liq)) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
                    return ` ${context.dataset.label}: R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${pct} da liquidez)`;
                  }
                  const baseLabel = ` ${context.dataset.label}: R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
                  if (idx === 0) {
                    return breakdownAtualTexto ? [baseLabel, ` Composição: ${breakdownAtualTexto}`] : [baseLabel, ' Sem aplicações líquidas cadastradas'];
                  }
                  const fatorFmt = fatorCrescimento.toFixed(2).replace('.', ',');
                  const descProj = anosProjecao > 0
                    ? ` Reserva líquida projetada em ${anosProjecao} anos (× ${fatorFmt})`
                    : ` Reserva líquida projetada (× ${fatorFmt})`;
                  return [baseLabel, descProj];
                }
              }
            },
            datalabels: {
              color: '#ffffff',
              anchor: 'center',
              align: 'center',
              textAlign: 'center',
              font: { family: 'Outfit', weight: '700', size: 11 },
              formatter: (val, ctx) => {
                const num = Number(val) || 0;
                if (num <= 0) return '';
                const valorTxt = 'R$ ' + num.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
                const maiorValor = Math.max(liquidezAtual, liquidezProjetada, prejuizoAtual, prejuizoProjetado, 1);
                const barraPequena = (num / maiorValor) < 0.18;
                if (ctx.datasetIndex !== 0 || barraPequena) return valorTxt;
                const subtitulo = ctx.dataIndex === 0
                  ? siglaComposicao
                  : (anosProjecao > 0 ? `Projeção ${anosProjecao} anos` : 'Projetada');
                return [valorTxt, subtitulo];
              }
            }
          }
        }
      });
    },

    // Gráfico 3: Erosão Patrimonial por Custos de Inventário (Barras Empilhadas Horizontais - Opção 1)
    renderizarGraficoErosaoHorizontal(canvasId, dados) {
      this.initPlugins();
      const canvas = document.getElementById(canvasId);

      const totalAtual = Number(dados?.totalAtual) || 0;
      const prejuizoAtual = Number(dados?.prejuizoAtual) || 0;
      const totalProjetado = Number(dados?.totalProjetado) || 0;
      const prejuizoProjetado = Number(dados?.prejuizoProjetado) || 0;

      const liquidoAtual = Math.max(0, totalAtual - prejuizoAtual);
      const liquidoProjetado = Math.max(0, totalProjetado - prejuizoProjetado);

      const pctAtual = totalAtual > 0 ? (prejuizoAtual / totalAtual) * 100 : 0;
      const pctProjetado = totalProjetado > 0 ? (prejuizoProjetado / totalProjetado) * 100 : 0;
      const deltaPerda = Math.max(0, prejuizoProjetado - prejuizoAtual);

      // Injeta legenda específica da Opção 1
      const legendaContainer = document.getElementById("erosao_legenda_container");
      if (legendaContainer) {
        legendaContainer.innerHTML = `
          <div class="legenda-item">
            <span class="legenda-dot cor-preservado"></span>
            <span class="legenda-texto"><strong>Patrimônio Preservado</strong> (Herança Líquida da Família)</span>
          </div>
          <div class="legenda-item">
            <span class="legenda-dot cor-corroido"></span>
            <span class="legenda-texto"><strong>Erosão Sucessória</strong> (ITCMD + Honorários + Custas)</span>
          </div>
        `;
      }

      // Injeta micro-cards de KPI da Opção 1
      const kpisGrid = document.getElementById("erosao_kpis_grid_container");
      if (kpisGrid) {
        kpisGrid.innerHTML = `
          <div class="erosao-kpi-card">
            <span class="kpi-label">Erosão no Cenário Atual</span>
            <span class="kpi-valor" id="kpi_erosao_atual_valor">R$ ${prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub" id="kpi_erosao_atual_pct">${pctAtual.toFixed(1).replace(".", ",")}% do patrimônio total</span>
          </div>
          <div class="erosao-kpi-card">
            <span class="kpi-label">Erosão na Projeção Futura</span>
            <span class="kpi-valor" id="kpi_erosao_projetada_valor">R$ ${prejuizoProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub" id="kpi_erosao_projetada_pct">${pctProjetado.toFixed(1).replace(".", ",")}% do patrimônio projetado</span>
          </div>
          <div class="erosao-kpi-card kpi-alerta">
            <span class="kpi-label">Aumento da Perda por Espera</span>
            <span class="kpi-valor cor-alerta" id="kpi_erosao_delta_valor">+ R$ ${deltaPerda.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">Custo de não planejar com antecedência</span>
          </div>
        `;
      }

      if (!canvas || !window.Chart) return;

      if (this.instancias[canvasId]) {
        try {
          this.instancias[canvasId].destroy();
        } catch (_) {}
      }

      const ctx = canvas.getContext('2d');
      this.instancias[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Cenário Atual', 'Projeção Futura'],
          datasets: [
            {
              label: 'Patrimônio Preservado',
              data: [liquidoAtual, liquidoProjetado],
              backgroundColor: '#09090b',
              borderRadius: { topLeft: 6, bottomLeft: 6, topRight: 0, bottomRight: 0 },
              borderSkipped: false,
              barPercentage: 0.55,
              categoryPercentage: 0.75
            },
            {
              label: 'Erosão Sucessória (Perda)',
              data: [prejuizoAtual, prejuizoProjetado],
              backgroundColor: '#ef4444',
              borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 6, bottomRight: 6 },
              borderSkipped: false,
              barPercentage: 0.55,
              categoryPercentage: 0.75
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                callback: (val) => {
                  const num = Number(val) || 0;
                  if (num >= 1000000) return 'R$ ' + (num / 1000000).toFixed(1).replace('.', ',') + 'M';
                  if (num >= 1000) return 'R$ ' + (num / 1000).toFixed(0) + 'k';
                  return 'R$ ' + num;
                },
                font: { size: 11, family: 'Outfit' }
              }
            },
            y: {
              stacked: true,
              grid: { display: false },
              ticks: {
                font: { size: 12, weight: '600', family: 'Outfit' },
                color: '#09090b'
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#09090b',
              titleFont: { family: 'Outfit', size: 13, weight: '700' },
              bodyFont: { family: 'Outfit', size: 12 },
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const val = Number(context.raw) || 0;
                  const idx = context.dataIndex;
                  const total = (Number(context.chart.data.datasets[0].data[idx]) || 0) + (Number(context.chart.data.datasets[1].data[idx]) || 0);
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1).replace('.', ',') + '%' : '0%';
                  return ` ${context.dataset.label}: R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${pct})`;
                }
              }
            },
            datalabels: {
              color: '#ffffff',
              font: { family: 'Outfit', weight: '700', size: 11 },
              formatter: (val, ctx) => {
                const idx = ctx.dataIndex;
                const total = (Number(ctx.chart.data.datasets[0].data[idx]) || 0) + (Number(ctx.chart.data.datasets[1].data[idx]) || 0);
                if (total <= 0 || Number(val) <= 0) return '';
                const pct = (Number(val) / total) * 100;
                if (pct < 8) return '';
                return 'R$ ' + Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
              }
            }
          }
        }
      });
    },

    // Gráfico 4B: Efeito Bola de Neve - Venda Forçada com Deságio (Abordagem 2)
    renderizarGraficoVendaForcada(canvasId, dados) {
      this.initPlugins();
      const canvas = document.getElementById(canvasId);

      const prejuizoAtual = Number(dados?.prejuizoAtual) || 0;
      const desagioAtual = Number(dados?.desagioAtual) || Math.round(prejuizoAtual * 1.3);
      const perdaTotalAtual = prejuizoAtual + desagioAtual;

      const prejuizoProjetado = Number(dados?.prejuizoProjetado) || 0;
      const desagioProjetado = Number(dados?.desagioProjetado) || Math.round(prejuizoProjetado * 1.3);
      const perdaTotalProjetada = prejuizoProjetado + desagioProjetado;

      // Injeta legenda da Abordagem 2
      const legendaContainer = document.getElementById("erosao_legenda_container");
      if (legendaContainer) {
        legendaContainer.innerHTML = `
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #ef4444;"></span>
            <span class="legenda-texto"><strong>Custo Direto do Inventário</strong> (ITCMD + Honorários + Custas)</span>
          </div>
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #7f1d1d;"></span>
            <span class="legenda-texto"><strong>Deságio Médio por Venda Forçada</strong> (20% a 25% de perda para levantar caixa)</span>
          </div>
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #09090b;"></span>
            <span class="legenda-texto"><strong>Destruição Real Total:</strong> A conta invisível da falta de planejamento</span>
          </div>
        `;
      }

      // Injeta micro-cards de KPI de Choque (Abordagem 2)
      const kpisGrid = document.getElementById("erosao_kpis_grid_container");
      if (kpisGrid) {
        kpisGrid.innerHTML = `
          <div class="erosao-kpi-card">
            <span class="kpi-label">Custo Nominal do Inventário</span>
            <span class="kpi-valor" style="color: #ef4444;">R$ ${prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">Impostos, taxas e advogados</span>
          </div>
          <div class="erosao-kpi-card kpi-alerta">
            <span class="kpi-label">Perda por Deságio na Venda Rápida</span>
            <span class="kpi-valor cor-alerta">+ R$ ${desagioAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">Desconto de 20% a 25% exigido pelo mercado de urgência</span>
          </div>
          <div class="erosao-kpi-card kpi-perigo-critico">
            <span class="kpi-label">Destruição Patrimonial Real (Hoje)</span>
            <span class="kpi-valor" style="color: #7f1d1d;">R$ ${perdaTotalAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">O custo real de sangria patrimonial da família</span>
          </div>
          <div class="erosao-kpi-card kpi-perigo-critico">
            <span class="kpi-label">Destruição Patrimonial Futura</span>
            <span class="kpi-valor" style="color: #7f1d1d;">R$ ${perdaTotalProjetada.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">Perda total projetada somando impostos, custas e deságio</span>
          </div>
        `;
      }

      if (!canvas || !window.Chart) return;

      if (this.instancias[canvasId]) {
        try {
          this.instancias[canvasId].destroy();
        } catch (_) {}
      }

      const ctx = canvas.getContext('2d');
      this.instancias[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Cenário Atual', 'Projeção Futura'],
          datasets: [
            {
              label: 'Custo Direto do Inventário',
              data: [prejuizoAtual, prejuizoProjetado],
              backgroundColor: '#ef4444',
              borderRadius: { topLeft: 6, bottomLeft: 6, topRight: 0, bottomRight: 0 },
              borderSkipped: false,
              barPercentage: 0.55,
              categoryPercentage: 0.7
            },
            {
              label: 'Deságio Estimado na Venda de Bens (20%-25%)',
              data: [desagioAtual, desagioProjetado],
              backgroundColor: '#7f1d1d',
              borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 6, bottomRight: 6 },
              borderSkipped: false,
              barPercentage: 0.55,
              categoryPercentage: 0.7
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: {
                font: { size: 12, weight: '700', family: 'Outfit' },
                color: '#09090b'
              }
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                callback: (val) => {
                  const num = Number(val) || 0;
                  if (num >= 1000000) return 'R$ ' + (num / 1000000).toFixed(1).replace('.', ',') + 'M';
                  if (num >= 1000) return 'R$ ' + (num / 1000).toFixed(0) + 'k';
                  return 'R$ ' + num;
                },
                font: { size: 11, family: 'Outfit' }
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#09090b',
              titleFont: { family: 'Outfit', size: 13, weight: '700' },
              bodyFont: { family: 'Outfit', size: 12 },
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const val = Number(context.raw) || 0;
                  const idx = context.dataIndex;
                  const total = idx === 0 ? perdaTotalAtual : perdaTotalProjetada;
                  const pct = total > 0 ? ((val / total) * 100).toFixed(0) + '%' : '0%';
                  return ` ${context.dataset.label}: R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${pct})`;
                },
                afterBody: (contexts) => {
                  const idx = contexts[0].dataIndex;
                  const total = idx === 0 ? perdaTotalAtual : perdaTotalProjetada;
                  return `\nPerda Real Acumulada: R$ ${total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
                }
              }
            },
            datalabels: {
              color: '#ffffff',
              anchor: 'center',
              align: 'center',
              font: { family: 'Outfit', weight: '700', size: 11 },
              formatter: (val) => {
                if (Number(val) <= 0) return '';
                return 'R$ ' + Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
              }
            }
          }
        }
      });
    },

    // Gráfico 4C: O Sócio Oculto - Partilha com o Estado e Intermediários (Abordagem 3)
    renderizarGraficoSocioOculto(canvasId, dados) {
      this.initPlugins();
      const canvas = document.getElementById(canvasId);

      const totalAtual = Number(dados?.totalAtual) || 0;
      const baseAtual = Number(dados?.baseAtual) || 0;
      const prejuizoAtual = Number(dados?.prejuizoAtual) || 0;
      const totalProjetado = Number(dados?.totalProjetado) || 0;
      const baseProjetada = Number(dados?.baseProjetada) || 0;
      const prejuizoProjetado = Number(dados?.prejuizoProjetado) || 0;

      const herancaLiquidaAtual = Math.max(0, totalAtual - prejuizoAtual);
      const herancaLiquidaProjetada = Math.max(0, totalProjetado - prejuizoProjetado);

      // Injeta legenda da Abordagem 3
      const legendaContainer = document.getElementById("erosao_legenda_container");
      if (legendaContainer) {
        legendaContainer.innerHTML = `
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #0f172a;"></span>
            <span class="legenda-texto"><strong>Herança Líquida da Família</strong> (Bens sujeitos a inventário travado)</span>
          </div>
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #dc2626;"></span>
            <span class="legenda-texto"><strong>Cota do Sócio Oculto</strong> (Estado + Cartórios + Advogados à vista)</span>
          </div>
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #f59e0b;"></span>
            <span class="legenda-texto"><strong>Condição Legal:</strong> Exigência de quitação prioritária em até 60 dias</span>
          </div>
        `;
      }

      // Injeta micro-cards de KPI de Choque (Abordagem 3)
      const kpisGrid = document.getElementById("erosao_kpis_grid_container");
      if (kpisGrid) {
        kpisGrid.innerHTML = `
          <div class="erosao-kpi-card kpi-perigo-critico">
            <span class="kpi-label">Cota do Sócio Oculto (Hoje)</span>
            <span class="kpi-valor" style="color: #dc2626;">R$ ${prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">Exigido em dinheiro vivo para liberar o inventário</span>
          </div>
          <div class="erosao-kpi-card">
            <span class="kpi-label">Prioridade na Mesa de Partilha</span>
            <span class="kpi-valor" style="color: #0f172a;">1º da Fila</span>
            <span class="kpi-sub">Nenhum filho recebe certidão ou posse antes de pagar o Estado</span>
          </div>
          <div class="erosao-kpi-card">
            <span class="kpi-label">Condição de Recebimento</span>
            <span class="kpi-valor" style="color: #ea580c;">Dinheiro à Vista</span>
            <span class="kpi-sub">O Estado não aceita imóveis nem empresas como pagamento</span>
          </div>
          <div class="erosao-kpi-card kpi-perigo-critico">
            <span class="kpi-label">Cota Futura do Sócio Oculto</span>
            <span class="kpi-valor" style="color: #dc2626;">R$ ${prejuizoProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">Cresce na mesma velocidade da valorização dos seus bens</span>
          </div>
        `;
      }

      if (!canvas || !window.Chart) return;

      if (this.instancias[canvasId]) {
        try {
          this.instancias[canvasId].destroy();
        } catch (_) {}
      }

      const ctx = canvas.getContext('2d');
      this.instancias[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Cenário Atual', 'Projeção Futura'],
          datasets: [
            {
              label: 'Herança Líquida da Família (Bens Bloqueados)',
              data: [herancaLiquidaAtual, herancaLiquidaProjetada],
              backgroundColor: '#0f172a',
              borderRadius: 6,
              barPercentage: 0.6,
              categoryPercentage: 0.7
            },
            {
              label: 'Cota do Sócio Oculto (Estado + Custas à Vista)',
              data: [prejuizoAtual, prejuizoProjetado],
              backgroundColor: '#dc2626',
              borderRadius: 6,
              barPercentage: 0.6,
              categoryPercentage: 0.7
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                callback: (val) => {
                  const num = Number(val) || 0;
                  if (num >= 1000000) return 'R$ ' + (num / 1000000).toFixed(1).replace('.', ',') + 'M';
                  if (num >= 1000) return 'R$ ' + (num / 1000).toFixed(0) + 'k';
                  return 'R$ ' + num;
                },
                font: { size: 11, family: 'Outfit' }
              }
            },
            x: {
              grid: { display: false },
              ticks: {
                font: { size: 12, weight: '700', family: 'Outfit' },
                color: '#09090b'
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#09090b',
              titleFont: { family: 'Outfit', size: 13, weight: '700' },
              bodyFont: { family: 'Outfit', size: 12 },
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const val = Number(context.raw) || 0;
                  return ` ${context.dataset.label}: R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
                }
              }
            },
            datalabels: {
              color: '#ffffff',
              anchor: 'center',
              align: 'center',
              font: { family: 'Outfit', weight: '700', size: 11 },
              formatter: (val) => {
                if (Number(val) <= 0) return '';
                return 'R$ ' + Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
              }
            }
          }
        }
      });
    },

    // Gráfico 4D: Materialização do Prejuízo em Bens Concretos e Tempo (Abordagem 4)
    renderizarGraficoMaterializacaoBens(canvasId, dados) {
      this.initPlugins();
      const canvas = document.getElementById(canvasId);

      const prejuizoAtual = Math.max(0, Number(dados?.prejuizoAtual) || 0);
      const prejuizoProjetado = Math.max(0, Number(dados?.prejuizoProjetado) || 0);
      const totalAtual = Math.max(0, Number(dados?.totalAtual) || 0);
      const totalProjetado = Math.max(0, Number(dados?.totalProjetado) || 0);
      const liquidezAtual = Math.max(0, Number(dados?.liquidezAtual) || 0);
      const liquidezProjetada = Math.max(0, Number(dados?.liquidezProjetada) || 0);
      const anosProjecao = Math.max(0, Math.round(Number(dados?.anosProjecao) || 10));

      const mat = (window.TributarioEngine && typeof window.TributarioEngine.calcularMaterializacaoPrejuizo === 'function')
        ? window.TributarioEngine.calcularMaterializacaoPrejuizo({
          prejuizoAtual,
          prejuizoProjetado,
          totalAtual,
          totalProjetado,
          liquidezAtual,
          liquidezProjetada,
          anosProjecao
        })
        : (() => {
          const fmtCompacto = (v) => {
            if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(2).replace('.', ',').replace(/,00$/, '') + 'M';
            if (v >= 1000) return 'R$ ' + Math.round(v / 1000) + 'k';
            return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
          };
          const eqFallback = (v) => ({
            valor: v,
            valorCompacto: fmtCompacto(v),
            titulo: v > 0 ? fmtCompacto(v) : 'Sem prejuízo estimado',
            curto: v > 0 ? fmtCompacto(v) : 'Sem prejuízo',
            subtitulo: v > 0 ? 'Valor equivalente drenado em custos de inventário' : 'Nenhum custo tributário projetado'
          });
          const usouLiq = liquidezAtual > 0;
          const rendA = (usouLiq ? liquidezAtual : totalAtual * 0.3) * 0.007;
          const rendP = (liquidezProjetada > 0 ? liquidezProjetada : totalProjetado * 0.3) * 0.007;
          const mA = (prejuizoAtual > 0 && rendA > 0) ? Math.max(1, Math.round(prejuizoAtual / rendA)) : 0;
          const mP = (prejuizoProjetado > 0 && rendP > 0) ? Math.max(1, Math.round(prejuizoProjetado / rendP)) : 0;
          const txtM = (mA === 0 && mP === 0) ? '0 meses' : (mA === mP ? `~${mA} meses` : `~${Math.min(mA, mP)} a ${Math.max(mA, mP)} meses`);
          return {
            equivalenciaAtual: eqFallback(prejuizoAtual),
            equivalenciaProjetada: eqFallback(prejuizoProjetado),
            textoMeses: txtM,
            subtituloMeses: usouLiq
              ? 'Meses de rendimento líquido (0,7% a.m.) sobre sua liquidez financeira'
              : 'Estimativa a 0,7% a.m. sobre 30% do patrimônio (sem liquidez cadastrada)',
            custoDiarioInercia: Math.round(Math.max(0, prejuizoProjetado - prejuizoAtual) / Math.max(365, anosProjecao * 365))
          };
        })();

      const eqAtual = mat.equivalenciaAtual;
      const eqProjetada = mat.equivalenciaProjetada;
      const labelProjecao = anosProjecao > 0 ? `Projeção Futura (${anosProjecao} anos)` : 'Projeção Futura';

      // Injeta legenda da Abordagem 4
      const idLegendaMat = dados?.legendaContainerId || "materializacao_legenda_container";
      const legendaContainer = document.getElementById(idLegendaMat) || document.getElementById("erosao_legenda_container");
      if (legendaContainer) {
        legendaContainer.innerHTML = `
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #ef4444;"></span>
            <span class="legenda-texto"><strong>Prejuízo Tributário à Vista</strong> (Montante que a família perde)</span>
          </div>
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #09090b;"></span>
            <span class="legenda-texto"><strong>Equivalência Patrimonial:</strong> O que esse valor compraria em bens reais</span>
          </div>
          <div class="legenda-item">
            <span class="legenda-dot" style="background: #2563eb;"></span>
            <span class="legenda-texto"><strong>Tempo Perdido:</strong> Meses de rentabilidade limpa queimados apenas para pagar guias</span>
          </div>
        `;
      }

      // Injeta micro-cards de KPI de Choque (Abordagem 4 — 100% dinâmicos)
      const idKpisMat = dados?.kpisContainerId || "materializacao_kpis_grid_container";
      const kpisGrid = document.getElementById(idKpisMat) || document.getElementById("erosao_kpis_grid_container");
      if (kpisGrid) {
        kpisGrid.innerHTML = `
          <div class="erosao-kpi-card kpi-alerta">
            <span class="kpi-label">Equivalência Atual (R$ ${prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })})</span>
            <span class="kpi-valor" style="color: #ef4444;">${this.escapeTexto(eqAtual.titulo)}</span>
            <span class="kpi-sub">${this.escapeTexto(eqAtual.subtitulo)}</span>
          </div>
          <div class="erosao-kpi-card kpi-perigo-critico">
            <span class="kpi-label">Equivalência Futura (R$ ${prejuizoProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })})</span>
            <span class="kpi-valor" style="color: #dc2626;">${this.escapeTexto(eqProjetada.titulo)}</span>
            <span class="kpi-sub">${this.escapeTexto(eqProjetada.subtitulo)}</span>
          </div>
          <div class="erosao-kpi-card">
            <span class="kpi-label">Rendimento Queimado (Hoje vs. Futuro)</span>
            <span class="kpi-valor" style="color: #0f172a;">${this.escapeTexto(mat.textoMeses)}</span>
            <span class="kpi-sub">${this.escapeTexto(mat.subtituloMeses)}</span>
          </div>
          <div class="erosao-kpi-card kpi-alerta">
            <span class="kpi-label">Custo Diário de Adiar o Planejamento</span>
            <span class="kpi-valor cor-alerta">+ R$ ${mat.custoDiarioInercia.toLocaleString("pt-BR")}/dia</span>
            <span class="kpi-sub">A perda tributária aumenta silenciosamente a cada dia que passa</span>
          </div>
        `;
      }

      if (!canvas || !window.Chart) return;

      if (this.instancias[canvasId]) {
        try {
          this.instancias[canvasId].destroy();
        } catch (_) {}
      }

      const ctx = canvas.getContext('2d');
      this.instancias[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Cenário Atual', labelProjecao],
          datasets: [
            {
              label: 'Prejuízo Tributário (R$)',
              data: [prejuizoAtual, prejuizoProjetado],
              backgroundColor: ['#ef4444', '#dc2626'],
              borderRadius: 6,
              barPercentage: 0.55,
              categoryPercentage: 0.7
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                callback: (val) => {
                  const num = Number(val) || 0;
                  if (num >= 1000000) return 'R$ ' + (num / 1000000).toFixed(1).replace('.', ',') + 'M';
                  if (num >= 1000) return 'R$ ' + (num / 1000).toFixed(0) + 'k';
                  return 'R$ ' + num;
                },
                font: { size: 11, family: 'Outfit' }
              }
            },
            x: {
              grid: { display: false },
              ticks: {
                font: { size: 12, weight: '700', family: 'Outfit' },
                color: '#09090b'
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#09090b',
              titleFont: { family: 'Outfit', size: 13, weight: '700' },
              bodyFont: { family: 'Outfit', size: 12 },
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const val = Number(context.raw) || 0;
                  const eq = context.dataIndex === 0 ? eqAtual : eqProjetada;
                  return ` Prejuízo: R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${eq.curto})`;
                }
              }
            },
            datalabels: {
              color: '#ffffff',
              anchor: 'center',
              align: 'center',
              textAlign: 'center',
              font: { family: 'Outfit', weight: '700', size: 11 },
              formatter: (val, ctx) => {
                if (Number(val) <= 0) return '';
                const eq = ctx.dataIndex === 0 ? eqAtual : eqProjetada;
                return [eq.valorCompacto, `(${eq.curto})`];
              }
            }
          }
        }
      });
    },

    // Gráfico 4: Decomposição em Cascata dos Custos de Inventário (Waterfall Chart - Opção 2)
    renderizarGraficoErosaoCascata(canvasId, dados) {
      this.initPlugins();
      const canvas = document.getElementById(canvasId);

      const totalAtual = Number(dados?.totalAtual) || 0;
      const itcmdTaxa = Number(dados?.itcmdTaxa) || 0;
      const itcmdValor = Number(dados?.itcmdValor) || 0;
      const honorariosTaxa = Number(dados?.honorariosTaxa) || 0;
      const honorariosValor = Number(dados?.honorariosValor) || 0;
      const custasTaxa = Number(dados?.custasTaxa) || 0;
      const custasValor = Number(dados?.custasValor) || 0;
      const prejuizoAtual = Number(dados?.prejuizoAtual) || (itcmdValor + honorariosValor + custasValor);
      const liquidoAtual = Math.max(0, totalAtual - prejuizoAtual);

      // Etapas flutuantes [início, fim]
      const step1 = [0, totalAtual];
      const step2 = [Math.max(0, totalAtual - itcmdValor), totalAtual];
      const step3 = [Math.max(0, totalAtual - itcmdValor - honorariosValor), Math.max(0, totalAtual - itcmdValor)];
      const step4 = [liquidoAtual, Math.max(0, totalAtual - itcmdValor - honorariosValor)];
      const step5 = [0, liquidoAtual];

      const pctITCMD = prejuizoAtual > 0 ? ((itcmdValor / prejuizoAtual) * 100).toFixed(0) : "0";
      const pctHonorarios = prejuizoAtual > 0 ? ((honorariosValor / prejuizoAtual) * 100).toFixed(0) : "0";
      const pctCustas = prejuizoAtual > 0 ? ((custasValor / prejuizoAtual) * 100).toFixed(0) : "0";
      const pctTotalSobrePatrimonio = totalAtual > 0 ? ((prejuizoAtual / totalAtual) * 100).toFixed(1).replace(".", ",") : "0,0";

      // Injeta legenda da Opção 2 (Cascata)
      const legendaContainer = document.getElementById("erosao_legenda_container");
      if (legendaContainer) {
        legendaContainer.innerHTML = `
          <div class="legenda-item"><span class="legenda-dot" style="background:#09090b;"></span><span class="legenda-texto"><strong>1. Patrimônio Bruto</strong></span></div>
          <div class="legenda-item"><span class="legenda-dot" style="background:#ef4444;"></span><span class="legenda-texto"><strong>2. (-) ITCMD Estadual</strong></span></div>
          <div class="legenda-item"><span class="legenda-dot" style="background:#f97316;"></span><span class="legenda-texto"><strong>3. (-) Honorários Advocatícios</strong></span></div>
          <div class="legenda-item"><span class="legenda-dot" style="background:#eab308;"></span><span class="legenda-texto"><strong>4. (-) Custas Judiciais</strong></span></div>
          <div class="legenda-item"><span class="legenda-dot" style="background:#10b981;"></span><span class="legenda-texto"><strong>5. (=) Herança Líquida</strong></span></div>
        `;
      }

      // Injeta micro-cards de KPI da Opção 2 (Cascata)
      const kpisGrid = document.getElementById("erosao_kpis_grid_container");
      if (kpisGrid) {
        kpisGrid.innerHTML = `
          <div class="erosao-kpi-card">
            <span class="kpi-label">ITCMD Estadual (${itcmdTaxa}%)</span>
            <span class="kpi-valor" style="color: #ef4444;">- R$ ${itcmdValor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">${pctITCMD}% dos custos de inventário</span>
          </div>
          <div class="erosao-kpi-card">
            <span class="kpi-label">Honorários (${honorariosTaxa}%)</span>
            <span class="kpi-valor" style="color: #ea580c;">- R$ ${honorariosValor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">${pctHonorarios}% dos custos de inventário</span>
          </div>
          <div class="erosao-kpi-card">
            <span class="kpi-label">Custas de Cartório (${custasTaxa}%)</span>
            <span class="kpi-valor" style="color: #ca8a04;">- R$ ${custasValor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">${pctCustas}% dos custos de inventário</span>
          </div>
          <div class="erosao-kpi-card kpi-alerta">
            <span class="kpi-label">Perda Total por Inventário</span>
            <span class="kpi-valor cor-alerta">- R$ ${prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">${pctTotalSobrePatrimonio}% do patrimônio familiar</span>
          </div>
        `;
      }

      if (!canvas || !window.Chart) return;

      if (this.instancias[canvasId]) {
        try {
          this.instancias[canvasId].destroy();
        } catch (_) {}
      }

      const ctx = canvas.getContext('2d');
      this.instancias[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: [
            '1. Patrimônio Bruto',
            '2. (-) ITCMD',
            '3. (-) Honorários',
            '4. (-) Custas',
            '5. (=) Herança Líquida'
          ],
          datasets: [{
            label: 'Valor',
            data: [step1, step2, step3, step4, step5],
            backgroundColor: [
              '#09090b', // 1. Bruto
              '#ef4444', // 2. ITCMD
              '#f97316', // 3. Honorários
              '#eab308', // 4. Custas
              '#10b981'  // 5. Líquido
            ],
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.55,
            categoryPercentage: 0.8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                callback: (val) => {
                  const num = Number(val) || 0;
                  if (num >= 1000000) return 'R$ ' + (num / 1000000).toFixed(1).replace('.', ',') + 'M';
                  if (num >= 1000) return 'R$ ' + (num / 1000).toFixed(0) + 'k';
                  return 'R$ ' + num;
                },
                font: { size: 11, family: 'Outfit' }
              }
            },
            x: {
              grid: { display: false },
              ticks: {
                font: { size: 12, weight: '600', family: 'Outfit' },
                color: '#09090b'
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#09090b',
              titleFont: { family: 'Outfit', size: 13, weight: '700' },
              bodyFont: { family: 'Outfit', size: 12 },
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const idx = context.dataIndex;
                  const raw = context.raw;
                  const min = Array.isArray(raw) ? raw[0] : 0;
                  const max = Array.isArray(raw) ? raw[1] : Number(raw) || 0;
                  const diff = max - min;
                  if (idx === 0) return ` Patrimônio Total Bruto: R$ ${max.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
                  if (idx === 1) return ` ITCMD (${itcmdTaxa}%): - R$ ${diff.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
                  if (idx === 2) return ` Honorários Advocatícios (${honorariosTaxa}%): - R$ ${diff.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
                  if (idx === 3) return ` Custas de Cartório/Judiciais (${custasTaxa}%): - R$ ${diff.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
                  return ` Patrimônio Líquido Transmitido: R$ ${max.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
                }
              }
            },
            datalabels: {
              color: (context) => {
                const idx = context.dataIndex;
                if (idx === 0 || idx === 4) return '#ffffff';
                return '#09090b';
              },
              anchor: (context) => {
                const idx = context.dataIndex;
                if (idx === 0 || idx === 4) return 'center';
                return 'end';
              },
              align: (context) => {
                const idx = context.dataIndex;
                if (idx === 0 || idx === 4) return 'center';
                return 'top';
              },
              offset: 4,
              font: { family: 'Outfit', weight: '700', size: 11 },
              formatter: (val, ctx) => {
                const idx = ctx.dataIndex;
                const min = Array.isArray(val) ? val[0] : 0;
                const max = Array.isArray(val) ? val[1] : Number(val) || 0;
                const diff = max - min;
                if (idx === 0) return 'R$ ' + max.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
                if (idx === 4) return 'R$ ' + max.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
                return '- R$ ' + diff.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
              }
            }
          }
        }
      });
    },

    // Gráfico 5: Anéis Comparativos / Donuts de Preservação vs. Corrosão (Opção 3)
    renderizarGraficoErosaoDonuts(canvasAtualId, canvasFuturoId, dados) {
      this.initPlugins();

      const totalAtual = Number(dados?.totalAtual) || 0;
      const itcmdTaxa = Number(dados?.itcmdTaxa) || 0;
      const itcmdValor = Number(dados?.itcmdValor) || 0;
      const honorariosTaxa = Number(dados?.honorariosTaxa) || 0;
      const honorariosValor = Number(dados?.honorariosValor) || 0;
      const custasTaxa = Number(dados?.custasTaxa) || 0;
      const custasValor = Number(dados?.custasValor) || 0;
      const prejuizoAtual = Number(dados?.prejuizoAtual) || (itcmdValor + honorariosValor + custasValor);
      const totalProjetado = Number(dados?.totalProjetado) || 0;
      const prejuizoProjetado = Number(dados?.prejuizoProjetado) || 0;

      const liquidoAtual = Math.max(0, totalAtual - prejuizoAtual);
      const liquidoProjetado = Math.max(0, totalProjetado - prejuizoProjetado);

      const pctErosaoAtual = totalAtual > 0 ? (prejuizoAtual / totalAtual) * 100 : 0;
      const pctErosaoProjetada = totalProjetado > 0 ? (prejuizoProjetado / totalProjetado) * 100 : 0;
      const pctPreservadoAtual = totalAtual > 0 ? (liquidoAtual / totalAtual) * 100 : 0;
      const pctPreservadoProjetado = totalProjetado > 0 ? (liquidoProjetado / totalProjetado) * 100 : 0;
      const deltaPerda = Math.max(0, prejuizoProjetado - prejuizoAtual);

      const taxaTotal = itcmdTaxa + honorariosTaxa + custasTaxa || 1;
      const itcmdProjetado = prejuizoProjetado * (itcmdTaxa / taxaTotal);
      const honorariosProjetado = prejuizoProjetado * (honorariosTaxa / taxaTotal);
      const custasProjetado = Math.max(0, prejuizoProjetado - itcmdProjetado - honorariosProjetado);

      // Injeta textos centrais dos Donuts e títulos de card
      const elTxtTotalAtual = document.getElementById("donut_total_atual_txt");
      const elTxtTotalProj = document.getElementById("donut_total_projetado_txt");
      const elCenterPctAtual = document.getElementById("donut_center_atual_pct");
      const elCenterValAtual = document.getElementById("donut_center_atual_val");
      const elCenterPctProj = document.getElementById("donut_center_futuro_pct");
      const elCenterValProj = document.getElementById("donut_center_futuro_val");

      if (elTxtTotalAtual) elTxtTotalAtual.innerText = "R$ " + totalAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
      if (elTxtTotalProj) elTxtTotalProj.innerText = "R$ " + totalProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
      if (elCenterPctAtual) elCenterPctAtual.innerText = "-" + pctErosaoAtual.toFixed(1).replace(".", ",") + "%";
      if (elCenterValAtual) elCenterValAtual.innerText = "R$ " + prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
      if (elCenterPctProj) elCenterPctProj.innerText = "-" + pctErosaoProjetada.toFixed(1).replace(".", ",") + "%";
      if (elCenterValProj) elCenterValProj.innerText = "R$ " + prejuizoProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

      // Injeta legenda da Opção 3 (Donuts)
      const legendaContainer = document.getElementById("erosao_legenda_container");
      if (legendaContainer) {
        legendaContainer.innerHTML = `
          <div class="legenda-item"><span class="legenda-dot" style="background:#09090b;"></span><span class="legenda-texto"><strong>Patrimônio Preservado</strong> (Herança Líquida)</span></div>
          <div class="legenda-item"><span class="legenda-dot" style="background:#ef4444;"></span><span class="legenda-texto"><strong>(-) ITCMD</strong></span></div>
          <div class="legenda-item"><span class="legenda-dot" style="background:#f97316;"></span><span class="legenda-texto"><strong>(-) Honorários</strong></span></div>
          <div class="legenda-item"><span class="legenda-dot" style="background:#eab308;"></span><span class="legenda-texto"><strong>(-) Custas</strong></span></div>
        `;
      }

      // Injeta micro-cards de KPI da Opção 3 (Donuts)
      const kpisGrid = document.getElementById("erosao_kpis_grid_container");
      if (kpisGrid) {
        kpisGrid.innerHTML = `
          <div class="erosao-kpi-card">
            <span class="kpi-label">Preservação no Cenário Atual</span>
            <span class="kpi-valor" style="color: #09090b;">${pctPreservadoAtual.toFixed(1).replace(".", ",")}% da herança</span>
            <span class="kpi-sub">R$ ${liquidoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} líquidos entregues</span>
          </div>
          <div class="erosao-kpi-card">
            <span class="kpi-label">Preservação na Projeção Futura</span>
            <span class="kpi-valor" style="color: #09090b;">${pctPreservadoProjetado.toFixed(1).replace(".", ",")}% da herança</span>
            <span class="kpi-sub">R$ ${liquidoProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} líquidos entregues</span>
          </div>
          <div class="erosao-kpi-card kpi-alerta">
            <span class="kpi-label">Aumento da Perda por Espera</span>
            <span class="kpi-valor cor-alerta">+ R$ ${deltaPerda.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
            <span class="kpi-sub">Custo de não planejar com antecedência</span>
          </div>
        `;
      }

      if (!window.Chart) return;

      const helperConfigDonut = (labels, dataValues, totalBase) => ({
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: dataValues,
            backgroundColor: [
              '#09090b', // Preservado
              '#ef4444', // ITCMD
              '#f97316', // Honorários
              '#eab308'  // Custas
            ],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 4
          }]
        },
        options: {
          cutout: '72%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#09090b',
              titleFont: { family: 'Outfit', size: 12, weight: '700' },
              bodyFont: { family: 'Outfit', size: 11.5 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const val = Number(context.raw) || 0;
                  const pct = totalBase > 0 ? ((val / totalBase) * 100).toFixed(1).replace('.', ',') + '%' : '0%';
                  return ` ${context.label}: R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${pct})`;
                }
              }
            },
            datalabels: { display: false }
          }
        }
      });

      // Renderiza Donut Atual
      const canvasAtual = document.getElementById(canvasAtualId);
      if (canvasAtual) {
        if (this.instancias[canvasAtualId]) {
          try { this.instancias[canvasAtualId].destroy(); } catch (_) {}
        }
        const ctxA = canvasAtual.getContext('2d');
        this.instancias[canvasAtualId] = new Chart(
          ctxA,
          helperConfigDonut(
            ['Patrimônio Preservado', 'ITCMD Estadual', 'Honorários Advocatícios', 'Custas Cartorárias'],
            [liquidoAtual, itcmdValor, honorariosValor, custasValor],
            totalAtual
          )
        );
      }

      // Renderiza Donut Futuro
      const canvasFuturo = document.getElementById(canvasFuturoId);
      if (canvasFuturo) {
        if (this.instancias[canvasFuturoId]) {
          try { this.instancias[canvasFuturoId].destroy(); } catch (_) {}
        }
        const ctxF = canvasFuturo.getContext('2d');
        this.instancias[canvasFuturoId] = new Chart(
          ctxF,
          helperConfigDonut(
            ['Patrimônio Preservado Projetado', 'ITCMD Projetado', 'Honorários Projetados', 'Custas Projetadas'],
            [liquidoProjetado, itcmdProjetado, honorariosProjetado, custasProjetado],
            totalProjetado
          )
        );
      }
    }
  };

  window.TributarioCharts = TributarioCharts;
})(window);
