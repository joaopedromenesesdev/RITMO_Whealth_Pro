let graficoGeral, graficoAplicacoes, graficoImoveis, graficoEmpresas;
Chart.register(ChartDataLabels);

// =========================
// CARREGAR DADOS
// =========================
window.onload = function () {

  let total = Number(sessionStorage.getItem("total_patrimonio")) || 0;

  document.getElementById("total_pdf").innerText =
    "R$ " + total.toLocaleString("pt-BR");

  document.getElementById("data_pdf").innerText =
    sessionStorage.getItem("data_reuniao") || new Date().toLocaleDateString("pt-BR");

  const dados = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};

  let rf = parseValor(dados.rf);
  let rv = parseValor(dados.rv);
  let inter = parseValor(dados.inter);
  let prev = parseValor(dados.prev);
  let offshore = parseValor(dados.offshore);

  let apt = parseValor(dados.apt);
  let casa = parseValor(dados.casa);
  let terr = parseValor(dados.terr);
  let galp = parseValor(dados.galp);

  let bens = parseValor(dados.bens);

  let totalEmpresas = 0;

  if (dados.empresas) {
    dados.empresas.forEach(emp => {
      let valor = parseValor(emp.valor);
      let pct = Number(emp.pct) || 0;
      totalEmpresas += valor * (pct / 100);
    });
  }

  let totalA = rf + rv + inter + prev + offshore;
  let totalI = apt + casa + terr + galp + parseValor(dados.bens_particulares);

  criarGraficos(dados);
  renderizarGraficoEvolucao();
  renderizarEstruturaFamiliar();
  initPrejuizo();
  renderizarNotasRelatorio(document);

  // Verifica se deve abrir o preview do PDF automaticamente
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("preview") === "true") {
    setTimeout(() => {
      abrirPreview();
    }, 600);
  }
};

// =========================
// ESTRUTURA FAMILIAR
// =========================
function renderizarEstruturaFamiliar() {
  const familiaStr = sessionStorage.getItem("familia");
  if (!familiaStr) return;

  const familia = JSON.parse(familiaStr);

  // Nome do cliente na capa
  const nomeCapa = document.getElementById("nome_cliente_capa");
  if (nomeCapa) {
    nomeCapa.innerText = familia.nome ? familia.nome : "Cliente";
  }

  // Container para os detalhes da família
  const container = document.getElementById("estrutura_familiar_container");
  if (!container) return;

  let html = `<h3>Estrutura Familiar</h3><ul>`;

  // Dados principais
  if (familia.estadoCivil) {
    html += `<li><strong>Estado Civil:</strong> <span style="text-transform: capitalize;">${escapeHTML(familia.estadoCivil)}</span></li>`;
  }
  if (familia.estadoCivil === "casado" && familia.conjuge) {
    html += `<li><strong>Cônjuge:</strong> ${escapeHTML(familia.conjuge)}</li>`;
    if (familia.regime) {
      html += `<li><strong>Regime de Casamento:</strong> ${escapeHTML(familia.regime)}</li>`;
    }
  }

  // Filhos
  if (familia.temFilhos === "sim" && familia.qtdFilhos) {
    html += `<li><strong>Filhos:</strong> ${familia.qtdFilhos}</li>`;
    if (familia.idadesFilhos && familia.idadesFilhos.length > 0) {
      const idades = familia.idadesFilhos.filter(i => i !== "").join(", ");
      if (idades) {
        html += `<li><strong>Idades dos filhos:</strong> ${idades} anos</li>`;
      }
    }
  }

  // Pais
  if (familia.possuiPais === "sim" && familia.qtdPais) {
    html += `<li><strong>Pais vivos (Ascendentes):</strong> ${familia.qtdPais}</li>`;
  }

  // Colaterais
  if (familia.possuiColaterais === "sim" && familia.qtdColaterais) {
    html += `<li><strong>Parentes Colaterais:</strong> ${familia.qtdColaterais}`;
    if (familia.tipoColaterais) {
      html += ` (${familia.tipoColaterais})`;
    }
    html += `</li>`;
  }

  // --- Dados Cônjuge Extra ---
  if (familia.estadoCivil === "casado") {
    if (familia.conjugePossuiPais === "sim" && familia.conjugeQtdPais) {
      html += `<li><strong>Pais vivos do Cônjuge:</strong> ${familia.conjugeQtdPais}</li>`;
    }
    if (familia.conjugePossuiColaterais === "sim" && familia.conjugeQtdColaterais) {
      html += `<li><strong>Colaterais do Cônjuge:</strong> ${familia.conjugeQtdColaterais}`;
      if (familia.conjugeTipoColaterais) {
        html += ` (${familia.conjugeTipoColaterais})`;
      }
      html += `</li>`;
    }
  }

  html += `</ul>`;
  container.innerHTML = html;
}

// =========================
// PARSE MAIS ROBUSTO (corrigido)
// =========================
function parseValor(v) {
  if (!v) return 0;

  return Number(
    String(v)
      .replace(/\s/g, "")
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
  ) || 0;
}


// =========================
// EVOLUÇÃO PATRIMONIAL
// =========================
let graficoEvolucao;

function renderizarGraficoEvolucao(scope = document) {

  let dadosEvolucaoStr = sessionStorage.getItem("evolucao_dados");
  let aviso = document.getElementById("aviso_evolucao");
  let canvasContainer = document.querySelector(".grafico-evolucao-pdf");

  if (!dadosEvolucaoStr) {
    if (aviso) aviso.style.display = "block";
    if (canvasContainer) canvasContainer.style.display = "none";
    return;
  }

  if (aviso) aviso.style.display = "none";
  if (canvasContainer) canvasContainer.style.display = "block";

  let dadosEvolucao = JSON.parse(dadosEvolucaoStr);
  let anos = dadosEvolucao.anos;
  let resultados = dadosEvolucao.resultados;

  const ctx = scope.querySelector("#grafico_evolucao") || document.getElementById("grafico_evolucao");
  if (!ctx) return;

  if (graficoEvolucao && scope === document) graficoEvolucao.destroy();

  // Sanitização e formatação limpa das labels ("Ano 0", "Ano 1", etc.)
  const labelsLimpos = anos.map(a => {
    let raw = String(a).replace(/anos?/gi, '').replace(/ano/gi, '').trim();
    return raw !== '' ? `Ano ${raw}` : String(a);
  });

  // Criar gradiente de fundo azul transparente elegante
  const canvasCtx = ctx.getContext ? ctx.getContext('2d') : null;
  let bgGradient = "rgba(11, 83, 184, 0.08)";
  if (canvasCtx && canvasCtx.createLinearGradient) {
    bgGradient = canvasCtx.createLinearGradient(0, 0, 0, 300);
    bgGradient.addColorStop(0, "rgba(11, 83, 184, 0.25)");
    bgGradient.addColorStop(0.7, "rgba(11, 83, 184, 0.03)");
    bgGradient.addColorStop(1, "rgba(11, 83, 184, 0.0)");
  }

  // Recuperar premissas globais salvas como fallback 2
  let mercadoPremissas = {};
  try {
    const rawPremissas = sessionStorage.getItem("mercado_premissas");
    if (rawPremissas) mercadoPremissas = JSON.parse(rawPremissas) || {};
  } catch (e) { }

  // Função para extrair a taxa anual (% a.a.) com fallback em 3 níveis:
  // 1. Propriedade direta no objeto dadosEvolucao
  // 2. Objeto mercado_premissas no sessionStorage
  // 3. Cálculo matemático reverso a partir da curva de pontos ((v1 - aporte) / v0 - 1)
  const extrairTaxaAnualNum = (propVal, premissaKey, arr) => {
    if (propVal !== undefined && propVal !== null && propVal !== "") {
      let clean = String(propVal).replace("%", "").replace(",", ".").trim();
      let num = Number(clean);
      if (!isNaN(num) && num > 0) return num;
    }
    if (premissaKey && mercadoPremissas[premissaKey]) {
      let clean = String(mercadoPremissas[premissaKey]).replace("%", "").replace(",", ".").trim();
      let num = Number(clean);
      if (!isNaN(num) && num > 0) return num;
    }
    if (Array.isArray(arr) && arr.length >= 2) {
      let baseIdx = 0;
      while (baseIdx < arr.length - 1 && Number(arr[baseIdx]) === 0) {
        baseIdx++;
      }
      if (baseIdx < arr.length - 1) {
        let v0 = Number(arr[baseIdx]);
        let v1 = Number(arr[baseIdx + 1]);
        let ap = Number(dadosEvolucao.aporteAnual || 0);
        if (v0 > 0) {
          let rate = ((v1 - ap) / v0) - 1;
          if (rate > 0 && !isNaN(rate)) {
            return Number((rate * 100).toFixed(2));
          }
        }
      }
    }
    return 0;
  };

  const formatarTaxaAA = (num) => {
    if (!num || isNaN(num) || num <= 0) return "";
    return num.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + "% a.a.";
  };

  const numTaxaProj = extrairTaxaAnualNum(dadosEvolucao.taxa, null, resultados);
  const numTaxaCDI = extrairTaxaAnualNum(dadosEvolucao.cdiTaxa, "cdi", dadosEvolucao.cdi);
  const numTaxaIPCA = extrairTaxaAnualNum(dadosEvolucao.ipcaTaxa, "ipca", dadosEvolucao.ipca);

  const strTaxaProj = formatarTaxaAA(numTaxaProj);
  const strTaxaCDI = formatarTaxaAA(numTaxaCDI);
  const strTaxaIPCA = formatarTaxaAA(numTaxaIPCA);

  const valFinalPat = resultados && resultados.length > 0 ? resultados[resultados.length - 1] : 0;
  const strFinalPat = "R$ " + Number(valFinalPat || 0).toLocaleString("pt-BR");
  const labelPat = `Projeção Estimada ${strTaxaProj ? "(" + strTaxaProj + " - " + strFinalPat + ")" : "(" + strFinalPat + ")"}`;

  const datasets = [{
    label: labelPat,
    data: resultados,
    borderColor: "#0B53B8",
    backgroundColor: bgGradient,
    borderWidth: 3,
    tension: 0.35,
    clip: false,
    pointBackgroundColor: "#ffffff",
    pointBorderColor: "#0B53B8",
    pointBorderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointHoverBackgroundColor: "#0B53B8",
    pointHoverBorderColor: "#ffffff",
    pointHoverBorderWidth: 2,
    fill: true
  }];

  // Adiciona dataset de CDI Projetado se disponível na simulação
  if (Array.isArray(dadosEvolucao.cdi) && dadosEvolucao.cdi.length > 0 && dadosEvolucao.cdi.some(v => Number(v) > 0)) {
    const valFinalCDI = dadosEvolucao.cdi[dadosEvolucao.cdi.length - 1];
    const strFinalCDI = "R$ " + Number(valFinalCDI || 0).toLocaleString("pt-BR");
    const labelCDI = `CDI ${strTaxaCDI ? "(" + strTaxaCDI + " - " + strFinalCDI + ")" : "(" + strFinalCDI + ")"}`;
    datasets.push({
      label: labelCDI,
      data: dadosEvolucao.cdi,
      borderColor: "#1D6F42",
      borderDash: [5, 5],
      borderWidth: 2,
      tension: 0.35,
      clip: false,
      pointRadius: 0,
      pointHoverRadius: 5,
      fill: false
    });
  }

  // Adiciona dataset de IPCA Projetado se disponível na simulação
  if (Array.isArray(dadosEvolucao.ipca) && dadosEvolucao.ipca.length > 0 && dadosEvolucao.ipca.some(v => Number(v) > 0)) {
    const valFinalIPCA = dadosEvolucao.ipca[dadosEvolucao.ipca.length - 1];
    const strFinalIPCA = "R$ " + Number(valFinalIPCA || 0).toLocaleString("pt-BR");
    const labelIPCA = `IPCA ${strTaxaIPCA ? "(" + strTaxaIPCA + " - " + strFinalIPCA + ")" : "(" + strFinalIPCA + ")"}`;
    datasets.push({
      label: labelIPCA,
      data: dadosEvolucao.ipca,
      borderColor: "#e53935",
      borderDash: [5, 5],
      borderWidth: 2,
      tension: 0.35,
      clip: false,
      pointRadius: 0,
      pointHoverRadius: 5,
      fill: false
    });
  }

  const newChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labelsLimpos,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      layout: {
        padding: {
          top: 25,
          right: 30,
          bottom: 12,
          left: 15
        }
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { size: 10.5, family: "Outfit", weight: "600" },
            color: "#334155"
          }
        },
        datalabels: { display: false },
        tooltip: {
          backgroundColor: "rgba(10, 27, 55, 0.95)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: context => context.dataset.label + ": R$ " + Number(context.raw || 0).toLocaleString("pt-BR")
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#64748b",
            font: { size: 11, weight: "500", family: "Outfit" },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: 7
          }
        },
        y: {
          grace: "15%",
          grid: {
            color: "rgba(226, 232, 240, 0.7)",
            drawBorder: false
          },
          ticks: {
            color: "#64748b",
            font: { size: 11, weight: "500", family: "Outfit" },
            callback: v => {
              const num = Number(v);
              if (num >= 1000000) {
                return "R$ " + (num / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " Mi";
              }
              return "R$ " + num.toLocaleString("pt-BR");
            }
          }
        }
      }
    }
  });
  if (scope === document) graficoEvolucao = newChart;
}


