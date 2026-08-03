// =========================
// CONFIGURAÇÕES E ESTADO
// =========================
let grafico;

let taxasMercado = {
  cdi: 0.0, // Fallback zerado por solicitação
  ipca: 0.0, // Fallback zerado por solicitação
  cdiCurva: {}, // Armazena expectativas por ano { '2024': 0.10, '2025': 0.09... }
  ipcaCurva: {}
};

window.onload = async function () {
  // Puxa o total geral e os dados específicos
  const totalSalvo = sessionStorage.getItem("total_patrimonio");
  const dadosSalvos = sessionStorage.getItem("patrimonio_dados");

  const totalGeral = totalSalvo ? Number(totalSalvo) : 0;
  const dadosPatrimonio = dadosSalvos ? JSON.parse(dadosSalvos) : {};

  // Função de parse ultra-robusta
  const parseV = (v) => {
    if (!v) return 0;
    let limpo = String(v).replace(/\s/g, "").replace("R$", "").replace(/\./g, "").replace(",", ".");
    return parseFloat(limpo) || 0;
  };

  // Modificado: O patrimônio base da projeção agora é o patrimônio total bruto (incluindo bens móveis)
  const totalRentavel = totalGeral;

  // Variável global para o cálculo
  window.patrimonioInicialEvolucao = totalRentavel;
  window.prevInicialEvolucao = dadosPatrimonio.prev ? parseV(dadosPatrimonio.prev) : 0;

  const aviso = document.getElementById("aviso_sem_patrimonio");
  // Só mostra o aviso se realmente não houver NADA no sistema
  if (totalGeral === 0 && Object.keys(dadosPatrimonio).length === 0) {
    if (aviso) aviso.style.display = "block";
  } else {
    if (aviso) aviso.style.display = "none";
  }

  // Atualiza os displays na tela
  const elInputInicial = document.getElementById("valor_inicial");
  const elDisplayInicial = document.getElementById("display_inicial");

  if (elInputInicial) elInputInicial.value = totalRentavel.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  if (elDisplayInicial) elDisplayInicial.innerText = "R$ " + totalRentavel.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  // Configura os Inputs
  setupInputs();

  // Carrega persistência de inputs (taxa, anos, etc)
  const salvos = JSON.parse(sessionStorage.getItem("evolucao_inputs"));
  const premissasGlobais = JSON.parse(sessionStorage.getItem("mercado_premissas"));

  if (salvos) {
    if (salvos.taxa) document.getElementById("taxa").value = salvos.taxa;
    if (salvos.aporte) document.getElementById("aporte_mensal").value = salvos.aporte;
    if (salvos.anos) document.getElementById("anos").value = salvos.anos;
  }

  // Carrega CDI/IPCA da memória global ou da API se for a primeira vez
  if (premissasGlobais) {
    if (premissasGlobais.cdi) document.getElementById("cdi_manual").value = premissasGlobais.cdi;
    if (premissasGlobais.ipca) document.getElementById("ipca_manual").value = premissasGlobais.ipca;
  }

  // Busca Taxas Reais do Banco Central
  await buscarTaxasBCB();

  // Primeiro cálculo automático
  calcular();
};

async function buscarTaxasBCB() {
  try {
    // API Olinda para Expectativas de Mercado (Relatório Focus)
    // Buscamos as expectativas anuais mais recentes
    const url = "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$filter=Indicador eq 'IPCA' or Indicador eq 'Selic'&$orderby=Data desc&$top=100&$format=json";

    const response = await fetch(url);
    const data = await response.json();

    if (data && data.value && data.value.length > 0) {
      // 1. Identificamos a data do último relatório publicado
      const dataUltimoRelatorio = data.value[0].Data;

      // 2. Filtramos todas as projeções que pertencem a esse último relatório
      const projecoesAtuais = data.value.filter(item => item.Data === dataUltimoRelatorio);

      projecoesAtuais.forEach(item => {
        const ano = item.DataReferencia;
        const valor = Number(item.Mediana) / 100;

        if (item.Indicador === 'Selic') {
          taxasMercado.cdiCurva[ano] = valor;
        } else if (item.Indicador === 'IPCA') {
          taxasMercado.ipcaCurva[ano] = valor;
        }
      });

      // 3. Definimos a taxa "base" (para legenda e anos fora da curva) como a do ano corrente
      const anoAtual = new Date().getFullYear().toString();
      taxasMercado.cdi = taxasMercado.cdiCurva[anoAtual] || Object.values(taxasMercado.cdiCurva)[0];
      taxasMercado.ipca = taxasMercado.ipcaCurva[anoAtual] || Object.values(taxasMercado.ipcaCurva)[0];

      console.log("Curva CDI capturada:", taxasMercado.cdiCurva);
      console.log("Curva IPCA capturada:", taxasMercado.ipcaCurva);
    }

    // Atualiza legenda na UI (mostrando a do ano atual ou a primeira disponível)
    const elCDI = document.getElementById("legenda_cdi_valor");
    const elIPCA = document.getElementById("legenda_ipca_valor");

    if (elCDI) {
      elCDI.innerText = `CDI Proj. (${(taxasMercado.cdi * 100).toFixed(2)}%)`;
      // Removido preenchimento automático para o assessor escolher
    }
    if (elIPCA) {
      elIPCA.innerText = `IPCA Proj. (${(taxasMercado.ipca * 100).toFixed(2)}%)`;
      // Removido preenchimento automático para o assessor escolher
    }

  } catch (error) {
    console.error("Erro ao buscar taxas projetadas do Relatório Focus:", error);
  }
}

