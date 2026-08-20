// =============================================================================
// renda_passiva.js — Lógica de Interface do Simulador de Renda Passiva
// Whealth Planner Pro — Ritmo Wealth Pro
// =============================================================================

let graficoRendaPassiva = null;

// ─── INICIALIZAÇÃO ──────────────────────────────────────────────────────────

window.onload = async function () {
  // Puxa patrimônio da sessão
  const totalSalvo = sessionStorage.getItem("total_patrimonio");
  const totalGeral = totalSalvo ? Number(totalSalvo) : 0;

  // Exibe patrimônio inicial
  const elPatrimonio = document.getElementById("rp_patrimonio_inicial");
  if (elPatrimonio) {
    elPatrimonio.value = totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  }

  // Restaura inputs salvos
  const salvos = window.AppState ? window.AppState.getRendaPassivaInputs() : null;
  if (salvos) {
    setInputValue("rp_idade_atual", salvos.idadeAtual);
    setInputValue("rp_idade_aposentadoria", salvos.idadeAposentadoria);
    setInputValue("rp_idade_final", salvos.idadeFinal);
    if (salvos.rendaDesejada) {
      document.getElementById("rp_renda_desejada").value =
        salvos.rendaDesejada.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    }
    if (salvos.aporteMensal) {
      document.getElementById("rp_aporte_mensal").value =
        salvos.aporteMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    }
    if (salvos.rentabilidadeAnual) {
      document.getElementById("rp_rentabilidade").value =
        salvos.rentabilidadeAnual.toFixed(2).replace(".", ",");
    }
    if (salvos.inflacaoAnual) {
      document.getElementById("rp_inflacao").value =
        salvos.inflacaoAnual.toFixed(2).replace(".", ",");
    }
  }

  // Configura máscaras de input
  setupMascaras();

  // Primeira simulação automática
  simularRendaPassiva();
};

// ─── MÁSCARAS DE INPUT ──────────────────────────────────────────────────────

function setupMascaras() {
  // Moeda
  ["rp_renda_desejada", "rp_aporte_mensal"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function (e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value) {
        value = (Number(value) / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        e.target.value = value;
      }
    });
  });

  // Percentual
  ["rp_rentabilidade", "rp_inflacao"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function (e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value) {
        value = (Number(value) / 100).toFixed(2).replace(".", ",");
        e.target.value = value;
      } else {
        e.target.value = "0,00";
      }
    });
  });
}

// ─── PARSING DE INPUTS ──────────────────────────────────────────────────────

function parseValorBR(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  let val = el.value;
  if (!val) return 0;
  return Number(val.replace(/[R$\s.]/g, "").replace(",", ".")) || 0;
}

function setInputValue(id, valor) {
  const el = document.getElementById(id);
  if (el) el.value = valor;
}

// ─── SIMULAÇÃO PRINCIPAL ────────────────────────────────────────────────────

function simularRendaPassiva() {
  const totalPatrimonio = Number(sessionStorage.getItem("total_patrimonio")) || 0;

  const idadeAtual = Number(document.getElementById("rp_idade_atual").value) || 50;
  const idadeAposentadoria = Number(document.getElementById("rp_idade_aposentadoria").value) || 60;
  const idadeFinal = Number(document.getElementById("rp_idade_final").value) || 95;
  const aporteMensal = parseValorBR("rp_aporte_mensal");
  const rentabilidadeAnual = parseValorBR("rp_rentabilidade") / 100;
  const inflacaoAnual = parseValorBR("rp_inflacao") / 100;

  // Validações
  if (idadeAposentadoria <= idadeAtual) {
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast("A idade de aposentadoria deve ser maior que a idade atual.", "warning");
    }
    return;
  }

  // Simula com o engine
  const resultado = window.RendaPassivaEngine.simularCompleto({
    patrimonioAtual: totalPatrimonio,
    aporteMensal,
    rentabilidadeAnual,
    inflacaoAnual,
    idadeAtual,
    idadeAposentadoria,
    idadeFinal
  });

  // Atualiza KPIs
  atualizarKPIs(resultado, totalPatrimonio);

  // Atualiza cenários
  atualizarCenarios(resultado);

  // Renderiza gráfico
  renderizarGrafico(resultado);

  // Monta tabela de projeção
  montarTabelaProjecao(resultado);

  // Gera resumo narrativo
  gerarResumoNarrativo(resultado, totalPatrimonio);

  // Simula 3 cenários macro
  simularCenariosMacro(totalPatrimonio, aporteMensal, idadeAtual, idadeAposentadoria, idadeFinal);

  // Salva inputs na sessão
  salvarInputs(idadeAtual, idadeAposentadoria, idadeFinal, aporteMensal, rentabilidadeAnual, inflacaoAnual);

  // Salva resultados
  if (window.AppState) {
    window.AppState.setRendaPassivaResultados(resultado.resumo);
  }

  // Auto-save
  if (typeof dbAutoSalvar === "function") dbAutoSalvar();
}