// =========================
// FORMATAR PERCENTUAL
// =========================
function formatarPercentual(v) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + "%";
}

// =========================
// Helper de Renderização de Legenda em HTML para o Relatório PDF
function renderizarLegendaPDF(scope, containerId, labels, data, colors, isPercent) {
  if (scope === document) return;
  const container = scope.querySelector("#" + containerId);
  if (!container) return;

  const legendCol = container.querySelector(".pdf-chart-legend-col");
  if (!legendCol) return;

  if (labels[0] === "Sem dados") {
    legendCol.innerHTML = `<span style="font-size:12px; color:#94a3b8; font-style:italic;">Sem dados cadastrados</span>`;
    return;
  }

  const total = data.reduce((a, b) => a + (b || 0), 0);
  let html = `<ul class="pdf-legend-list">`;

  labels.forEach((label, i) => {
    const val = data[i] || 0;
    if (val <= 0) return; // Oculta itens zerados no relatório
    const color = colors[i] || colors[0];
    let pctStr = isPercent
      ? val.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"
      : "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    html += `
      <li>
        <span class="pdf-legend-dot" style="background-color: ${color};"></span>
        <span class="pdf-legend-text">${label} <strong class="pdf-legend-pct">(${pctStr})</strong></span>
      </li>
    `;
  });

  html += `</ul>`;
  legendCol.innerHTML = html;
}

// CONFIG BASE DOS GRÁFICOS
// =========================
function baseOptions(isPercent = true, animationDuration = 1000, isReport = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "50%",
    layout: { padding: 0 },
    animation: { duration: animationDuration },
    plugins: {
      legend: {
        display: !isReport,
        position: "bottom",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: isReport ? 10 : 12,
          boxWidth: 8,
          boxHeight: 8,
          font: { family: "'Inter', sans-serif", size: 11, weight: "500" },
          color: "#475569",
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              const dataset = data.datasets[0];
              const total = dataset.data.reduce((acc, v) => acc + (v || 0), 0);
              return data.labels.map((label, i) => {
                const val = dataset.data[i] || 0;
                let pctStr = "";
                if (data.labels[0] !== "Sem dados") {
                  if (isPercent) {
                    pctStr = ` (${val.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)`;
                  } else {
                    pctStr = ` (R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
                  }
                }
                const fillStyle = Array.isArray(dataset.backgroundColor)
                  ? dataset.backgroundColor[i]
                  : dataset.backgroundColor;
                return {
                  text: `${label}${pctStr}`,
                  fillStyle: fillStyle,
                  strokeStyle: fillStyle,
                  lineWidth: 0,
                  pointStyle: "circle",
                  hidden: !chart.isDatasetVisible(0) || (chart.getDatasetMeta(0).data[i] && chart.getDatasetMeta(0).data[i].hidden),
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleFont: { size: 12, weight: "600" },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: ctx => {
            const val = ctx.raw || 0;
            return isPercent
              ? ` ${ctx.label}: ${formatarPercentual(val)}`
              : ` ${ctx.label}: R$ ${val.toLocaleString("pt-BR")}`;
          }
        }
      },
      datalabels: {
        display: false
      }
    }
  };
}

// =========================
// GRAFICOS
// =========================
function criarGraficos(dados, scope = document) {
  const coresPaleta = ["#0B53B8", "#1D6F42", "#FFB800", "#E53935", "#6F42C1", "#00B8D9", "#7A7A7A"];

  let rf = parseValor(dados.rf);
  let rv = parseValor(dados.rv);
  let inter = parseValor(dados.inter);
  let prev = parseValor(dados.prev);
  let offshore = parseValor(dados.offshore);

  let apt = parseValor(dados.apt);
  let casa = parseValor(dados.casa);
  let terr = parseValor(dados.terr);
  let galp = parseValor(dados.galp);
  let bens_particulares = parseValor(dados.bens_particulares);

  let bens = parseValor(dados.bens);

  let totalEmpresas = 0;
  let distribuicaoEmpresas = [];

  if (dados.empresas) {
    dados.empresas.forEach(emp => {
      let valor = parseValor(emp.valor);
      let pct = Number(emp.pct) || 0;
      let valorCliente = valor * (pct / 100);
      totalEmpresas += valorCliente;
      distribuicaoEmpresas.push(valorCliente);
    });
  }

  let totalA = rf + rv + inter + prev + offshore;
  let totalI = apt + casa + terr + galp + bens_particulares;
  let totalGeral = totalA + totalI + bens + totalEmpresas;

  // Lógica de visibilidade: Esconde se o valor for zero
  const elApp = scope.querySelector("#container_grafico_aplicacoes");
  const elImov = scope.querySelector("#container_grafico_imoveis");
  const elEmp = scope.querySelector("#container_grafico_empresas");

  if (elApp) elApp.style.setProperty("display", totalA > 0 ? "flex" : "none", "important");
  if (elImov) elImov.style.setProperty("display", totalI > 0 ? "flex" : "none", "important");
  if (elEmp) elEmp.style.setProperty("display", totalEmpresas > 0 ? "flex" : "none", "important");

  // Inteligência de Layout: Se houver 3 ou mais gráficos, empilha para maior clareza.
  const grid = scope.querySelector(".graficos-grid");
  if (grid) {
    const visiveis = [totalA, totalI, totalEmpresas].filter(v => v > 0).length + 1;
    // Se houver 2 ou 3 gráficos, empilhamos. Se houver 4, usamos 2 colunas (2x2) para caber na folha.
    if (visiveis === 2 || visiveis === 3) {
      grid.classList.add("grid-coluna-unica");
    } else {
      grid.classList.remove("grid-coluna-unica");
    }
  }

  if (totalGeral === 0) return;

  // Determina se deve animar (apenas na tela principal)
  const anim = scope === document ? 1000 : 0;

  // G1 - Geral
  let pA = (totalA / totalGeral) * 100;
  let pI = (totalI / totalGeral) * 100;
  let pB = (bens / totalGeral) * 100;
  let pE = (totalEmpresas / totalGeral) * 100;

  const isReport = scope !== document;

  const ctxGeral = scope.querySelector("#grafico_geral");
  if (ctxGeral) {
    if (graficoGeral && scope === document) graficoGeral.destroy();
    const gLabels = ["Aplicações", "Imóveis", "Bens", "Empresas"];
    const gData = [pA, pI, pB, pE];
    graficoGeral = new Chart(ctxGeral, {
      type: "doughnut",
      data: {
        labels: gLabels,
        datasets: [{ data: gData, backgroundColor: coresPaleta, borderWidth: 2, borderColor: "#ffffff", hoverOffset: 6, radius: isReport ? "85%" : "85%" }]
      },
      options: baseOptions(true, anim, isReport)
    });
    renderizarLegendaPDF(scope, "container_grafico_geral", gLabels, gData, coresPaleta, true);
  }

  // G2 - Aplicações
  let pRF = totalA ? (rf / totalA) * 100 : 0;
  let pRV = totalA ? (rv / totalA) * 100 : 0;
  let pINTER = totalA ? (inter / totalA) * 100 : 0;
  let pPREV = totalA ? (prev / totalA) * 100 : 0;
  let pOFF = totalA ? (offshore / totalA) * 100 : 0;

  const ctxApp = scope.querySelector("#grafico_aplicacoes");
  if (ctxApp) {
    if (graficoAplicacoes && scope === document) graficoAplicacoes.destroy();
    const appLabels = ["Renda Fixa", "Renda Variável", "Fundos de Investimento", "Previdência", "Offshore"];
    const appData = [pRF, pRV, pINTER, pPREV, pOFF];
    graficoAplicacoes = new Chart(ctxApp, {
      type: "doughnut",
      data: {
        labels: appLabels,
        datasets: [{ data: appData, backgroundColor: coresPaleta, borderWidth: 2, borderColor: "#ffffff", hoverOffset: 6, radius: isReport ? "85%" : "85%" }]
      },
      options: baseOptions(true, anim, isReport)
    });
    renderizarLegendaPDF(scope, "container_grafico_aplicacoes", appLabels, appData, coresPaleta, true);
  }

  // G3 - Imóveis
  let pAPT = totalI ? (apt / totalI) * 100 : 0;
  let pCASA = totalI ? (casa / totalI) * 100 : 0;
  let pTERR = totalI ? (terr / totalI) * 100 : 0;
  let pGALP = totalI ? (galp / totalI) * 100 : 0;
  let pBENS_PART = totalI ? (bens_particulares / totalI) * 100 : 0;

  const ctxImov = scope.querySelector("#grafico_imoveis");
  if (ctxImov) {
    if (graficoImoveis && scope === document) graficoImoveis.destroy();
    const imovLabels = ["Apartamento", "Casa", "Terreno", "Galpão/Imóvel Rural", "Bens Particulares"];
    const imovData = [pAPT, pCASA, pTERR, pGALP, pBENS_PART];
    graficoImoveis = new Chart(ctxImov, {
      type: "doughnut",
      data: {
        labels: imovLabels,
        datasets: [{ data: imovData, backgroundColor: coresPaleta, borderWidth: 2, borderColor: "#ffffff", hoverOffset: 6, radius: isReport ? "85%" : "85%" }]
      },
      options: baseOptions(true, anim, isReport)
    });
    renderizarLegendaPDF(scope, "container_grafico_imoveis", imovLabels, imovData, coresPaleta, true);
  }

  // G4 - Empresas
  const ctxEmp = scope.querySelector("#grafico_empresas");
  if (ctxEmp) {
    if (graficoEmpresas && scope === document) graficoEmpresas.destroy();
    const empLabels = distribuicaoEmpresas.map((_, i) => "Empresa " + (i + 1));
    graficoEmpresas = new Chart(ctxEmp, {
      type: "doughnut",
      data: {
        labels: empLabels,
        datasets: [{ data: distribuicaoEmpresas, backgroundColor: coresPaleta, borderWidth: 2, borderColor: "#ffffff", hoverOffset: 6, radius: isReport ? "85%" : "85%" }]
      },
      options: baseOptions(false, anim, isReport)
    });
    renderizarLegendaPDF(scope, "container_grafico_empresas", empLabels, distribuicaoEmpresas, coresPaleta, false);
  }
}