function setupInputs() {
  const inputTaxa = document.getElementById("taxa");
  const inputAporte = document.getElementById("aporte_mensal");
  const inputAnos = document.getElementById("anos");
  const inputCDI = document.getElementById("cdi_manual");
  const inputIPCA = document.getElementById("ipca_manual");

  // Máscara para Rentabilidade (Percentual)
  inputTaxa.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value) {
      value = (Number(value) / 100).toFixed(2).replace(".", ",");
      e.target.value = value;
    }
    calcular();
    salvarInputs();
  });

  // Máscara para Aporte Mensal (Moeda)
  inputAporte.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value) {
      value = (Number(value) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      e.target.value = "R$ " + value;
    }
    calcular();
    salvarInputs();
  });

  inputAnos.addEventListener("input", () => {
    calcular();
    salvarInputs();
  });

  // Novos inputs de mercado (com máscara percentual robusta)
  [inputCDI, inputIPCA].forEach(input => {
    if (!input) return;
    input.addEventListener("input", function (e) {
      // Remove tudo que não é dígito
      let value = e.target.value.replace(/\D/g, "");

      if (value) {
        // Converte para decimal e formata com vírgula (ex: 1000 -> 10,00)
        let total = (Number(value) / 100).toFixed(2).replace(".", ",");
        e.target.value = total;
      } else {
        e.target.value = "0,00";
      }

      calcular();
      salvarPremissas();
    });
  });
}
function salvarInputs() {
  const taxa = document.getElementById("taxa")?.value;
  const aporte = document.getElementById("aporte_mensal")?.value;
  const anos = document.getElementById("anos")?.value;
  sessionStorage.setItem("evolucao_inputs", JSON.stringify({ taxa, aporte, anos }));
}

function salvarPremissas() {
  const cdi = document.getElementById("cdi_manual")?.value;
  const ipca = document.getElementById("ipca_manual")?.value;
  sessionStorage.setItem("mercado_premissas", JSON.stringify({ cdi, ipca }));
}

// =========================
// CÁLCULO CORE
// =========================
function parseValue(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  let val = el.value;
  if (!val) return 0;
  // Remove R$, espaços, pontos de milhar e troca vírgula por ponto
  return Number(val.replace(/[R$\s.]/g, "").replace(",", ".")) || 0;
}

function calcular() {
  // Usa o valor pré-calculado (sem bens móveis)
  const valorInicial = window.patrimonioInicialEvolucao || 0;
  const prevInicial = window.prevInicialEvolucao || 0;
  const taxaAnual = parseValue("taxa") / 100;
  const aporteMensal = parseValue("aporte_mensal");
  const anosProjecao = Number(document.getElementById("anos").value);

  const aporteAnual = aporteMensal * 12;

  const anosArr = [];
  const valoresArr = [];
  const cdiArr = [];
  const ipcaArr = [];
  const prevResultados = [];

  let valorAcumulado = valorInicial;
  let cdiAcumulado = valorInicial;
  let ipcaAcumulado = valorInicial;
  let prevAcumulado = prevInicial;

  const anoBase = new Date().getFullYear();

  for (let i = 0; i <= anosProjecao; i++) {
    const anoAtual = (anoBase + i).toString();

    // Pega a taxa específica para aquele ano na curva do Focus, ou usa a última conhecida
    // OVERRIDE: Se o usuário preencheu o campo manual, usamos o valor fixo dele
    const manualCDI = parseValue("cdi_manual") / 100;
    const manualIPCA = parseValue("ipca_manual") / 100;

    const taxaCDIAnual = manualCDI;
    const taxaIPCAAnual = manualIPCA;

    anosArr.push("Ano " + i);
    valoresArr.push(Math.round(valorAcumulado));
    cdiArr.push(Math.round(cdiAcumulado));
    ipcaArr.push(Math.round(ipcaAcumulado));
    prevResultados.push(Math.round(prevAcumulado));

    // Evolução com juros compostos ano a ano
    valorAcumulado = valorAcumulado * (1 + taxaAnual) + aporteAnual;
    prevAcumulado = prevAcumulado * (1 + taxaAnual);
    cdiAcumulado = cdiAcumulado * (1 + taxaCDIAnual) + aporteAnual;
    ipcaAcumulado = ipcaAcumulado * (1 + taxaIPCAAnual) + aporteAnual;
  }

  // 4. Calcular Médias para a Legenda (Exibir o impacto real do período)
  // Como as taxas variam ano a ano no Focus, mostramos a média aritmética do período selecionado
  let somaCDI = 0;
  let somaIPCA = 0;
  let anosComDados = 0;
  const manualCDI = parseValue("cdi_manual") / 100;
  const manualIPCA = parseValue("ipca_manual") / 100;

  const mediaCDI = manualCDI * 100;
  const mediaIPCA = manualIPCA * 100;

  // Atualiza legendas com a média do período
  const elCDI = document.getElementById("legenda_cdi_valor");
  const elIPCA = document.getElementById("legenda_ipca_valor");
  if (elCDI) elCDI.innerText = `CDI Proj. (${mediaCDI.toFixed(2)}%)`;
  if (elIPCA) elIPCA.innerText = `IPCA Proj. (${mediaIPCA.toFixed(2)}%)`;

  updateDashboard(valoresArr[valoresArr.length - 1], valorInicial);
  renderChart(anosArr, valoresArr, cdiArr, ipcaArr);
  generateMagicInsight(taxaAnual, aporteMensal, anosProjecao, valoresArr[valoresArr.length - 1]);

  // Salva persistência
  sessionStorage.setItem("evolucao_dados", JSON.stringify({
    anos: anosArr,
    resultados: valoresArr,
    resultadosPrev: prevResultados,
    taxa: document.getElementById("taxa").value,
    tempo: anosProjecao,
    aporteAnual: aporteAnual
  }));

  // Auto-save: persiste progressivamente no Supabase com debounce
  if (typeof dbAutoSalvar === "function") dbAutoSalvar();
}