// ─── ATUALIZAR KPIs ─────────────────────────────────────────────────────────

function atualizarKPIs(resultado, patrimonioAtual) {
  const fmt = v => "R$ " + Math.round(v).toLocaleString("pt-BR");

  document.getElementById("kpi_patrimonio_atual").innerText = fmt(patrimonioAtual);
  document.getElementById("kpi_patrimonio_projetado").innerText = fmt(resultado.resumo.patrimonioAposentadoria);
  document.getElementById("kpi_patrimonio_idade").innerText = `aos ${resultado.resumo.idadeAposentadoria} anos`;
  document.getElementById("kpi_renda_passiva").innerText = fmt(resultado.resumo.rendaPreservacao) + "/mês";
  document.getElementById("kpi_renda_consumo").innerText = fmt(resultado.resumo.rendaConsumo) + "/mês";
  document.getElementById("kpi_renda_consumo_sub").innerText = `dos ${resultado.resumo.idadeAposentadoria} aos ${resultado.resumo.idadeFinal} anos`;
  document.getElementById("kpi_taxa_real").innerText = (resultado.resumo.taxaReal * 100).toFixed(2).replace(".", ",") + "% a.a.";
}

// ─── ATUALIZAR CENÁRIOS ─────────────────────────────────────────────────────

function atualizarCenarios(resultado) {
  const fmt = v => "R$ " + Math.round(v).toLocaleString("pt-BR");

  document.getElementById("cenario_preservacao_valor").innerText = fmt(resultado.desacumulacao.preservacao.rendaMensalReal);
  document.getElementById("cenario_preservacao_sub").innerText = "por mês (em valores de hoje)";

  document.getElementById("cenario_consumo_valor").innerText = fmt(resultado.desacumulacao.consumo.rendaMensalReal);
  document.getElementById("cenario_consumo_sub").innerText =
    `por mês dos ${resultado.resumo.idadeAposentadoria} aos ${resultado.resumo.idadeFinal} anos`;
}

// ─── RENDERIZAR GRÁFICO ─────────────────────────────────────────────────────