// Helper de Formatação de Moeda
function formatarMoeda(input) {
  let value = input.value.replace(/\D/g, "");
  if (value === "") {
    input.value = "";
    return;
  }
  let val = (Number(value) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  input.value = val;
}

function obterValorInput(input) {
  if (!input || !input.value) return 0;
  let valor = input.value
    .replace(/\./g, "")
    .replace(",", ".");
  return Number(valor) || 0;
}

function checkFilled(el) {
  if (el.value && el.value !== "0" && el.value !== "" && el.value !== "Selecione") {
    el.classList.add("filled");
  } else {
    el.classList.remove("filled");
  }
}

// =========================
// SIMULADOR DE PREJUIZO PREMIUM
// =========================
function initPrejuizo() {
  const ids = ["taxa_itcmd", "taxa_honorarios", "taxa_custas"];

  ids.forEach(id => {
    let el = document.getElementById(id);
    if (el) el.addEventListener("input", calcularPrejuizo);
  });

  const inputDoacao = document.getElementById("input_doacao_vida");
  if (inputDoacao) {
    inputDoacao.addEventListener("input", function () {
      formatarMoeda(this);
      checkFilled(this);
      salvarInputsTributario();
    });
  }

  const inputAvista = document.getElementById("input_doacao_avista");
  if (inputAvista) {
    inputAvista.addEventListener("input", function () {
      formatarMoeda(this);
      checkFilled(this);
      salvarInputsTributario();
    });
  }

  const inputPrevidencia = document.getElementById("input_previdencia");
  if (inputPrevidencia) {
    inputPrevidencia.addEventListener("input", function () {
      formatarMoeda(this);
      checkFilled(this);
      salvarInputsTributario();
    });
  }

  const inputSeguroIdade = document.getElementById("input_seguro_idade");
  if (inputSeguroIdade) {
    inputSeguroIdade.addEventListener("input", function () {
      checkFilled(this);
      salvarInputsTributario();
    });
  }

  const inputSeguroCapital = document.getElementById("input_seguro_capital");
  if (inputSeguroCapital) {
    inputSeguroCapital.addEventListener("input", function () {
      formatarMoeda(this);
      checkFilled(this);
      salvarInputsTributario();
    });
  }

  // Carrega os dados do resumo lateral
  carregarResumoSidebar();

  // Carrega valores salvos de inputs
  const salvos = JSON.parse(sessionStorage.getItem("tributario_inputs"));
  if (salvos) {
    if (salvos.uf) document.getElementById("uf_itcmd").value = salvos.uf;
    if (salvos.itcmd) document.getElementById("taxa_itcmd").value = salvos.itcmd;
    if (salvos.honorarios) document.getElementById("taxa_honorarios").value = salvos.honorarios;
    if (salvos.custas) document.getElementById("taxa_custas").value = salvos.custas;
    if (salvos.doacao) {
      if (inputDoacao) {
        const numericVal = Number(salvos.doacao) || 0;
        inputDoacao.value = Math.round(numericVal * 100).toString();
        formatarMoeda(inputDoacao);
        checkFilled(inputDoacao);
      }
    }
    if (salvos.doacao_avista) {
      if (inputAvista) {
        const numericVal = Number(salvos.doacao_avista) || 0;
        inputAvista.value = Math.round(numericVal * 100).toString();
        formatarMoeda(inputAvista);
        checkFilled(inputAvista);
      }
    }
    if (salvos.previdencia !== undefined && salvos.previdencia !== null) {
      if (inputPrevidencia) {
        const numericVal = Number(salvos.previdencia) || 0;
        if (numericVal > 0) {
          inputPrevidencia.value = Math.round(numericVal * 100).toString();
          formatarMoeda(inputPrevidencia);
          checkFilled(inputPrevidencia);
        }
      }
    }
    if (salvos.seguro_idade) {
      if (inputSeguroIdade) {
        inputSeguroIdade.value = salvos.seguro_idade;
        checkFilled(inputSeguroIdade);
      }
    }
    if (salvos.seguro_capital !== undefined && salvos.seguro_capital !== null) {
      if (inputSeguroCapital) {
        const numericVal = Number(salvos.seguro_capital) || 0;
        if (numericVal > 0) {
          inputSeguroCapital.value = Math.round(numericVal * 100).toString();
          formatarMoeda(inputSeguroCapital);
          checkFilled(inputSeguroCapital);
        }
      }
    }
  }

  // Listeners para salvar ao mudar
  document.getElementById("uf_itcmd")?.addEventListener("change", salvarInputsTributario);
  document.getElementById("taxa_itcmd")?.addEventListener("input", salvarInputsTributario);
  document.getElementById("taxa_honorarios")?.addEventListener("input", salvarInputsTributario);
  document.getElementById("taxa_custas")?.addEventListener("input", salvarInputsTributario);

  calcularPrejuizo();
}

function salvarInputsTributario() {
  const uf = document.getElementById("uf_itcmd")?.value;
  const itcmd = document.getElementById("taxa_itcmd")?.value;
  const honorarios = document.getElementById("taxa_honorarios")?.value;
  const custas = document.getElementById("taxa_custas")?.value;
  const doacao = obterValorInput(document.getElementById("input_doacao_vida"));
  const doacao_avista = obterValorInput(document.getElementById("input_doacao_avista"));
  const previdencia = obterValorInput(document.getElementById("input_previdencia"));
  const seguro_idade = document.getElementById("input_seguro_idade")?.value || "";
  const seguro_capital = obterValorInput(document.getElementById("input_seguro_capital"));

  sessionStorage.setItem("tributario_inputs", JSON.stringify({ uf, itcmd, honorarios, custas, doacao, doacao_avista, previdencia, seguro_idade, seguro_capital }));
  calcularPrejuizo();
}

function carregarResumoSidebar() {
  const totalAtual = Number(sessionStorage.getItem("total_patrimonio")) || 0;
  const dadosPatrimonio = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};
  const prev = parseValor(dadosPatrimonio.prev);

  const dadosEvolucao = JSON.parse(sessionStorage.getItem("evolucao_dados")) || { resultados: [], resultadosPrev: [] };
  const totalProjetado = (dadosEvolucao.resultados && dadosEvolucao.resultados.length > 0)
    ? dadosEvolucao.resultados[dadosEvolucao.resultados.length - 1]
    : totalAtual;

  const prevProjetado = (dadosEvolucao.resultadosPrev && dadosEvolucao.resultadosPrev.length > 0)
    ? dadosEvolucao.resultadosPrev[dadosEvolucao.resultadosPrev.length - 1]
    : prev;

  const dadosFamilia = JSON.parse(sessionStorage.getItem("familia")) || {};
  const regime = dadosFamilia.regime || "Não informado";

  const elAtual = document.getElementById("resumo_atual");
  const elPrevAtual = document.getElementById("resumo_prev_atual");
  const elProj = document.getElementById("resumo_projetado");
  const elPrevProj = document.getElementById("resumo_prev_projetada");
  const elRegime = document.getElementById("resumo_regime");

  if (elAtual) elAtual.innerText = "R$ " + totalAtual.toLocaleString("pt-BR");
  if (elPrevAtual) elPrevAtual.innerText = "R$ " + prev.toLocaleString("pt-BR");
  if (elProj) elProj.innerText = "R$ " + totalProjetado.toLocaleString("pt-BR");
  if (elPrevProj) elPrevProj.innerText = "R$ " + prevProjetado.toLocaleString("pt-BR");
  if (elRegime) elRegime.innerText = regime;

  // Armazena para uso no cálculo
  window.dadosCalculo = { totalAtual, totalProjetado, prev, prevProjetado, regime };
}

function atualizarITCMD() {
  const uf = document.getElementById("uf_itcmd").value;
  const inputITCMD = document.getElementById("taxa_itcmd");
  if (uf !== "outro") {
    inputITCMD.value = uf;
    salvarInputsTributario();
  }
}