// =========================
// DASHBOARD & INSIGHTS
// =========================
function updateDashboard(final, inicial) {
  const multiplicador = (inicial && inicial > 0) ? (final / inicial) : (final > 0 ? 1 : 0);

  const elFinal = document.getElementById("insight_final");
  const elMult = document.getElementById("insight_multiplicador");
  if (elFinal) elFinal.innerText = "R$ " + (final || 0).toLocaleString("pt-BR");
  if (elMult) elMult.innerText = multiplicador.toFixed(1) + "x";

  // Animação de contagem (opcional, mas elegante)
  if (elMult) animateValue("insight_multiplicador", 0, multiplicador, 1000, "x");
}

function animateValue(id, start, end, duration, suffix = "") {
  const obj = document.getElementById(id);
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const current = (progress * (end - start) + start).toFixed(1);
    obj.innerHTML = current + suffix;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

function generateMagicInsight(taxa, aporte, tempo, totalFinal) {
  const magicText = document.getElementById("magic_text");
  if (!magicText) return;

  if (taxa > 0.12) {
    magicText.innerHTML = "🚀 <b>Perfil Arrojado:</b> Sua rentabilidade projetada está acima da média de mercado. Certifique-se de diversificar ativos para mitigar riscos de volatilidade.";
  } else if (aporte > 10000) {
    magicText.innerHTML = "💰 <b>Poder de Aporte:</b> Seu aporte mensal é o maior motor do seu crescimento. Em " + tempo + " anos, os aportes representarão uma fatia significativa do seu montante total.";
  } else if (tempo > 20) {
    magicText.innerHTML = "⏳ <b>Juros Compostos:</b> O tempo é seu maior aliado. Note como a curva do gráfico se torna exponencial nos últimos 5 anos da projeção.";
  } else {
    magicText.innerHTML = "💡 <b>Dica Pace:</b> Aumentar seu aporte mensal em 20% poderia antecipar sua meta financeira em quase 4 anos.";
  }
}

// =========================
// RENDERIZAÇÃO DO GRÁFICO
// =========================
function renderChart(labels, data, cdi, ipca) {
  const ctx = document.getElementById("graficoEvolucao").getContext("2d");

  // Gradient Background
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "rgba(11, 83, 184, 0.3)");
  gradient.addColorStop(1, "rgba(11, 83, 184, 0.0)");

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Sua Projeção",
          data: data,
          borderColor: "#0B53B8",
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#0B53B8",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 3
        },
        {
          label: "CDI Projetado",
          data: cdi,
          borderColor: "#1D6F42",
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0
        },
        {
          label: "IPCA Projetado",
          data: ipca,
          borderColor: "#e53935",
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
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          titleColor: "#000",
          bodyColor: "#000",
          borderColor: "#e1e8f0",
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: function (context) {
              return context.dataset.label + ": R$ " + context.raw.toLocaleString("pt-BR");
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          beginAtZero: false,
          ticks: {
            callback: value => "R$ " + (value / 1000000).toFixed(1) + "M",
            stepSize: 500000
          },
          grid: { color: "rgba(0,0,0,0.05)" }
        }
      }
    }
  });
}

function resetar() {
  document.getElementById("taxa").value = "10,00";
  document.getElementById("aporte_mensal").value = "0,00";
  document.getElementById("anos").value = 10;
  document.getElementById("cdi_manual").value = "0,00";
  document.getElementById("ipca_manual").value = "0,00";

  calcular();
}