function renderizarGrafico(resultado) {
  const ctx = document.getElementById("graficoRendaPassiva").getContext("2d");
  const timeline = resultado.linhaDoTempo;

  const labels = timeline.map(p => `${p.idade} anos`);
  const nominal = timeline.map(p => p.patrimonioNominal);
  const real = timeline.map(p => p.patrimonioReal);

  // Gradient para acumulação
  const gradAcum = ctx.createLinearGradient(0, 0, 0, 340);
  gradAcum.addColorStop(0, "rgba(16, 185, 129, 0.2)");
  gradAcum.addColorStop(1, "rgba(16, 185, 129, 0.0)");

  // Encontra o ponto de transição (aposentadoria)
  const idxTransicao = timeline.findIndex(p => p.fase === 'desacumulacao');

  // Dataset segmentado por fase
  const segmentColor = (ctx) => {
    const idx = ctx.p1DataIndex;
    return idx >= idxTransicao ? '#2563EB' : '#10B981';
  };

  if (graficoRendaPassiva) {
    graficoRendaPassiva.destroy();
  }

  graficoRendaPassiva = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Patrimônio Nominal",
          data: nominal,
          borderColor: '#10B981',
          backgroundColor: gradAcum,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#10B981",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
          segment: {
            borderColor: ctx => {
              const idx = ctx.p1DataIndex;
              return idx >= idxTransicao ? '#2563EB' : '#10B981';
            }
          }
        },
        {
          label: "Patrimônio Real (hoje)",
          data: real,
          borderColor: "#F59E0B",
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          titleColor: "#000",
          bodyColor: "#000",
          borderColor: "#e1e8f0",
          borderWidth: 1,
          padding: 14,
          displayColors: true,
          callbacks: {
            label: function (context) {
              const val = context.raw;
              return context.dataset.label + ": R$ " + Math.round(val).toLocaleString("pt-BR");
            }
          }
        },
        // Linha vertical na aposentadoria
        annotation: undefined
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 12,
            font: { size: 11 }
          }
        },
        y: {
          beginAtZero: false,
          ticks: {
            callback: value => {
              if (value >= 1000000000) return "R$ " + (value / 1000000000).toFixed(1) + "B";
              if (value >= 1000000) return "R$ " + (value / 1000000).toFixed(1) + "M";
              if (value >= 1000) return "R$ " + (value / 1000).toFixed(0) + "k";
              return "R$ " + value;
            },
            font: { size: 11 }
          },
          grid: { color: "rgba(0,0,0,0.04)" }
        }
      }
    }
  });
}

// ─── TABELA DE PROJEÇÃO ─────────────────────────────────────────────────────