function calcularPrejuizo() {
  if (!window.dadosCalculo) carregarResumoSidebar();

  const { totalAtual, totalProjetado, prev, prevProjetado, regime } = window.dadosCalculo;

  const itcmd = Number(document.getElementById("taxa_itcmd")?.value) || 0;
  const honorarios = Number(document.getElementById("taxa_honorarios")?.value) || 0;
  const custas = Number(document.getElementById("taxa_custas")?.value) || 0;

  const taxaTotal = itcmd + honorarios + custas;

  // Regra do Regime: Se for Comunhão (Parcial ou Universal) ou Participação Final nos Aquestos, incide sobre 50%
  const regimeLower = regime.toLowerCase();
  const multiplicadorRegime = (regimeLower.includes("comunhão") || regimeLower.includes("participação final") || regimeLower.includes("aquestos")) ? 0.5 : 1;

  // Base de Cálculo: Abate a previdência e a meação
  const baseAtual = Math.max(0, totalAtual - prev) * multiplicadorRegime;
  const baseProjetada = Math.max(0, totalProjetado - prevProjetado) * multiplicadorRegime;

  const prejuizoAtual = baseAtual * (taxaTotal / 100);
  const prejuizoProjetado = baseProjetada * (taxaTotal / 100);

  // Atualiza Tela
  const elVAtual = document.getElementById("prejuizo_atual_valor");
  const elVProj = document.getElementById("prejuizo_projetado_valor");

  if (elVAtual) elVAtual.innerText = "R$ " + prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elVProj) elVProj.innerText = "R$ " + prejuizoProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  const pctAtual = totalAtual > 0 ? (prejuizoAtual / totalAtual) * 100 : 0;
  const pctProjetado = totalProjetado > 0 ? (prejuizoProjetado / totalProjetado) * 100 : 0;

  const elPAtual = document.getElementById("prejuizo_atual_pct");
  const elPProj = document.getElementById("prejuizo_projetado_pct");

  if (elPAtual) elPAtual.innerText = pctAtual.toFixed(1) + "% do total atual";
  if (elPProj) elPProj.innerText = pctProjetado.toFixed(1) + "% do total projetado";

  const elBAtual = document.getElementById("base_atual");
  const elBProj = document.getElementById("base_projetada");

  if (elBAtual) elBAtual.innerText = "R$ " + baseAtual.toLocaleString("pt-BR");
  if (elBProj) elBProj.innerText = "R$ " + baseProjetada.toLocaleString("pt-BR");

  // Alarme de Liquidez
  const dadosPatrimonio = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};
  const rf = parseValor(dadosPatrimonio.rf);
  const inter = parseValor(dadosPatrimonio.inter);
  const offshore = parseValor(dadosPatrimonio.offshore);
  const liquidez = rf + prev + inter + offshore;
  const imobilizado = totalAtual > 0 ? (totalAtual - liquidez) : 0;

  const alertaLiquidez = document.getElementById("alerta_liquidez");
  const alertaTexto = document.getElementById("alerta_liquidez_texto");

  if (alertaLiquidez && alertaTexto) {
    if (prejuizoAtual > liquidez && totalAtual > 0) {
      let pctImobilizado = ((imobilizado / totalAtual) * 100).toFixed(0);
      alertaLiquidez.style.display = "block";
      alertaTexto.innerHTML = `Seu patrimônio é <b>${pctImobilizado}% imobilizado</b>. Em caso de sucessão, sua família não terá caixa suficiente (R$ ${liquidez.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}) para pagar os <b>R$ ${prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</b> do inventário e será forçada a vender imóveis/empresas com deságio.`;
    } else {
      alertaLiquidez.style.display = "none";
    }
  }

  // Salva para o PDF
  sessionStorage.setItem("prejuizo_final", JSON.stringify({
    prejuizoAtual, prejuizoProjetado, pctAtual, pctProjetado, baseAtual, baseProjetada, taxaTotal
  }));

  // Atualiza elementos no relatório PDF (se existirem na página)
  const elPdfAtual = document.getElementById("prejuizo_atual_pdf");
  const elPdfProj = document.getElementById("prejuizo_projetado_pdf");
  const elPdfTotalProj = document.getElementById("total_projetado_pdf");

  if (elPdfAtual) elPdfAtual.innerText = "R$ " + prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elPdfProj) elPdfProj.innerText = "R$ " + prejuizoProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elPdfTotalProj) elPdfTotalProj.innerText = "R$ " + totalProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  // Atualiza a tabela de Herança Líquida (Estratégia 1) no relatório PDF
  const elTabelaPatInicial = document.getElementById("tabela_patrimonio_inicial");
  const elTabelaCustos = document.getElementById("tabela_custos_sucessao");
  const elTabelaHerancaLiquida = document.getElementById("tabela_heranca_liquida");

  if (elTabelaPatInicial) elTabelaPatInicial.innerText = "R$ " + totalAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elTabelaCustos) elTabelaCustos.innerText = "R$ " + prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elTabelaHerancaLiquida) {
    const herancaLiquida = Math.max(0, totalAtual - prejuizoAtual);
    elTabelaHerancaLiquida.innerText = "R$ " + herancaLiquida.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  }

  // Controla exibição dos impactos no PDF de acordo com o patrimônio do cliente
  const elImoveis = document.getElementById("impacto_venda_imoveis");
  const elInvestimentos = document.getElementById("impacto_venda_investimentos");
  const elEmpresas = document.getElementById("impacto_venda_empresas");

  const temImoveis = (parseValor(dadosPatrimonio.apt) + parseValor(dadosPatrimonio.casa) + parseValor(dadosPatrimonio.terr) + parseValor(dadosPatrimonio.galp)) > 0;
  const temInvestimentos = (parseValor(dadosPatrimonio.rf) + parseValor(dadosPatrimonio.rv) + parseValor(dadosPatrimonio.inter) + parseValor(dadosPatrimonio.offshore)) > 0;
  let temEmpresas = false;
  if (dadosPatrimonio.empresas && dadosPatrimonio.empresas.length > 0) {
    temEmpresas = dadosPatrimonio.empresas.some(e => parseValor(e.valor) > 0);
  }

  if (elImoveis) elImoveis.style.display = temImoveis ? "table-row" : "none";
  if (elInvestimentos) elInvestimentos.style.display = temInvestimentos ? "table-row" : "none";
  if (elEmpresas) elEmpresas.style.display = temEmpresas ? "table-row" : "none";

  // Lógica de Doação em Vida (Opção 1)
  const inputDoacao = document.getElementById("input_doacao_vida");
  let doacaoVal = 0;
  if (inputDoacao) {
    doacaoVal = obterValorInput(inputDoacao);
  }

  const elTempoAtual = document.getElementById("tempo_atual_doacao");
  const elTempoProj = document.getElementById("tempo_projetado_doacao");

  function formatarTempoMeses(prejuizo, doacaoAnual) {
    if (doacaoAnual <= 0 || prejuizo <= 0) return "—";
    const doacaoMensal = doacaoAnual / 12;
    const totalMeses = Math.ceil(prejuizo / doacaoMensal);
    const anos = Math.floor(totalMeses / 12);
    const meses = totalMeses % 12;
    if (anos === 0) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
    if (meses === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
    return `${anos} ${anos === 1 ? "ano" : "anos"} e ${meses} ${meses === 1 ? "mês" : "meses"}`;
  }

  if (doacaoVal > 0) {
    if (elTempoAtual) elTempoAtual.innerText = formatarTempoMeses(prejuizoAtual, doacaoVal);
    if (elTempoProj) elTempoProj.innerText = formatarTempoMeses(prejuizoProjetado, doacaoVal);
  } else {
    if (elTempoAtual) elTempoAtual.innerText = "—";
    if (elTempoProj) elTempoProj.innerText = "—";
  }

  // Preenche tabela da Estratégia 2: Doação dentro da isenção
  const LIMITE_ISENCAO_ANUAL = doacaoVal > 0 ? doacaoVal : 96050;
  const elE2Valor = document.getElementById("estrategia2_valor_necessario");
  const elE2Limite = document.getElementById("estrategia2_limite_isencao");
  const elE2Tempo = document.getElementById("estrategia2_tempo_estimado");

  if (elE2Valor) elE2Valor.innerText = "R$ " + prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elE2Limite) elE2Limite.innerText = "R$ " + LIMITE_ISENCAO_ANUAL.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elE2Tempo) {
    const tempoEstimado = formatarTempoMeses(prejuizoAtual, LIMITE_ISENCAO_ANUAL);
    elE2Tempo.innerText = tempoEstimado !== "—" ? `Aproximadamente ${tempoEstimado}` : "—";
  }

  // Opção 2: Doação à vista com incidência de ITCMD
  const inputAvista = document.getElementById("input_doacao_avista");
  let avistaVal = 0;
  if (inputAvista) {
    if (inputAvista.value === "" && !inputAvista.dataset.initialized && prejuizoAtual > 0) {
      inputAvista.value = Math.round(prejuizoAtual * 100).toString();
      formatarMoeda(inputAvista);
      checkFilled(inputAvista);
      inputAvista.dataset.initialized = "true";
    }
    avistaVal = obterValorInput(inputAvista);
  }

  const elAvistaITCMD = document.getElementById("avista_custo_itcmd");
  const elAvistaTotal = document.getElementById("avista_custo_total");

  if (avistaVal > 0) {
    const fmt = (v) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (avistaVal <= 96050) {
      // Isento de ITCMD
      if (elAvistaITCMD) {
        elAvistaITCMD.innerText = "Isento";
        elAvistaITCMD.style.backgroundColor = "rgba(29, 111, 66, 0.1)";
        elAvistaITCMD.style.color = "#1D6F42";
      }
      if (elAvistaTotal) elAvistaTotal.innerText = fmt(avistaVal);
    } else {
      // Com incidência de ITCMD: incide sobre o valor que exceder R$ 96.050,00
      const custoITCMDAvista = (avistaVal - 96050) * (itcmd / 100);
      const totalAvista = avistaVal + custoITCMDAvista;
      if (elAvistaITCMD) {
        elAvistaITCMD.innerText = fmt(custoITCMDAvista);
        elAvistaITCMD.style.backgroundColor = "rgba(229, 57, 53, 0.1)";
        elAvistaITCMD.style.color = "#E53935";
      }
      if (elAvistaTotal) elAvistaTotal.innerText = fmt(totalAvista);
    }
  } else {
    if (elAvistaITCMD) {
      elAvistaITCMD.innerText = "—";
      elAvistaITCMD.style.backgroundColor = "";
      elAvistaITCMD.style.color = "";
    }
    if (elAvistaTotal) elAvistaTotal.innerText = "—";
  }

  // Opção 3: Previdência
  const inputPrevidencia = document.getElementById("input_previdencia");
  let previdenciaVal = 0;
  if (inputPrevidencia) {
    if (inputPrevidencia.value === "" && !inputPrevidencia.dataset.initialized) {
      const dadosPatrimonio = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};
      const prevPatrimonio = parseValor(dadosPatrimonio.prev);
      if (prevPatrimonio > 0) {
        inputPrevidencia.value = Math.round(prevPatrimonio * 100).toString();
        formatarMoeda(inputPrevidencia);
        checkFilled(inputPrevidencia);
      }
      inputPrevidencia.dataset.initialized = "true";
    }
    previdenciaVal = obterValorInput(inputPrevidencia);
  }

  const elPrevImposto = document.getElementById("previdencia_imposto");
  const elPrevTotal = document.getElementById("previdencia_custo_total");

  if (previdenciaVal > 0) {
    const fmt = (v) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const LIMITE_ISENTO_PREV = 600000;

    if (previdenciaVal <= LIMITE_ISENTO_PREV) {
      if (elPrevImposto) {
        elPrevImposto.innerText = "Isento";
        elPrevImposto.style.backgroundColor = "rgba(29, 111, 66, 0.1)";
        elPrevImposto.style.color = "#1D6F42";
      }
      if (elPrevTotal) elPrevTotal.innerText = fmt(previdenciaVal);
    } else {
      const excedente = previdenciaVal - LIMITE_ISENTO_PREV;
      const impostoPrevidencia = excedente * 0.05;
      const totalComImposto = previdenciaVal + impostoPrevidencia;

      if (elPrevImposto) {
        elPrevImposto.innerText = fmt(impostoPrevidencia);
        elPrevImposto.style.backgroundColor = "rgba(229, 57, 53, 0.1)";
        elPrevImposto.style.color = "#E53935";
      }
      if (elPrevTotal) elPrevTotal.innerText = fmt(totalComImposto);
    }
  } else {
    if (elPrevImposto) {
      elPrevImposto.innerText = "—";
      elPrevImposto.style.backgroundColor = "";
      elPrevImposto.style.color = "";
    }
    if (elPrevTotal) elPrevTotal.innerText = "—";
  }

  // Opção 4: Seguro Sucessão
  const TABELA_SEGURO_SUCESSAO = {
    25: 3483.96, 26: 3563.00, 27: 3646.00, 28: 3734.00, 29: 3826.00,
    30: 3923.00, 31: 4024.00, 32: 4130.00, 33: 4237.00, 34: 4341.00,
    35: 4443.12, 36: 4565.00, 37: 4691.00, 38: 4821.00, 39: 4956.00,
    40: 5096.00, 41: 5241.00, 42: 5392.00, 43: 5548.00, 44: 5710.00,
    45: 5878.00, 46: 6053.00, 47: 6234.00, 48: 6421.00, 49: 6615.00,
    50: 6817.00, 51: 7026.00, 52: 7243.00, 53: 7469.00, 54: 7704.00,
    55: 7949.00, 56: 8204.00, 57: 8469.00, 58: 8745.00, 59: 9032.00,
    60: 9332.00, 61: 9445.00, 62: 9555.00, 63: 9638.00, 64: 9662.00,
    65: 9672.48, 66: 9912.00, 67: 10165.00, 68: 10433.00, 69: 10715.00,
    70: 11014.00, 71: 11329.00, 72: 11662.00, 73: 12013.00, 74: 12384.00
  };

  const inputSeguroIdade = document.getElementById("input_seguro_idade");
  const inputSeguroCapital = document.getElementById("input_seguro_capital");
  let seguroCapitalVal = 0;

  if (inputSeguroCapital) {
    if (inputSeguroCapital.value === "" && !inputSeguroCapital.dataset.initialized && prejuizoAtual > 0) {
      inputSeguroCapital.value = Math.round(prejuizoAtual * 100).toString();
      formatarMoeda(inputSeguroCapital);
      checkFilled(inputSeguroCapital);
      inputSeguroCapital.dataset.initialized = "true";
    }
    seguroCapitalVal = obterValorInput(inputSeguroCapital);
  }

  const elSeguroCapital = document.getElementById("seguro_resultado_capital");
  const elSeguroParcela = document.getElementById("seguro_resultado_parcela");
  const elSeguroQuitar = document.getElementById("seguro_resultado_quitar");
  const elSeguroEconomia = document.getElementById("seguro_resultado_economia");

  const fmt = (v) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (seguroCapitalVal > 0) {
    if (elSeguroCapital) elSeguroCapital.innerText = fmt(seguroCapitalVal);

    const rawIdade = inputSeguroIdade ? parseInt(inputSeguroIdade.value, 10) : NaN;

    if (!isNaN(rawIdade)) {
      let idadeBusca = rawIdade;
      if (idadeBusca < 25) idadeBusca = 25;
      if (idadeBusca > 74) idadeBusca = 74;

      const taxaAnualPor100k = TABELA_SEGURO_SUCESSAO[idadeBusca];
      if (taxaAnualPor100k) {
        const contribucaoAnualTotal = (seguroCapitalVal / 100000) * taxaAnualPor100k;
        const parcelaMensal = contribucaoAnualTotal / 12;
        const valorQuitar = parcelaMensal * 120;
        const economia = seguroCapitalVal - valorQuitar;
        const pctEconomia = seguroCapitalVal > 0 ? (economia / seguroCapitalVal) * 100 : 0;

        if (elSeguroParcela) elSeguroParcela.innerText = fmt(parcelaMensal) + " / mês";
        if (elSeguroQuitar) elSeguroQuitar.innerText = fmt(valorQuitar);
        if (elSeguroEconomia) {
          if (economia > 0) {
            elSeguroEconomia.innerText = fmt(economia) + ` (${pctEconomia.toFixed(1)}%)`;
            elSeguroEconomia.style.backgroundColor = "rgba(29, 111, 66, 0.1)";
            elSeguroEconomia.style.color = "#1D6F42";
          } else {
            elSeguroEconomia.innerText = fmt(0);
            elSeguroEconomia.style.backgroundColor = "";
            elSeguroEconomia.style.color = "";
          }
        }
      }
    } else {
      if (elSeguroParcela) elSeguroParcela.innerText = "Informe a idade";
      if (elSeguroQuitar) elSeguroQuitar.innerText = "Informe a idade";
      if (elSeguroEconomia) elSeguroEconomia.innerText = "Informe a idade";
    }
  } else {
    if (elSeguroCapital) elSeguroCapital.innerText = "—";
    if (elSeguroParcela) elSeguroParcela.innerText = "—";
    if (elSeguroQuitar) elSeguroQuitar.innerText = "—";
    if (elSeguroEconomia) elSeguroEconomia.innerText = "—";
  }

  gerarNarrativaIA(totalAtual, prejuizoAtual, regime);
  calcularPartilha(totalAtual, regime);
  calcularHolding(prejuizoAtual);
  atualizarPreservacaoPDF();

  // Auto-save: persiste progressivamente no Supabase com debounce
  if (typeof dbAutoSalvar === "function") dbAutoSalvar();
}

function atualizarPreservacaoPDF() {
  const elTempoAtual = document.getElementById("tempo_atual_doacao");
  const elTempoProj = document.getElementById("tempo_projetado_doacao");
  const elAvistaITCMD = document.getElementById("avista_custo_itcmd");
  const elAvistaTotal = document.getElementById("avista_custo_total");
  const elPrevImposto = document.getElementById("previdencia_imposto");
  const elPrevTotal = document.getElementById("previdencia_custo_total");
  const elSeguroCapital = document.getElementById("seguro_resultado_capital");
  const elSeguroParcela = document.getElementById("seguro_resultado_parcela");
  const elSeguroQuitar = document.getElementById("seguro_resultado_quitar");
  const elSeguroEconomia = document.getElementById("seguro_resultado_economia");

  const pdfTempoAtual = document.getElementById("pdf_tempo_atual_doacao");
  const pdfTempoProj = document.getElementById("pdf_tempo_projetado_doacao");
  const pdfAvistaITCMD = document.getElementById("pdf_avista_custo_itcmd");
  const pdfAvistaTotal = document.getElementById("pdf_avista_custo_total");
  const pdfPrevImposto = document.getElementById("pdf_previdencia_imposto");
  const pdfPrevTotal = document.getElementById("pdf_previdencia_custo_total");
  const pdfSeguroCapital = document.getElementById("pdf_seguro_capital");
  const pdfSeguroParcela = document.getElementById("pdf_seguro_parcela");
  const pdfSeguroQuitar = document.getElementById("pdf_seguro_quitar");
  const pdfSeguroEconomia = document.getElementById("pdf_seguro_economia");

  if (pdfTempoAtual && elTempoAtual) pdfTempoAtual.innerText = elTempoAtual.innerText;
  if (pdfTempoProj && elTempoProj) pdfTempoProj.innerText = elTempoProj.innerText;

  if (pdfAvistaITCMD && elAvistaITCMD) {
    pdfAvistaITCMD.innerText = elAvistaITCMD.innerText;
    pdfAvistaITCMD.style.color = elAvistaITCMD.style.color || "#E53935";
  }
  if (pdfAvistaTotal && elAvistaTotal) pdfAvistaTotal.innerText = elAvistaTotal.innerText;

  if (pdfPrevImposto && elPrevImposto) {
    pdfPrevImposto.innerText = elPrevImposto.innerText;
    pdfPrevImposto.style.color = elPrevImposto.style.color || "#581c87";
  }
  if (pdfPrevTotal && elPrevTotal) pdfPrevTotal.innerText = elPrevTotal.innerText;

  if (pdfSeguroCapital && elSeguroCapital) pdfSeguroCapital.innerText = elSeguroCapital.innerText;
  if (pdfSeguroParcela && elSeguroParcela) pdfSeguroParcela.innerText = elSeguroParcela.innerText;
  if (pdfSeguroQuitar && elSeguroQuitar) pdfSeguroQuitar.innerText = elSeguroQuitar.innerText;
  if (pdfSeguroEconomia && elSeguroEconomia) pdfSeguroEconomia.innerText = elSeguroEconomia.innerText;

  // Atualiza elementos dinâmicos da PÁGINA 6 (Estratégia de Liquidez e Seguro Resgatável)
  const p6CapitalRec = document.getElementById("p6_capital_recomendado");
  const p6ParcelaEst = document.getElementById("p6_parcela_estimada");
  const p6CustoInventario = document.getElementById("p6_custo_inventario_sem_seguro");
  const p6PerdaTotalSemSeguro = document.getElementById("p6_perda_total_sem_seguro");
  const p6PatrimonioPreservado = document.getElementById("p6_patrimonio_preservado");

  const valCapital = (elSeguroCapital && elSeguroCapital.innerText !== "—" && elSeguroCapital.innerText !== "")
    ? elSeguroCapital.innerText
    : ((pdfAvistaITCMD && pdfAvistaITCMD.innerText !== "—") ? pdfAvistaITCMD.innerText : "R$ 0");

  const valParcela = (elSeguroParcela && elSeguroParcela.innerText !== "—" && elSeguroParcela.innerText !== "")
    ? elSeguroParcela.innerText
    : "Sob consulta";

  if (p6CapitalRec) p6CapitalRec.innerText = valCapital;
  if (p6ParcelaEst) p6ParcelaEst.innerText = valParcela;
  if (p6CustoInventario) p6CustoInventario.innerText = valCapital.replace("R$", "").trim();
  if (p6PerdaTotalSemSeguro) p6PerdaTotalSemSeguro.innerText = valCapital;
  if (p6PatrimonioPreservado) p6PatrimonioPreservado.innerText = "100% Protegido";
}