function montarTabelaProjecao(resultado) {
  const container = document.getElementById("tabela_projecao_container");
  const tbody = document.getElementById("tabela_projecao_body");
  if (!container || !tbody) return;

  container.style.display = "block";
  tbody.innerHTML = "";

  const fmt = v => "R$ " + Math.round(v).toLocaleString("pt-BR");
  const timeline = resultado.linhaDoTempo;

  // Mostra a cada 5 anos para não poluir
  const anosFiltrados = timeline.filter((p, i) => i === 0 || p.ano % 5 === 0 || p.fase === 'desacumulacao' && p.ano === 0 || i === timeline.length - 1);

  anosFiltrados.forEach(p => {
    const tr = document.createElement("tr");
    const faseLabel = p.fase === 'acumulacao' ? '📈 Acumulação' : '📉 Renda';
    const rendaMensal = p.rendaMensalReal ? fmt(p.rendaMensalReal) : '—';

    tr.innerHTML = `
      <td>${p.idade} anos</td>
      <td class="valor-destaque">${fmt(p.patrimonioNominal)}</td>
      <td>${fmt(p.patrimonioReal)}</td>
      <td>${rendaMensal}</td>
      <td>${faseLabel}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── RESUMO NARRATIVO ───────────────────────────────────────────────────────

function gerarResumoNarrativo(resultado, patrimonioAtual) {
  const el = document.getElementById("resumo_narrativo");
  if (!el) return;

  el.style.display = "block";
  const r = resultado.resumo;
  const fmt = v => "<span class='valor-inline'>R$ " + Math.round(v).toLocaleString("pt-BR") + "</span>";

  el.innerHTML = `
    <strong>📋 Resumo do Planejamento</strong><br><br>
    O cliente possui hoje um patrimônio financeiro de ${fmt(patrimonioAtual)}.
    Mantendo as premissas de rentabilidade e aportes configurados, o patrimônio poderá atingir
    ${fmt(r.patrimonioAposentadoria)} aos <strong>${r.idadeAposentadoria} anos</strong>
    (equivalente a ${fmt(r.patrimonioAposentadoriaReal)} em valores de hoje).<br><br>

    <strong>Cenário 1 — Preservação do Capital:</strong> Será possível retirar aproximadamente
    ${fmt(r.rendaPreservacao)} por mês sem consumir o principal, mantendo o patrimônio intacto em termos reais.<br><br>

    <strong>Cenário 2 — Consumo Gradual:</strong> Será possível retirar aproximadamente
    ${fmt(r.rendaConsumo)} por mês, corrigidos pela inflação, dos
    <strong>${r.idadeAposentadoria} aos ${r.idadeFinal} anos</strong>, consumindo o patrimônio gradualmente.<br><br>

    A rentabilidade real estimada (acima da inflação) é de
    <span class="valor-inline">${(r.taxaReal * 100).toFixed(2).replace(".", ",")}% ao ano</span>.
  `;
}

// ─── CENÁRIOS MACROECONÔMICOS ───────────────────────────────────────────────

function simularCenariosMacro(patrimonio, aporte, idadeAtual, idadeApos, idadeFinal) {
  const container = document.getElementById("macro_cenarios_container");
  if (!container) return;

  const cenarios = window.RendaPassivaEngine.simularCenarios({
    patrimonioAtual: patrimonio,
    aporteMensal: aporte,
    idadeAtual,
    idadeAposentadoria: idadeApos,
    idadeFinal
  });

  const nomes = {
    conservador: { label: '🛡️ Conservador', desc: 'Premissas cautelosas' },
    base: { label: '⚖️ Base', desc: 'Cenário mais provável' },
    otimista: { label: '🚀 Otimista', desc: 'Premissas favoráveis' }
  };

  container.innerHTML = "";

  Object.entries(cenarios).forEach(([nome, resultado]) => {
    const info = nomes[nome] || { label: nome, desc: '' };
    const fmt = v => "R$ " + Math.round(v).toLocaleString("pt-BR");

    const card = document.createElement("div");
    card.className = "macro-card" + (nome === 'base' ? ' active' : '');
    card.innerHTML = `
      <div class="macro-nome">${info.label}</div>
      <div class="macro-patrimonio">${fmt(resultado.resumo.patrimonioAposentadoria)}</div>
      <div class="macro-renda">Renda: ${fmt(resultado.resumo.rendaPreservacao)}/mês</div>
      <div class="macro-premissas">
        <div class="macro-premissa-item">
          <span>Selic</span>
          <span>${(resultado.premissas.selic * 100).toFixed(1)}%</span>
        </div>
        <div class="macro-premissa-item">
          <span>IPCA</span>
          <span>${(resultado.premissas.ipca * 100).toFixed(1)}%</span>
        </div>
        <div class="macro-premissa-item">
          <span>Rentabilidade</span>
          <span>${(resultado.premissas.rentabilidade * 100).toFixed(1)}%</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ─── SALVAR INPUTS ──────────────────────────────────────────────────────────

function salvarInputs(idadeAtual, idadeAposentadoria, idadeFinal, aporteMensal, rentabilidade, inflacao) {
  if (window.AppState) {
    window.AppState.setRendaPassivaInputs({
      idadeAtual,
      idadeAposentadoria,
      idadeFinal,
      rendaDesejada: parseValorBR("rp_renda_desejada"),
      aporteMensal,
      rentabilidadeAnual: rentabilidade * 100,
      inflacaoAnual: inflacao * 100
    });
  }
}

// ─── RESET ──────────────────────────────────────────────────────────────────

function resetarRendaPassiva() {
  document.getElementById("rp_idade_atual").value = 50;
  document.getElementById("rp_idade_aposentadoria").value = 60;
  document.getElementById("rp_idade_final").value = 95;
  document.getElementById("rp_renda_desejada").value = "50.000,00";
  document.getElementById("rp_aporte_mensal").value = "0,00";
  document.getElementById("rp_rentabilidade").value = "10,00";
  document.getElementById("rp_inflacao").value = "5,00";
  simularRendaPassiva();
}