// =========================
// SIMULADOR DE HOLDING VS INVENTÁRIO
// =========================
function calcularHolding(custoInventario) {
  // Uma Holding custa em média 35% do valor de um inventário total (ITCMD sobre base reduzida + Honorários fixos)
  const custoHolding = custoInventario * 0.35;
  const economia = custoInventario - custoHolding;

  const elInv = document.getElementById("holding_custo_inventario");
  const elHold = document.getElementById("holding_custo_holding");
  const elEco = document.getElementById("holding_economia");

  if (elInv) elInv.innerText = "R$ " + custoInventario.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elHold) elHold.innerText = "R$ " + custoHolding.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elEco) elEco.innerText = "R$ " + economia.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function calcularPartilha(total, regime) {
  const familia = JSON.parse(sessionStorage.getItem("familia")) || {};
  const casado = familia.estadoCivil === "casado";
  const temFilhos = familia.temFilhos === "sim";
  const qtdFilhos = Number(familia.qtdFilhos) || 0;
  const possuiPais = familia.possuiPais === "sim";
  const qtdPais = Number(familia.qtdPais) || 0;
  const possuiColaterais = familia.possuiColaterais === "sim";
  const qtdColaterais = Number(familia.qtdColaterais) || 0;

  // Previdência não entra em inventário (isenta/excluída da partilha judicial de meação e herança)
  const dadosPatrimonio = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};
  const prev = parseValor(dadosPatrimonio.prev);
  const totalCalculo = Math.max(0, total - prev);

  let fatias = [];
  let labels = [];
  const coresBase = ["#0B53B8", "#1D6F42", "#FFB800", "#E53935", "#6F42C1"];
  let cores = [];

  let meacao = 0;
  let heranca = totalCalculo;

  // 1. DEFINIÇÃO DE MEAÇÃO E BASE DA HERANÇA
  const regimeL = regime.toLowerCase();
  const comunhaoParcial = regimeL.includes("comunhão parcial") || regimeL.includes("participação final") || regimeL.includes("aquestos");
  const comunhaoUniversal = regimeL.includes("comunhão universal");
  const separacaoTotal = regimeL.includes("separação total");
  const comunhao = comunhaoParcial || comunhaoUniversal;

  let bensComuns = 0;
  let bensParticularesCalculo = 0;

  if (casado) {
    if (comunhaoUniversal) {
      bensComuns = totalCalculo;
      bensParticularesCalculo = 0;
    } else if (comunhaoParcial) {
      bensParticularesCalculo = Math.min(totalCalculo, parseValor(dadosPatrimonio.bens_particulares));
      bensComuns = Math.max(0, totalCalculo - bensParticularesCalculo);
    } else if (separacaoTotal) {
      bensComuns = 0;
      bensParticularesCalculo = totalCalculo;
    } else {
      bensComuns = totalCalculo;
      bensParticularesCalculo = 0;
    }
  } else {
    bensComuns = 0;
    bensParticularesCalculo = totalCalculo;
  }

  // Meação (somente sobre bens comuns)
  if (casado && comunhao) {
    meacao = bensComuns * 0.5;
  }

  // Divisão da Herança dos Bens Comuns
  let herancaComuns = bensComuns * (casado && comunhao ? 0.5 : 1);
  let cHerancaComuns = 0;
  let filhosComuns = 0;
  let paisComuns = 0;
  let colateraisComuns = 0;
  let uniaoComuns = 0;

  if (temFilhos && qtdFilhos > 0) {
    if (casado && comunhao) {
      // Regra: "quando o cônjuge for meiero ele pegue os 50% e o resto da herança fique pros filhos"
      cHerancaComuns = 0;
      filhosComuns = herancaComuns;
    } else if (casado && !separacaoTotal) {
      let quotaConjuge;
      if (qtdFilhos >= 3) {
        quotaConjuge = herancaComuns * 0.25;
      } else {
        quotaConjuge = herancaComuns / (qtdFilhos + 1);
      }
      cHerancaComuns = quotaConjuge;
      filhosComuns = herancaComuns - cHerancaComuns;
    } else {
      cHerancaComuns = 0;
      filhosComuns = herancaComuns;
    }
  } else if (possuiPais && qtdPais > 0) {
    if (casado) {
      cHerancaComuns = herancaComuns / (qtdPais + 1);
      paisComuns = herancaComuns - cHerancaComuns;
    } else {
      cHerancaComuns = 0;
      paisComuns = herancaComuns;
    }
  } else if (casado) {
    cHerancaComuns = herancaComuns;
  } else if (possuiColaterais && qtdColaterais > 0) {
    colateraisComuns = herancaComuns;
  } else {
    uniaoComuns = herancaComuns;
  }

  // Divisão da Herança dos Bens Particulares
  let herancaParticulares = bensParticularesCalculo;
  let cHerancaParticulares = 0;
  let filhosParticulares = 0;
  let paisParticulares = 0;
  let colateraisParticulares = 0;
  let uniaoParticulares = 0;

  if (temFilhos && qtdFilhos > 0) {
    if (casado && (comunhaoParcial || separacaoTotal)) {
      // Para Comunhão Parcial / Participação Final nos Aquestos ou Separação Total, divide igualmente entre cônjuge e filhos
      let quotaConjuge = herancaParticulares / (qtdFilhos + 1);
      cHerancaParticulares = quotaConjuge;
      filhosParticulares = herancaParticulares - cHerancaParticulares;
    } else {
      // Comunhão Universal (ou outros regimes não especificados)
      cHerancaParticulares = 0;
      filhosParticulares = herancaParticulares;
    }
  } else {
    // Se não tiverem filhos
    if (casado && comunhaoParcial) {
      // "se não tiverem filhos os bens particulares vão direto pro cônjuge"
      cHerancaParticulares = herancaParticulares;
      filhosParticulares = 0;
    } else if (possuiPais && qtdPais > 0) {
      if (casado) {
        cHerancaParticulares = herancaParticulares / (qtdPais + 1);
        paisParticulares = herancaParticulares - cHerancaParticulares;
      } else {
        cHerancaParticulares = 0;
        paisParticulares = herancaParticulares;
      }
    } else if (casado) {
      cHerancaParticulares = herancaParticulares;
    } else if (possuiColaterais && qtdColaterais > 0) {
      colateraisParticulares = herancaParticulares;
    } else {
      uniaoParticulares = herancaParticulares;
    }
  }

  // Total da Herança + Meação do Cônjuge (Unificados em uma única barra/fatia)
  let totalHerancaConjuge = cHerancaComuns + cHerancaParticulares;
  let totalConjuge = meacao + totalHerancaConjuge;
  if (totalConjuge > 0) {
    labels.push("Cônjuge (Meação + Herança)");
    fatias.push(totalConjuge);
  }

  // Total dos Filhos
  let totalFilhos = filhosComuns + filhosParticulares;
  if (totalFilhos > 0) {
    const quotaPorFilho = totalFilhos / qtdFilhos;
    for (let i = 1; i <= qtdFilhos; i++) {
      labels.push(`Filho ${i}`);
      fatias.push(quotaPorFilho);
    }
  }

  // Total dos Pais
  let totalPais = paisComuns + paisParticulares;
  if (totalPais > 0) {
    const quotaPorPai = totalPais / qtdPais;
    for (let i = 1; i <= qtdPais; i++) {
      labels.push(qtdPais === 2 ? (i === 1 ? "Pai" : "Mãe") : "Ascendente");
      fatias.push(quotaPorPai);
    }
  }

  // Total dos Colaterais
  let totalColaterais = colateraisComuns + colateraisParticulares;
  if (totalColaterais > 0) {
    const quotaPorColateral = totalColaterais / qtdColaterais;
    for (let i = 1; i <= qtdColaterais; i++) {
      labels.push(`Colateral ${i}`);
      fatias.push(quotaPorColateral);
    }
  }

  // União
  let totalUniao = uniaoComuns + uniaoParticulares;
  if (totalUniao > 0) {
    labels.push("Município / DF / União");
    fatias.push(totalUniao);
  }

  // Definir herança para calcularSegundaMorte
  heranca = totalCalculo - meacao;

  // Atribui cores consistentes: Cônjuge sempre Azul (0), Filhos em diante
  labels.forEach((label, i) => {
    if (label.includes("Cônjuge")) {
      cores.push(coresBase[0]);
    } else {
      cores.push(coresBase[(i % (coresBase.length - 1)) + 1] || coresBase[1]);
    }
  });

  // SALVA DADOS PARA O PDF
  sessionStorage.setItem("partilha_dados", JSON.stringify({ labels, fatias, cores }));

  // 3. RENDERIZAR LISTA TEXTUAL
  const lista = document.getElementById("lista_partilha");
  if (lista) {
    let html = '<ul style="list-style: none; padding: 0;">';
    labels.forEach((label, i) => {
      let pct = (fatias[i] / total) * 100;
      html += `<li style="margin-bottom: 10px; padding-left: 15px; border-left: 3px solid ${cores[i % cores.length]}">
        <strong>${label}:</strong> R$ ${fatias[i].toLocaleString("pt-BR", { maximumFractionDigits: 0 })} 
        <span style="opacity: 0.6; font-size: 12px;">(${pct.toFixed(1)}%)</span>
      </li>`;
    });

    html += "</ul>";
    lista.innerHTML = html;
  }

  // Preenchimento da Previdência Sucessória (removido do relatório)
  const divPrev = document.getElementById("container_previdencia_sucessao");
  if (divPrev) {
    divPrev.style.display = "none";
    divPrev.innerHTML = "";
  }

  // 4. RENDERIZAR GRÁFICO
  const ctx = document.getElementById("grafico_partilha");
  if (ctx) {
    // Destrói gráfico anterior se existir
    const existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: fatias,
          backgroundColor: cores,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#fff',
            formatter: (v) => {
              let p = (v / total) * 100;
              return p > 5 ? p.toFixed(0) + '%' : '';
            }
          }
        }
      }
    });
  }

  // CALCULA SEGUNDA MORTE
  let fatiaConjugeTotal = 0;
  labels.forEach((l, i) => {
    if (l.includes("Cônjuge")) fatiaConjugeTotal += fatias[i];
  });

  calcularSegundaMorte(total, heranca, meacao, fatiaConjugeTotal, labels, fatias);
}

function calcularSegundaMorte(totalOriginal, herancaPrimeira, meacaoPrimeira, valorConjuge, labelsPrimeira, fatiasPrimeira) {
  const familia = JSON.parse(sessionStorage.getItem("familia")) || {};

  // Ocultar página se solteiro ou sem valor para o cônjuge
  const pgSegunda = document.getElementById("pagina_segunda_morte");
  const footerUltima = document.querySelector("#area-relatorio .pagina:last-child .footer-relatorio");

  if (familia.estadoCivil !== "casado" || valorConjuge <= 0) {
    if (pgSegunda) {
      pgSegunda.style.display = "none";
    }
    sessionStorage.removeItem("segunda_morte_dados");
    return; // Encerra aqui se não for casado
  } else {
    if (pgSegunda) {
      pgSegunda.style.display = "block";
    }
  }

  const temFilhos = familia.temFilhos === "sim";
  const qtdFilhos = Number(familia.qtdFilhos) || 0;
  const conjugePossuiPais = familia.conjugePossuiPais === "sim";
  const conjugeQtdPais = Number(familia.conjugeQtdPais) || 0;
  const conjugePossuiColaterais = familia.conjugePossuiColaterais === "sim";
  const conjugeQtdColaterais = Number(familia.conjugeQtdColaterais) || 0;

  let fatiasSegunda = [];
  let labelsSegunda = [];
  const coresBase = ["#0B53B8", "#1D6F42", "#FFB800", "#E53935", "#6F42C1"];
  let coresSegunda = [];

  // Descrição Estágio 1
  const elT1 = document.getElementById("texto_primeira_morte");
  if (elT1) {
    elT1.innerHTML = `No falecimento do cliente, o patrimônio de R$ ${totalOriginal.toLocaleString("pt-BR")} é dividido entre os herdeiros diretos. O cônjuge recebe <strong>R$ ${valorConjuge.toLocaleString("pt-BR")}</strong> (somando meação e herança).`;
  }

  // Divisão Estágio 2 (Morte do Cônjuge)
  // O montante da segunda morte é o que o cônjuge recebeu + o que ele já tinha (meação)
  let totalSegunda = valorConjuge;

  if (temFilhos && qtdFilhos > 0) {
    // Se houver filhos, tudo vai para os filhos (que são herdeiros de ambos)
    let valorPorFilho = totalSegunda / qtdFilhos;
    for (let i = 1; i <= qtdFilhos; i++) {
      labelsSegunda.push(`Filho ${i}`);
      fatiasSegunda.push(valorPorFilho);
    }
  } else if (conjugePossuiPais && conjugeQtdPais > 0) {
    // Se não houver filhos, vai para os pais do cônjuge
    let valorPorPai = totalSegunda / conjugeQtdPais;
    for (let i = 1; i <= conjugeQtdPais; i++) {
      labelsSegunda.push(`Pai/Mãe do Cônjuge ${i}`);
      fatiasSegunda.push(valorPorPai);
    }
  } else if (conjugePossuiColaterais && conjugeQtdColaterais > 0) {
    // Se não houver filhos nem pais, vai para os colaterais do cônjuge
    let valorPorParente = totalSegunda / conjugeQtdColaterais;
    for (let i = 1; i <= conjugeQtdColaterais; i++) {
      labelsSegunda.push(`Parente Colateral (Cônjuge) ${i}`);
      fatiasSegunda.push(valorPorParente);
    }
  } else {
    labelsSegunda.push("Herdeiros do Cônjuge / Outros");
    fatiasSegunda.push(totalSegunda);
  }

  // Atribui cores: na segunda morte, como não há cônjuge, pulamos o azul (coresBase[0])
  // para que o Filho 1 continue sendo Verde (coresBase[1])
  labelsSegunda.forEach((label, i) => {
    coresSegunda.push(coresBase[((i + 1) % coresBase.length)] || coresBase[1]);
  });

  // Salva dados para o PDF poder redesenhar no preview
  sessionStorage.setItem("segunda_morte_dados", JSON.stringify({
    labels: labelsSegunda,
    fatias: fatiasSegunda,
    cores: coresSegunda
  }));

  // Renderizar Estágio 2
  const elT2 = document.getElementById("texto_segunda_morte");
  if (elT2) {
    elT2.innerHTML = `Com o falecimento posterior do cônjuge, o montante acumulado de <strong>R$ ${totalSegunda.toLocaleString("pt-BR")}</strong> segue para os seus respectivos herdeiros legais.`;
  }

  // Renderizar Gráfico Segunda Morte
  const ctx = document.getElementById("grafico_segunda_morte");
  if (ctx) {
    const existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labelsSegunda,
        datasets: [{
          data: fatiasSegunda,
          backgroundColor: coresSegunda,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#fff',
            formatter: (v) => {
              let p = (v / totalSegunda) * 100;
              return p > 5 ? p.toFixed(0) + '%' : '';
            }
          }
        }
      }
    });
  }

  // Lista Segunda Morte
  const lista = document.getElementById("lista_segunda_morte");
  if (lista) {
    let html = '<ul style="list-style: none; padding: 0;">';
    labelsSegunda.forEach((label, i) => {
      let pct = (fatiasSegunda[i] / totalSegunda) * 100;
      html += `<li style="margin-bottom: 10px; padding-left: 15px; border-left: 3px solid ${coresSegunda[i % coresSegunda.length]}">
        <strong>${label}:</strong> R$ ${fatiasSegunda[i].toLocaleString("pt-BR", { maximumFractionDigits: 0 })} 
        <span style="opacity: 0.6; font-size: 12px;">(${pct.toFixed(1)}%)</span>
      </li>`;
    });
    html += "</ul>";
    lista.innerHTML = html;
  }

  // Alerta de Destino removido conforme solicitação
  const alerta = document.getElementById("alerta_destino");
  if (alerta) {
    alerta.style.display = "none";
  }
}

function gerarNarrativaIA(total, prejuizo, regime) {
  const el = document.getElementById("narrativa_ia");
  if (!el) return;
  el.style.display = "none";
  el.innerHTML = "";
}


// =========================
// PREVIEW E GERAR PDF
// =========================
async function abrirPreview() {
  const modal = document.getElementById("modal-preview");
  if (!modal) return;

  // Garante que o modal esteja anexado direto no body para flutuar acima de todos os elementos
  if (modal.parentNode !== document.body) {
    document.body.appendChild(modal);
  }

  const modalBody = document.getElementById("modal-body-pdf");
  const reportArea = document.getElementById("area-relatorio");

  // Limpa o modal antes de clonar
  modalBody.innerHTML = "";

  // Clona o conteúdo
  const clone = reportArea.cloneNode(true);
  clone.id = "area-relatorio-clone";

  // Limpa TODOS os estilos inline que vieram do original (como top: -9999px)
  clone.removeAttribute("style");

  // Aplica estilos necessários para o preview
  clone.style.display = "block";
  clone.style.position = "relative";
  clone.style.width = "100%";
  clone.style.margin = "0 auto";
  clone.style.backgroundColor = "#ffffff";
  clone.style.boxShadow = "none";

  modalBody.appendChild(clone);

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Redesenha todos os gráficos no clone
  const dados = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};

  // Chamamos as funções passando o clone como escopo
  criarGraficos(dados, clone);
  renderizarGraficoEvolucao(clone);

  // Re-executa o cálculo de prejuízo para preencher partilha e segunda morte no clone
  if (typeof calcularPrejuizo === "function") {
    // Note: calcularPrejuizo chama calcularPartilha e calcularSegundaMorte internamente
    // Vamos garantir que elas usem o clone
    const totalAtual = Number(sessionStorage.getItem("total_patrimonio")) || 0;
    const dadosFamilia = JSON.parse(sessionStorage.getItem("familia")) || {};
    const regime = dadosFamilia.regime || "Não informado";

    // Forçamos o recálculo da partilha no clone
    recalculaGraficosEspeciaisPDF(totalAtual, regime, clone);
  }

  // Renderiza as caixas de observações no clone do preview
  renderizarNotasRelatorio(clone);
}

// ==========================================
// GESTÃO DE NOTAS E OBSERVAÇÕES DO ASSESSOR
// ==========================================

function obterNotasRelatorio() {
  try {
    const raw = sessionStorage.getItem("relatorio_notas_assessor");
    const notas = raw ? JSON.parse(raw) : [];
    notas.forEach(n => {
      if (n.titulo && n.titulo.startsWith("Observação do Assessor")) {
        n.titulo = "";
      }
    });
    return notas;
  } catch (e) {
    console.error("Erro ao carregar notas do relatório:", e);
    return [];
  }
}

function salvarNotasRelatorio(notas) {
  try {
    sessionStorage.setItem("relatorio_notas_assessor", JSON.stringify(notas));
    const dadosSimulacao = JSON.parse(sessionStorage.getItem("simulacao_atual")) || {};
    dadosSimulacao.notasRelatorio = notas;
    sessionStorage.setItem("simulacao_atual", JSON.stringify(dadosSimulacao));
  } catch (e) {
    console.error("Erro ao salvar notas do relatório:", e);
  }
}

function adicionarObservacaoPagina(paginaNum) {
  const pag = Number(paginaNum) || 1;
  const notas = obterNotasRelatorio();

  const novaNota = {
    id: "nota_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    pagina: pag,
    titulo: "",
    conteudo: ""
  };

  notas.push(novaNota);
  salvarNotasRelatorio(notas);

  renderizarNotasRelatorio(document);
  const clone = document.getElementById("area-relatorio-clone");
  if (clone) {
    renderizarNotasRelatorio(clone);
  }

  setTimeout(() => {
    const elId = "card_nota_" + novaNota.id;
    const targetEl = (clone ? clone.querySelector("#" + elId) : null) || document.getElementById(elId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      const txt = targetEl.querySelector("textarea");
      if (txt) txt.focus();
    }
  }, 100);
}

function toggleMenuAdicionarNota(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById("dropdown-menu-notas");
  if (!menu) return;
  const isVisible = menu.style.display === "block";
  menu.style.display = isVisible ? "none" : "block";
}

function selecionarNotaPagina(pagNum) {
  const menu = document.getElementById("dropdown-menu-notas");
  if (menu) menu.style.display = "none";
  adicionarObservacaoPagina(pagNum);
}

// Fecha o menu dropdown ao clicar fora
document.addEventListener("click", function (e) {
  const menu = document.getElementById("dropdown-menu-notas");
  if (menu && menu.style.display === "block") {
    if (!e.target.closest("#dropdown-menu-notas") && !e.target.closest(".btn-add-note-dropdown-toggle")) {
      menu.style.display = "none";
    }
  }
});


function removerObservacaoPagina(notaId) {
  let notas = obterNotasRelatorio();
  notas = notas.filter(n => n.id !== notaId);
  salvarNotasRelatorio(notas);

  renderizarNotasRelatorio(document);
  const clone = document.getElementById("area-relatorio-clone");
  if (clone) {
    renderizarNotasRelatorio(clone);
  }
}

function atualizarNotaTexto(notaId, campo, valor) {
  const notas = obterNotasRelatorio();
  const nota = notas.find(n => n.id === notaId);
  if (nota) {
    nota[campo] = valor;
    salvarNotasRelatorio(notas);

    const clone = document.getElementById("area-relatorio-clone");
    const alvos = [document];
    if (clone) alvos.push(clone);

    alvos.forEach(scope => {
      const card = scope.querySelector(`[data-nota-id="${notaId}"]`);
      if (card) {
        const txt = card.querySelector(".nota-conteudo-textarea");
        if (txt && txt.value !== valor) {
          txt.value = valor;
          autoAjustarTextarea(txt);
        }
      }
    });
  }
}

function autoAjustarTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = (el.scrollHeight) + "px";
}

function renderizarNotasRelatorio(scope = document) {
  const notas = obterNotasRelatorio();
  const containers = scope.querySelectorAll(".container-notas-pagina");

  containers.forEach(container => {
    const pagNum = Number(container.getAttribute("data-pagina"));
    const notasPagina = notas.filter(n => Number(n.pagina) === pagNum);

    container.innerHTML = "";

    notasPagina.forEach(nota => {
      const card = document.createElement("div");
      card.className = "nota-assessor-card";
      card.id = "card_nota_" + nota.id;
      card.setAttribute("data-nota-id", nota.id);

      const conteudoEscaped = (nota.conteudo || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      card.innerHTML = `
        <textarea class="nota-conteudo-textarea" placeholder="Digite sua observação aqui..." oninput="atualizarNotaTexto('${nota.id}', 'conteudo', this.value); autoAjustarTextarea(this);">${conteudoEscaped}</textarea>
        <div class="nota-card-actions no-print">
          <button type="button" class="btn-valoris-ia" onclick="aprimorarTextoValoris('${nota.id}')" title="Aprimorar observação com a Valoris AI">
            <span class="btn-valoris-text-group">
              <span class="btn-valoris-label">Valoris</span>
              <span class="btn-valoris-subtitle">Assistente de texto IA</span>
            </span>
          </button>
          <button type="button" class="btn-delete-nota" onclick="removerObservacaoPagina('${nota.id}')" title="Excluir observação">✕ Apagar</button>
        </div>
      `;

      container.appendChild(card);

      const txt = card.querySelector("textarea");
      if (txt) {
        setTimeout(() => autoAjustarTextarea(txt), 0);
      }
    });
  });
}

// Recupera o token de acesso de forma segura via variável global ou local sem expor segredos no repositório
function _obterChaveValoris() {
  return window.GROQ_API_KEY || localStorage.getItem("groq_api_key") || "";
}

async function aprimorarTextoValoris(notaId) {
  const card = document.querySelector(`[data-nota-id="${notaId}"]`);
  if (!card) return;

  const textarea = card.querySelector(".nota-conteudo-textarea");
  const btn = card.querySelector(".btn-valoris-ia");
  const label = btn ? btn.querySelector(".btn-valoris-label") : null;

  if (!textarea || !textarea.value.trim()) {
    if (typeof mostrarToast === "function") {
      mostrarToast("Digite um rascunho de texto primeiro para a Valoris aprimorar.", "aviso");
    } else {
      alert("Por favor, digite um rascunho de texto primeiro para a Valoris aprimorar.");
    }
    return;
  }

  const originalText = textarea.value;

  if (btn) btn.classList.add("loading");
  if (label) label.innerText = "Valoris aprimorando...";

  try {
    let resultText = "";

    // 1. Prioridade Máxima: Tentar chamar a Supabase Edge Function (Servidor Seguro - Chave 100% invisível no F12)
    if (window.supabaseClient && window.supabaseClient.functions) {
      try {
        const { data, error } = await window.supabaseClient.functions.invoke("valoris-ai", {
          body: { texto: originalText }
        });

        if (!error && data && data.textoAprimorado) {
          resultText = data.textoAprimorado.trim();
        }
      } catch (sErr) {
        console.warn("Edge Function do Supabase offline ou não implantada, utilizando canal secundário:", sErr);
      }
    }

    // 2. Fallback: Chamada Groq direta se a Edge Function do Supabase ainda não tiver sido iniciada
    if (!resultText) {
      const apiKey = _obterChaveValoris();
      if (apiKey) {
        const systemPrompt =
          "Você é Valoris, a inteligência artificial corporativa da Pace Capital especializada em Wealth Planning e Gestão Patrimonial.\n" +
          "Sua única função é reescrever o texto do rascunho fornecido pelo assessor patrimonial elevando a gramática, a fluidez, a clareza e o vocabulário para um tom executivo e elegante de Private Banking.\n\n" +
          "REGRAS OBRIGATÓRIAS:\n" +
          "1. Mantenha TODOS os dados numéricos, porcentagens, prazos, valores monetários, UFs, siglas e nomes exatamente como fornecidos pelo usuário.\n" +
          "2. NÃO altere a intenção, a estratégia nem o contexto original do texto.\n" +
          "3. Torne o texto mais articulado, profissional e coeso para figurar em um relatório oficial de alto nível.\n" +
          "4. Responda APENAS com o texto aprimorado final, sem saudações, introduções ou explicações.";

        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Texto a ser aprimorado:\n" + originalText }
              ],
              temperature: 0.3,
              max_tokens: 1000
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
              resultText = data.choices[0].message.content.trim();
            }
          }
        } catch (gErr) {
          console.warn("Groq API offline:", gErr);
        }
      }
    }

    if (!resultText) {
      resultText = polirTextoOfflineValoris(originalText);
    }

    textarea.value = resultText;
    autoAjustarTextarea(textarea);
    atualizarNotaTexto(notaId, "conteudo", resultText);

    if (typeof mostrarToast === "function") {
      mostrarToast("Texto aprimorado por Valoris!", "sucesso");
    }
  } catch (err) {
    console.error("Erro ao aprimorar texto:", err);
    const fallbackText = polirTextoOfflineValoris(originalText);
    textarea.value = fallbackText;
    autoAjustarTextarea(textarea);
    atualizarNotaTexto(notaId, "conteudo", fallbackText);
  } finally {
    if (btn) btn.classList.remove("loading");
    if (label) label.innerText = "Valoris";
  }
}

function polirTextoOfflineValoris(texto) {
  if (!texto) return "";
  let t = texto.trim();

  const substituicoes = [
    [/\bpra\b/gi, "para"],
    [/\bvc\b/gi, "você"],
    [/\btb\b|\btmb\b/gi, "também"],
    [/\bnao\b/gi, "não"],
    [/\bja\b/gi, "já"],
    [/\bate\b/gi, "até"],
    [/\bso\b/gi, "só"],
    [/\bfugir do itcmd\b/gi, "otimizar a incidência do ITCMD"],
    [/\bevitar itcmd\b/gi, "mitigar o impacto do ITCMD"],
    [/\bpassar pelo inventario\b/gi, "trâmites de inventário"],
    [/\bdeixar dinheiro pro filho\b/gi, "assegurar a transmissão patrimonial aos herdeiros"],
    [/\bdeixar dinheiro para o filho\b/gi, "assegurar a transmissão patrimonial aos herdeiros"]
  ];

  substituicoes.forEach(([regex, sub]) => {
    t = t.replace(regex, sub);
  });

  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) {
    t += ".";
  }
  return t;
}



function recalculaGraficosEspeciaisPDF(total, regime, scope = document) {
  const dadosPartilha = JSON.parse(sessionStorage.getItem("partilha_dados"));

  if (dadosPartilha && scope.querySelector("#grafico_partilha")) {
    const canvasPartilha = scope.querySelector("#grafico_partilha");
    new Chart(canvasPartilha, {
      type: "doughnut",
      data: {
        labels: dadosPartilha.labels,
        datasets: [{
          data: dadosPartilha.fatias,
          backgroundColor: dadosPartilha.cores || ["#0B53B8", "#1D6F42", "#FFB800", "#E53935", "#6F42C1"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, datalabels: { display: false } }
      }
    });
  }



  // Segunda Morte (apenas se for CASADO e houver dados)
  const dadosFamiliaSM = JSON.parse(sessionStorage.getItem("familia")) || {};
  const isCasado = dadosFamiliaSM.estadoCivil === "casado";
  const dadosSM = JSON.parse(sessionStorage.getItem("segunda_morte_dados"));
  const canvasSM = scope.querySelector("#grafico_segunda_morte");
  const containerSM = scope.querySelector("#pagina_segunda_morte");

  if (isCasado && dadosSM && canvasSM) {
    if (containerSM) containerSM.style.display = "block";
    new Chart(canvasSM, {
      type: "doughnut",
      data: {
        labels: dadosSM.labels,
        datasets: [{
          data: dadosSM.fatias,
          backgroundColor: dadosSM.cores || ["#1D6F42", "#0B53B8", "#FFB800", "#E53935", "#6F42C1"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, datalabels: { display: false } }
      }
    });
  } else {
    if (containerSM) containerSM.style.display = "none";
  }
}

function fecharPreview() {
  const modal = document.getElementById("modal-preview");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

async function gerarPDF() {
  const clone = document.getElementById("area-relatorio-clone");
  if (!clone) {
    alert("Por favor, abra o Preview antes de baixar.");
    return;
  }

  const btn = document.querySelector(".modal-actions button:last-child");
  const textoOriginal = btn.innerText;
  btn.innerText = "Processando...";
  btn.disabled = true;

  // Garante que o relatório esteja salvo no histórico antes de gerar o PDF
  if (typeof dbAutoSalvarExecutar === "function") {
    await dbAutoSalvarExecutar();
  } else {
    await salvarRelatorioNoHistorico();
  }

  try {
    document.body.classList.add("pdf-exporting");

    // CORREÇÃO: Converte textareas em divs para o html2canvas capturar o texto completo
    const textareas = clone.querySelectorAll("textarea");
    const textareaBackups = [];

    textareas.forEach((ta) => {
      const div = document.createElement("div");
      div.className = ta.className;
      div.style.cssText = window.getComputedStyle(ta).cssText;
      div.style.whiteSpace = "pre-wrap";
      div.style.wordWrap = "break-word";
      div.style.overflowWrap = "break-word";
      div.style.overflow = "visible";
      div.style.height = "auto";
      div.style.minHeight = ta.style.height || "48px";
      div.style.resize = "none";
      div.style.border = "none";
      div.style.background = "transparent";
      div.style.padding = window.getComputedStyle(ta).padding;
      div.style.font = window.getComputedStyle(ta).font;
      div.style.lineHeight = window.getComputedStyle(ta).lineHeight;
      div.style.color = window.getComputedStyle(ta).color;
      div.textContent = ta.value;
      div.setAttribute("data-pdf-placeholder", "true");

      textareaBackups.push({ textarea: ta, parent: ta.parentNode, nextSibling: ta.nextSibling });
      ta.parentNode.replaceChild(div, ta);
    });

    const h2c = window.html2canvas || html2canvas;
    const { jsPDF } = window.jspdf ? window.jspdf : window;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Captura folha a folha para garantir separação de páginas perfeita sem cortes
    const paginas = clone.querySelectorAll(".pagina");
    let paginasAdicionadas = 0;

    for (let i = 0; i < paginas.length; i++) {
      const pag = paginas[i];
      // Ignora páginas ocultas
      if (pag.offsetWidth === 0 || pag.offsetHeight === 0 || window.getComputedStyle(pag).display === "none") {
        continue;
      }

      const canvas = await h2c(pag, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        ignoreElements: (el) => {
          return el.classList.contains("no-print") ||
            el.classList.contains("btn-add-nota-pagina") ||
            el.classList.contains("btn-delete-nota") ||
            el.classList.contains("add-note-toolbar");
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (paginasAdicionadas > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      paginasAdicionadas++;
    }

    // Restaura as textareas originais após a captura
    textareaBackups.forEach(({ textarea, parent, nextSibling }) => {
      const placeholder = parent.querySelector("[data-pdf-placeholder]") || (nextSibling ? nextSibling.previousSibling : parent.lastChild);
      if (placeholder && placeholder.getAttribute("data-pdf-placeholder")) {
        parent.replaceChild(textarea, placeholder);
      }
    });

    // DISPARO DO DOWNLOAD
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'Relatorio_Valorum.pdf';
    document.body.appendChild(a);
    a.click();

    // Limpeza
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

  } catch (e) {
    console.error("Erro no PDF:", e);
    alert("Ocorreu um erro técnico. Por favor, tente usar o navegador Google Chrome ou Microsoft Edge.");
  } finally {
    document.body.classList.remove("pdf-exporting");
    btn.innerText = textoOriginal;
    btn.disabled = false;
  }
}

// Ativa animação quando o elemento entra na tela
document.addEventListener('revealed', (e) => {
  const container = e.target;
  const canvas = container.querySelector('canvas');
  if (canvas) {
    const chart = Chart.getChart(canvas);
    if (chart) {
      chart.options.animation.duration = 2000;
      chart.update();
    }
  }
});

// Auto-salvar no localStorage ou Supabase do Dashboard
async function salvarRelatorioNoHistorico() {
  const familiaStr = sessionStorage.getItem("familia");
  if (!familiaStr) {
    console.warn("[salvarRelatorioNoHistorico] Nenhum dado de família no sessionStorage; relatório não será salvo no histórico.");
    return;
  }

  const familia = JSON.parse(familiaStr);
  const nomeCliente = familia.nome || "Cliente";
  const nomeAssessor = sessionStorage.getItem("nome_assessor") || "Assessor";
  const dataReuniao = sessionStorage.getItem("data_reuniao") || new Date().toLocaleDateString("pt-BR");

  const totalPatrimonio = Number(sessionStorage.getItem("total_patrimonio")) || 0;
  const prejuizoFinalStr = sessionStorage.getItem("prejuizo_final");
  let prejuizoTributario = 0;
  if (prejuizoFinalStr) {
    const finalObj = JSON.parse(prejuizoFinalStr);
    prejuizoTributario = finalObj.prejuizoAtual || 0;
  }

  // Identificador da simulação
  let reportId = sessionStorage.getItem("current_report_id");
  if (!reportId) {
    reportId = "rep_" + Date.now();
    sessionStorage.setItem("current_report_id", reportId);
  }

  // Chaves do sessionStorage a persistir
  const sessionData = {};
  const keysToSave = [
    "patrimonio_dados",
    "total_patrimonio",
    "nome_assessor",
    "data_reuniao",
    "familia",
    "evolucao_dados",
    "tributario_inputs",
    "prejuizo_final",
    "partilha_dados",
    "segunda_morte_dados",
    "current_report_id"
  ];
  keysToSave.forEach(key => {
    const val = sessionStorage.getItem(key);
    if (val) {
      try {
        sessionData[key] = JSON.parse(val);
      } catch (e) {
        sessionData[key] = val;
      }
    }
  });

  const relatorio = {
    id: reportId,
    nomeCliente,
    nomeAssessor,
    dataReuniao,
    totalPatrimonio,
    prejuizoTributario,
    dataCriacao: new Date().toISOString(),
    dadosSessao: sessionData
  };

  try {
    await dbSalvarRelatorio(relatorio);
  } catch (e) {
    console.error("Falha ao salvar relatório no histórico", e);
  }
}

// ==========================================
// PITCH SALES COPILOT (WHATSAPP/E-MAIL)
// ==========================================
function copiarPitchWhatsApp() {
  const capRec = document.getElementById("p6_capital_recomendado")?.innerText || "R$ 0";
  const parcEst = document.getElementById("p6_parcela_estimada")?.innerText || "R$ 0 /mês";
  const perdaEst = document.getElementById("p6_perda_total_sem_seguro")?.innerText || "R$ 0";

  let nomeCliente = "Cliente";
  try {
    const familiaStr = sessionStorage.getItem("familia");
    if (familiaStr) {
      const familia = JSON.parse(familiaStr);
      if (familia.nome) nomeCliente = familia.nome;
    }
  } catch (e) { }

  const textoPitch =
    `*Planejamento de Liquidez Sucessória — ${nomeCliente}*\n\n` +
    `Olá, ${nomeCliente}! Conforme nossa análise de planejamento patrimonial:\n\n` +
    `🔴 *Sem Seguro (Inventário Tradicional)*:\n` +
    `• Perda estimada em impostos (ITCMD), custas e deságio: *${perdaEst}*\n` +
    `• Investimentos e contas familiares bloqueados judicialmente.\n\n` +
    `🟢 *Com Seguro Resgatável (Proteção de Liquidez)*:\n` +
    `• Apólice de Liquidez Recomendada: *${capRec}*\n` +
    `• Aporte estimado: *${parcEst}*\n` +
    `• Benefício 100% livre de inventário e isento de ITCMD (Art. 794 CC).\n\n` +
    `Estou à disposição para estruturar sua apólice!`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textoPitch).then(() => {
      if (typeof mostrarToast === "function") {
        mostrarToast("Pitch para WhatsApp copiado!", "sucesso");
      } else {
        alert("Pitch para WhatsApp copiado com sucesso!");
      }
    }).catch(err => {
      console.error("Erro ao copiar texto:", err);
    });
  } else {
    alert(textoPitch);
  }
}

