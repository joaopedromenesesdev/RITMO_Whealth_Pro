let g1, g2, g3, g4;
Chart.register(ChartDataLabels);

// =========================
// FORMATAÇÃO
// =========================
function formatar(input) {
  let value = input.value.replace(/\D/g, "");

  // Converte para decimal (centavos)
  let val = (Number(value) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (value === "") {
    input.value = "";
  } else {
    input.value = val;
  }
}

function pegar(id) {
  let el = document.getElementById(id);
  if (!el || !el.value) return 0;

  // Remove pontos e troca vírgula por ponto para o Number()
  let valor = el.value
    .replace(/\./g, "")
    .replace(",", ".");

  return Number(valor) || 0;
}

function formatarPercentual(v) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + "%";
}

// =========================
// ANIMAÇÃO DE NÚMEROS
// =========================
function animateValue(id, start, end, duration) {
  if (start === end) return;
  const obj = document.getElementById(id);
  const range = end - start;
  let current = start;
  const increment = end > start ? 1 : -1;
  const stepTime = Math.abs(Math.floor(duration / range));

  // Se o range for muito grande, usamos um passo fixo por frame
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (easeOutExpo)
    const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

    current = start + (range * easeProgress);
    obj.innerText = "R$ " + Math.floor(current).toLocaleString("pt-BR");

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      obj.innerText = "R$ " + end.toLocaleString("pt-BR");
    }
  }

  requestAnimationFrame(update);
}

// =========================
// HELPER SANITIZAÇÃO
// =========================
function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}

// =========================
// EMPRESAS DINÂMICAS (ACCORDION MODERNO)
// =========================

function atualizarResumoEmpresasBadge() {
  const itens = document.querySelectorAll(".empresa_item");
  let totalFatias = 0;
  const count = itens.length;

  itens.forEach((item, idx) => {
    const valInput = item.querySelector(".empresa_valor");
    const pctInput = item.querySelector(".empresa_pct");
    const cnpjInput = item.querySelector(".empresa_cnpj");
    const subEl = item.querySelector(".empresa-header-sub");

    const vTexto = valInput ? valInput.value.replace(/\./g, "").replace(",", ".") : "0";
    const v = Number(vTexto) || 0;
    const p = pctInput ? Number(pctInput.value) || 0 : 0;
    const fatia = v * (p / 100);
    totalFatias += fatia;

    const chipPct = item.querySelector(".empresa-chip-pct");
    const chipFatia = item.querySelector(".empresa-chip-fatia");
    const feedbackValor = item.querySelector(".empresa-fatia-valor-texto");
    const fatiaStr = "R$ " + fatia.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (chipPct) chipPct.textContent = p > 0 ? `${p}% da cota` : "0% da cota";
    if (chipFatia) chipFatia.textContent = fatiaStr;
    if (feedbackValor) feedbackValor.textContent = fatiaStr;

    if (subEl) {
      if (cnpjInput && cnpjInput.value.trim()) {
        subEl.textContent = cnpjInput.value.trim();
      } else {
        subEl.textContent = "Toque para configurar";
      }
    }
  });

  const badgeVal = document.getElementById("total_empresas_badge");
  const badgeQtd = document.getElementById("qtd_empresas_badge");
  const hiddenQtd = document.getElementById("qtd_empresas");

  if (badgeVal) {
    badgeVal.textContent = "R$ " + totalFatias.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (badgeQtd) {
    badgeQtd.textContent = count === 1 ? "1 empresa" : `${count} empresas`;
  }
  if (hiddenQtd) {
    hiddenQtd.value = count;
  }
}
window.atualizarResumoEmpresasBadge = atualizarResumoEmpresasBadge;

window.toggleEmpresaCard = function (headerEl) {
  const card = headerEl.closest(".empresa-accordion-card");
  if (!card) return;
  card.classList.toggle("is-open");
};

function calcularFatiaEmpresaFormatada(valorStr, pctStr) {
  const v = Number(String(valorStr || '').replace(/\./g, "").replace(",", ".")) || 0;
  const p = Number(pctStr) || 0;
  const fatia = v * (p / 100);
  return "R$ " + fatia.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function adicionarEmpresa(dadosIniciais = null, aberta = true) {
  const container = document.getElementById("inputs_empresas");
  if (!container) return;

  const indexAtual = container.querySelectorAll(".empresa_item").length + 1;
  const nomePadrao = (dadosIniciais && dadosIniciais.nome && !dadosIniciais.nome.startsWith("Empresa "))
    ? dadosIniciais.nome
    : `Empresa ${indexAtual}`;
  const cnpjPadrao = (dadosIniciais && dadosIniciais.cnpj) ? dadosIniciais.cnpj : "";
  const valorPadrao = (dadosIniciais && dadosIniciais.valor) ? formatarValorRestaurado(dadosIniciais.valor) : "";
  const pctPadrao = (dadosIniciais && dadosIniciais.pct !== undefined) ? dadosIniciais.pct : "";
  const fatiaInicialStr = calcularFatiaEmpresaFormatada(valorPadrao, pctPadrao);

  const card = document.createElement("div");
  card.className = `empresa_item empresa-accordion-card ${aberta ? "is-open" : ""}`;
  card.innerHTML = `
    <div class="empresa-card-header" onclick="window.toggleEmpresaCard(this)">
      <div class="empresa-header-left">
        <div class="empresa-icon-box">
          <i data-lucide="building-2" style="width: 15px; height: 15px;"></i>
        </div>
        <div class="empresa-header-texts">
          <h5 class="empresa_nome_display">${escapeHTML(nomePadrao)}</h5>
          <span class="empresa-header-sub">${cnpjPadrao ? escapeHTML(cnpjPadrao) : 'Toque para configurar'}</span>
        </div>
      </div>
      <div class="empresa-header-right">
        <div class="empresa-value-tag">
          <span class="empresa-chip-fatia">${fatiaInicialStr}</span>
          <span class="empresa-chip-pct">${pctPadrao ? `${escapeHTML(pctPadrao)}% da cota` : '0% da cota'}</span>
        </div>
        <div class="empresa-chevron">
          <i data-lucide="chevron-down" style="width: 15px; height: 15px;"></i>
        </div>
      </div>
    </div>

    <div class="empresa-card-body">
      <div class="input-group">
        <div class="empresa-label-row">
          <label>CNPJ</label>
          <span class="empresa-badge-auto">Busca automática</span>
        </div>
        <input type="text" class="empresa_cnpj input-premium" placeholder="00.000.000/0000-00" value="${escapeHTML(cnpjPadrao)}">
      </div>

      <div class="empresa-inputs-grid">
        <div class="input-group">
          <label>Valor da Empresa</label>
          <div class="input-box">
            <span>R$</span>
            <input type="text" class="empresa_valor input-premium" value="${escapeHTML(valorPadrao)}">
          </div>
        </div>

        <div class="input-group">
          <label>Sua Participação (%)</label>
          <div class="input-box input-pct-box">
            <input type="number" class="empresa_pct input-premium" placeholder="Ex: 50" min="0" max="100" value="${escapeHTML(pctPadrao)}">
            <span class="pct-symbol">%</span>
          </div>
        </div>
      </div>

      <div class="empresa-card-footer">
        <div class="empresa-share-stat">
          <span>Sua cota no patrimônio</span>
          <strong class="empresa-fatia-valor-texto">${fatiaInicialStr}</strong>
        </div>
        <button type="button" class="btn-excluir-empresa" title="Remover empresa" onclick="removerEmpresa(event, this)">
          <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
          <span>Excluir</span>
        </button>
      </div>
    </div>
  `;

  container.appendChild(card);
  vincularEventosItemEmpresa(card);

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  window.atualizarResumoEmpresasBadge();
}

function vincularEventosItemEmpresa(item) {
  const valInput = item.querySelector(".empresa_valor");
  const pctInput = item.querySelector(".empresa_pct");
  const cnpjInput = item.querySelector(".empresa_cnpj");

  if (valInput) {
    valInput.addEventListener("input", function () {
      formatar(this);
      window.atualizarResumoEmpresasBadge();
      salvarPatrimonio();
    });
  }

  if (pctInput) {
    pctInput.addEventListener("input", function () {
      window.atualizarResumoEmpresasBadge();
      salvarPatrimonio();
    });
  }

  if (cnpjInput) {
    cnpjInput.addEventListener("input", async function () {
      let cnpj = this.value.replace(/\D/g, "");

      // Aplicar Máscara CNPJ
      if (cnpj.length <= 14) {
        let m = cnpj;
        if (m.length > 12) m = m.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2}).*/, "$1.$2.$3/$4-$5");
        else if (m.length > 8) m = m.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, "$1.$2.$3/$4");
        else if (m.length > 5) m = m.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, "$1.$2.$3");
        else if (m.length > 2) m = m.replace(/^(\d{2})(\d{1,3}).*/, "$1.$2");
        this.value = m;
      }

      const displayEl = item.querySelector(".empresa_nome_display");
      const subEl = item.querySelector(".empresa-header-sub");

      if (subEl) {
        subEl.textContent = this.value || "Toque para configurar";
      }

      if (cnpj.length === 14) {
        if (displayEl) displayEl.innerHTML = `<span class="loading-dots" style="font-size: 11px; color: var(--primary);">Buscando CNPJ...</span>`;
        try {
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
          if (response.ok) {
            const data = await response.json();
            const nomeFinal = escapeHTML(data.nome_fantasia || data.razao_social || "Empresa");
            if (displayEl) {
              displayEl.innerHTML = `<i class="icon-check" style="color: #16a34a; margin-right: 4px;"></i> ${nomeFinal}`;
            }

            if (data.capital_social > 0) {
              if (valInput) {
                valInput.value = (data.capital_social * 100).toString();
                formatar(valInput);
                valInput.classList.add("filled");
              }
            }
          } else {
            if (displayEl) displayEl.innerText = "Empresa não encontrada";
          }
        } catch (e) {
          if (displayEl) displayEl.innerText = "Erro na consulta";
        }
        window.atualizarResumoEmpresasBadge();
        salvarPatrimonio();
      } else if (cnpj.length === 0) {
        if (displayEl && displayEl.innerText.includes("Empresa")) {
          const idx = Array.from(document.querySelectorAll(".empresa_item")).indexOf(item) + 1;
          displayEl.innerText = `Empresa ${idx}`;
        }
        window.atualizarResumoEmpresasBadge();
        salvarPatrimonio();
      }
    });
  }
}

window.removerEmpresa = function (event, btnEl) {
  if (event) {
    event.stopPropagation();
  }

  const card = btnEl.closest(".empresa_item");
  if (!card) return;

  card.style.opacity = "0";
  card.style.transform = "scale(0.95)";
  card.style.transition = "all 0.2s ease";

  setTimeout(() => {
    card.remove();

    // Renumera empresas que ainda possuam nome genérico
    const itens = document.querySelectorAll(".empresa_item");
    itens.forEach((it, i) => {
      const nomeEl = it.querySelector(".empresa_nome_display");
      if (nomeEl && /^Empresa\s*\d+$/i.test(nomeEl.innerText.trim())) {
        nomeEl.innerText = `Empresa ${i + 1}`;
      }
    });

    window.atualizarResumoEmpresasBadge();
    salvarPatrimonio();
  }, 180);
};

// Eventos de ativação e botão adicionar
document.getElementById("tem_empresas").addEventListener("change", function () {
  const area = document.getElementById("area_empresas");
  const container = document.getElementById("inputs_empresas");

  if (this.value === "sim") {
    area.style.display = "block";
    if (container.children.length === 0) {
      adicionarEmpresa(null, true);
    }
  } else {
    area.style.display = "none";
    container.innerHTML = "";
    document.getElementById("qtd_empresas").value = "0";
  }

  window.atualizarResumoEmpresasBadge();
  salvarPatrimonio();
});

const btnAddEmp = document.getElementById("btn_adicionar_empresa");
if (btnAddEmp) {
  btnAddEmp.addEventListener("click", function () {
    document.querySelectorAll(".empresa-accordion-card").forEach(c => c.classList.remove("is-open"));
    adicionarEmpresa(null, true);
    salvarPatrimonio();
  });
}

// =========================
// EVENTOS INPUTS
// =========================
document.querySelectorAll("input, select").forEach(input => {
  input.addEventListener("input", function () {
    if (this.type === "text") formatar(this);
    checkFilled(this);
    salvarPatrimonio();
  });
});

function checkFilled(el) {
  if (el.value && el.value !== "0" && el.value !== "" && el.value !== "Selecione") {
    el.classList.add("filled");
  } else {
    el.classList.remove("filled");
  }
}

// =========================
// CONFIG GRÁFICOS
// =========================
const coresPizza = [
  "#2563EB", // Azul Royal Vibrante
  "#10B981", // Verde Esmeralda
  "#F59E0B", // Âmbar Dourado
  "#8B5CF6", // Roxo Violeta
  "#EC4899", // Rosa Framboesa
  "#06B6D4", // Ciano Turquesa
  "#F97316", // Laranja Coral
  "#6366F1"  // Índigo
];

function baseOptions(isPercent = true, showDatalabels = true) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "50%",
    animation: { duration: 600 },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 12,
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
            if (ctx.chart.data.labels[0] === "Sem dados") return " R$ 0,00";
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
// PTAX - COTAÇÃO DO DÓLAR (BANCO CENTRAL)
// =========================

// Variável global para guardar a cotação PTAX em memória
let ptaxCotacao = null;
let offshoreEmUSD = false;

/**
 * Busca a média mensal da cotação de venda do dólar (PTAX) do mês atual
 * via API pública do Banco Central do Brasil (OLINDA). Armazena em cache
 * no sessionStorage para não repetir chamadas durante a mesma sessão.
 */
async function buscarCotacaoPTAX() {
  // Verifica cache
  const cacheKey = "ptax_cotacao_cache";
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const obj = JSON.parse(cached);
    // Verifica se o cache é do mesmo mês/ano
    const now = new Date();
    if (obj.mes === now.getMonth() && obj.ano === now.getFullYear()) {
      ptaxCotacao = obj.valor;
      return ptaxCotacao;
    }
  }

  try {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth(); // 0-indexed
    const nomeMeses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    // Período: primeiro ao último dia do mês atual
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);

    // Formata as datas no padrão da API do BCB: MM-DD-YYYY
    const pad = n => String(n).padStart(2, "0");
    const dataInicial = `${pad(primeiroDia.getMonth() + 1)}-${pad(primeiroDia.getDate())}-${primeiroDia.getFullYear()}`;
    const dataFinal = `${pad(ultimoDia.getMonth() + 1)}-${pad(ultimoDia.getDate())}-${ultimoDia.getFullYear()}`;

    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${dataInicial}'&@dataFinalCotacao='${dataFinal}'&$format=json&$select=cotacaoVenda`;

    const resp = await fetch(url);
    const json = await resp.json();

    if (json.value && json.value.length > 0) {
      const soma = json.value.reduce((acc, d) => acc + d.cotacaoVenda, 0);
      const media = soma / json.value.length;
      ptaxCotacao = parseFloat(media.toFixed(4));

      // Guarda no cache
      sessionStorage.setItem(cacheKey, JSON.stringify({
        valor: ptaxCotacao,
        mes: mes,
        ano: ano,
        nomeMes: nomeMeses[mes]
      }));

      return ptaxCotacao;
    }
  } catch (e) {
    console.error("[PTAX] Falha ao buscar cotação do Banco Central:", e);
  }

  return null;
}

/** Alterna o modo de entrada do campo offshore entre BRL e USD */
async function alternarMoedaOffshore() {
  offshoreEmUSD = !offshoreEmUSD;
  const toggleBRL = document.getElementById("toggle_brl");
  const toggleUSD = document.getElementById("toggle_usd");
  const prefix = document.getElementById("offshore_prefix");
  const badge = document.getElementById("offshore_badge");
  const input = document.getElementById("offshore");

  if (offshoreEmUSD) {
    // Ativa modo USD
    toggleBRL.style.background = "";
    toggleBRL.style.color = "#09090b";
    toggleUSD.style.background = "#09090b";
    toggleUSD.style.color = "#fff";
    prefix.textContent = "$";
    badge.style.display = "block";
    input.value = "";
    input.placeholder = "0,00";

    // Busca e exibe a cotação
    const ptaxLabel = document.getElementById("offshore_ptax_valor");
    ptaxLabel.textContent = "buscando...";
    const cotacao = await buscarCotacaoPTAX();
    if (cotacao) {
      const cached = JSON.parse(sessionStorage.getItem("ptax_cotacao_cache") || "{}");
      ptaxLabel.textContent = `R$ ${cotacao.toLocaleString("pt-BR", { minimumFractionDigits: 4 })} (média ${cached.nomeMes || ""}/${cached.ano || ""}) `;
    } else {
      ptaxLabel.textContent = "Indisponível (verifique conexão)";
    }
  } else {
    // Volta para modo BRL
    toggleBRL.style.background = "#09090b";
    toggleBRL.style.color = "#fff";
    toggleUSD.style.background = "";
    toggleUSD.style.color = "#09090b";
    prefix.textContent = "R$";
    badge.style.display = "none";
    input.value = "";
    document.getElementById("offshore_convertido").textContent = "";
  }

  salvarPatrimonio();
}

/** Atualiza o badge com o valor convertido em BRL em tempo real */
function atualizarBadgeOffshore() {
  if (!offshoreEmUSD || !ptaxCotacao) return;
  const input = document.getElementById("offshore");
  const valorUSD = parseFloat(
    (input.value || "0").replace(/\./g, "").replace(",", ".")
  ) || 0;
  const valorBRL = valorUSD * ptaxCotacao;
  const convertidoEl = document.getElementById("offshore_convertido");
  if (valorUSD > 0) {
    convertidoEl.textContent = `≈ R$ ${valorBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    convertidoEl.textContent = "";
  }
}

function calcular() {

  let valoresEmpresas = document.querySelectorAll(".empresa_valor");
  let pctsEmpresas = document.querySelectorAll(".empresa_pct");

  let totalEmpresas = 0;
  let distribuicaoEmpresas = [];

  valoresEmpresas.forEach((input, i) => {
    let valorTexto = input.value.replace(/\./g, "").replace(",", ".");
    let valor = Number(valorTexto) || 0;
    let pct = Number(pctsEmpresas[i]?.value) || 0;

    let valorCliente = valor * (pct / 100);

    totalEmpresas += valorCliente;
    distribuicaoEmpresas.push(valorCliente);
  });

  let rf = pegar("rf");
  let rv = pegar("rv");
  let inter = pegar("inter");
  let prev = pegar("prev");

  // Se estiver no modo USD, converte usando a cotação PTAX antes de somar
  let offshoreRaw = pegar("offshore");
  let offshore = offshoreEmUSD && ptaxCotacao
    ? offshoreRaw * ptaxCotacao
    : offshoreRaw;

  let totalA = rf + rv + inter + prev + offshore;

  let apt = pegar("apt");
  let casa = pegar("casa");
  let terr = pegar("terr");
  let galp = pegar("galp");
  let bens_particulares = pegar("bens_particulares");

  let totalI = apt + casa + terr + galp + bens_particulares;

  let bens = pegar("bens");

  let totalGeral = totalA + totalI + bens + totalEmpresas;

  // 🔥 SALVA TOTAL
  sessionStorage.setItem("total_patrimonio", totalGeral);

  // 🔥 SALVA DADOS DOS GRÁFICOS (IMPORTANTE PRO PDF)
  sessionStorage.setItem("dados_graficos", JSON.stringify({
    aplicacoes: totalA,
    imoveis: totalI,
    bens: bens,
    empresas: totalEmpresas
  }));

  const totalEl = document.getElementById("total");
  const valorAnterior = window.valorTotalAntigo || 0;
  window.valorTotalAntigo = totalGeral;

  animateValue("total", valorAnterior, totalGeral, 650);

  if (totalGeral === 0) return;

  let pA = (totalA / totalGeral) * 100;
  let pI = (totalI / totalGeral) * 100;
  let pB = (bens / totalGeral) * 100;
  let pE = (totalEmpresas / totalGeral) * 100;

  let pRF = totalA ? (rf / totalA) * 100 : 0;
  let pRV = totalA ? (rv / totalA) * 100 : 0;
  let pINTER = totalA ? (inter / totalA) * 100 : 0;
  let pPREV = totalA ? (prev / totalA) * 100 : 0;
  let pOFF = totalA ? (offshore / totalA) * 100 : 0;

  let pAPT = totalI ? (apt / totalI) * 100 : 0;
  let pCASA = totalI ? (casa / totalI) * 100 : 0;
  let pTERR = totalI ? (terr / totalI) * 100 : 0;
  let pGALP = totalI ? (galp / totalI) * 100 : 0;
  let pBENS_PART = totalI ? (bens_particulares / totalI) * 100 : 0;

  if (g1) g1.destroy();
  if (g2) g2.destroy();
  if (g3) g3.destroy();
  if (g4) g4.destroy();

  const temGeral = (pA + pI + pB + pE) > 0;
  const temA = totalA > 0;
  const temI = totalI > 0;
  const temE = totalEmpresas > 0;

  g1 = new Chart(document.getElementById("g1"), {
    type: "doughnut",
    data: {
      labels: temGeral ? ["Aplicações", "Imóveis", "Bens", "Empresas"] : ["Sem dados"],
      datasets: [{
        data: temGeral ? [pA, pI, pB, pE] : [1],
        backgroundColor: temGeral ? coresPizza.slice(0, 4) : ["#e2e8f0"],
        borderWidth: 2,
        borderColor: "#ffffff",
        hoverOffset: 6,
        radius: "85%"
      }]
    },
    options: {
      ...baseOptions(true, true),
      onClick: (evt, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const labels = ["Aplicações Financeiras", "Bens Imóveis", "Bens Móveis", "Empresas"];
          const targetLabel = labels[index];

          // Procura o título h2 correspondente e faz scroll
          const headers = document.querySelectorAll("h2");
          headers.forEach(h => {
            if (h.innerText.includes(targetLabel)) {
              h.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              h.parentElement.style.ring = "2px solid var(--primary)";
              h.parentElement.classList.add("highlight-card");
              setTimeout(() => h.parentElement.classList.remove("highlight-card"), 2000);
            }
          });
        }
      },
      onHover: (evt, elements) => {
        evt.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    }
  });

  g2 = new Chart(document.getElementById("g2"), {
    type: "doughnut",
    data: {
      labels: temA ? ["Renda Fixa", "Renda Variável", "Fundos de Investimento", "Previdência", "Offshore"] : ["Sem dados"],
      datasets: [{
        data: temA ? [pRF, pRV, pINTER, pPREV, pOFF] : [1],
        backgroundColor: temA ? coresPizza.slice(0, 5) : ["#e2e8f0"],
        borderWidth: 2,
        borderColor: "#ffffff",
        hoverOffset: 6,
        radius: "85%"
      }]
    },
    options: baseOptions(true, true)
  });

  g3 = new Chart(document.getElementById("g3"), {
    type: "doughnut",
    data: {
      labels: temI ? ["Apartamento", "Casa", "Terreno", "Galpão/Imóvel Rural", "Bens Particulares"] : ["Sem dados"],
      datasets: [{
        data: temI ? [pAPT, pCASA, pTERR, pGALP, pBENS_PART] : [1],
        backgroundColor: temI ? coresPizza.slice(0, 5) : ["#e2e8f0"],
        borderWidth: 2,
        borderColor: "#ffffff",
        hoverOffset: 6,
        radius: "85%"
      }]
    },
    options: baseOptions(true, true)
  });

  let nomesEmpresas = [];
  document.querySelectorAll(".empresa_item").forEach((it, i) => {
    let nEl = it.querySelector(".empresa_nome_display");
    nomesEmpresas.push(nEl && nEl.innerText.trim() ? nEl.innerText.trim() : `Empresa ${i + 1}`);
  });

  g4 = new Chart(document.getElementById("g4"), {
    type: "doughnut",
    data: {
      labels: temE ? nomesEmpresas : ["Sem dados"],
      datasets: [{
        data: temE ? distribuicaoEmpresas : [1],
        backgroundColor: temE ? coresPizza.slice(0, Math.max(1, distribuicaoEmpresas.length)) : ["#e2e8f0"],
        borderWidth: 2,
        borderColor: "#ffffff",
        hoverOffset: 6,
        radius: "85%"
      }]
    },
    options: baseOptions(false, true)
  });
}

// =========================
// SALVAR
// =========================
function salvarPatrimonio() {

  const empresas = [];

  document.querySelectorAll(".empresa_item").forEach(item => {
    empresas.push({
      nome: item.querySelector(".empresa_nome_display").innerText,
      cnpj: item.querySelector(".empresa_cnpj").value,
      valor: item.querySelector(".empresa_valor").value,
      pct: item.querySelector(".empresa_pct").value
    });
  });

  const dados = {
    rf: document.getElementById("rf").value,
    rv: document.getElementById("rv").value,
    inter: document.getElementById("inter").value,
    prev: document.getElementById("prev").value,
    offshore: document.getElementById("offshore").value,
    offshore_modo: offshoreEmUSD ? "usd" : "brl",

    apt: document.getElementById("apt").value,
    casa: document.getElementById("casa").value,
    terr: document.getElementById("terr").value,
    galp: document.getElementById("galp").value,
    bens_particulares: document.getElementById("bens_particulares") ? document.getElementById("bens_particulares").value : "",

    bens: document.getElementById("bens").value,

    temEmpresas: document.getElementById("tem_empresas").value,
    qtdEmpresas: document.getElementById("qtd_empresas").value,
    empresas: empresas
  };

  sessionStorage.setItem("patrimonio_dados", JSON.stringify(dados));

  calcular();
  document.querySelectorAll("input, select").forEach(checkFilled);

  // Auto-save: persiste progressivamente no Supabase com debounce
  if (typeof dbAutoSalvar === "function") dbAutoSalvar();
};

// =========================
// INIT
// =========================

// Converte qualquer valor salvo (número inteiro ou string formatada em PT-BR) para o formato
// que os inputs de patrimônio esperam: "1.000.000,00"
function formatarValorRestaurado(val) {
  if (val === null || val === undefined || val === "") return "";
  // Já é uma string formatada no padrão PT-BR (ex: "1.000.000,00") → retorna direto
  if (typeof val === "string" && val.includes(",")) return val;
  // É um número (inteiro ou float) vindo do AppState
  const num = parseFloat(String(val).replace(/\./g, "").replace(",", "."));
  if (isNaN(num) || num === 0) return "";
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

window.onload = function () {

  // ── DIAGNÓSTICO: Mostra o que está no sessionStorage após restaurarSessao ──
  const rawPatrimonio = sessionStorage.getItem("patrimonio_dados");
  const rawFamilia = sessionStorage.getItem("familia");
  const rawTotal = sessionStorage.getItem("total_patrimonio");
  const rawReportId = sessionStorage.getItem("current_report_id");

  console.log("=== [patrimonio.js] DIAGNÓSTICO DE SESSÃO ===");
  console.log("[patrimonio.js] current_report_id:", rawReportId);
  console.log("[patrimonio.js] total_patrimonio:", rawTotal);
  console.log("[patrimonio.js] patrimonio_dados (raw):", rawPatrimonio);
  console.log("[patrimonio.js] familia (raw):", rawFamilia);
  console.log("[patrimonio.js] Todas as chaves no sessionStorage:", Object.keys(sessionStorage));

  const dados = rawPatrimonio ? JSON.parse(rawPatrimonio) : null;
  console.log("[patrimonio.js] patrimonio_dados (parsed):", dados);

  if (!dados) {
    console.warn("[patrimonio.js] ⚠️ patrimonio_dados não encontrado no sessionStorage — campos ficarão em branco.");
    return;
  }

  // IDs dos campos monetários simples (textuais)
  const camposMonetarios = ["rf", "rv", "inter", "prev", "offshore", "apt", "casa", "terr", "galp", "bens_particulares", "bens"];

  Object.keys(dados).forEach(id => {
    if (id === "offshore_modo") return; // tratado separadamente abaixo
    if (id === "temEmpresas" || id === "qtdEmpresas" || id === "empresas") return; // tratado abaixo
    const el = document.getElementById(id);
    if (el) {
      if (camposMonetarios.includes(id)) {
        el.value = formatarValorRestaurado(dados[id]);
      } else {
        el.value = dados[id] || "";
      }
    }
  });

  // Restaura o modo de moeda do offshore (BRL ou USD)
  if (dados.offshore_modo === "usd" && !offshoreEmUSD) {
    // Ativa o modo USD sem buscar de novo (PTAX pode já estar em cache)
    alternarMoedaOffshore().then(() => {
      // Depois de ativar o modo, restaura o valor salvo
      const offshoreInput = document.getElementById("offshore");
      if (offshoreInput && dados.offshore) {
        offshoreInput.value = formatarValorRestaurado(dados.offshore);
        atualizarBadgeOffshore();
      }
    });
  }

  if (dados.temEmpresas === "sim") {
    document.getElementById("tem_empresas").value = "sim";
    document.getElementById("area_empresas").style.display = "block";
    if (dados.qtdEmpresas) {
      document.getElementById("qtd_empresas").value = dados.qtdEmpresas;
    } else if (dados.empresas && dados.empresas.length > 0) {
      document.getElementById("qtd_empresas").value = dados.empresas.length;
    }
  }

  let container = document.getElementById("inputs_empresas");
  container.innerHTML = "";

  if (dados.empresas && dados.empresas.length > 0) {
    dados.empresas.forEach((emp, i) => {
      adicionarEmpresa(emp, i === 0);
    });
  } else if (dados.temEmpresas === "sim") {
    adicionarEmpresa(null, true);
  }

  window.atualizarResumoEmpresasBadge();
  calcular();

  // ATIVA AUTO-SAVE: Sempre que mudar um campo, salva automaticamente
  document.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("input", salvarPatrimonio);
  });
}

// =========================
// MODAL COLAR DADOS
// =========================
function abrirModalColar() {
  document.getElementById("modal_colar").style.display = "flex";
  document.getElementById("texto_colar").value = "";
  document.getElementById("texto_colar").focus();
}

function fecharModalColar() {
  document.getElementById("modal_colar").style.display = "none";
}

function processarColagem() {
  const texto = document.getElementById("texto_colar").value;
  if (!texto) {
    alert("Por favor, cole os dados do Excel primeiro.");
    return;
  }

  const lines = texto.split("\n");
  let dadosImportados = 0;

  lines.forEach(line => {
    // Excel separa colunas por TAB (\t)
    const parts = line.split("\t");
    if (parts.length >= 2) {
      const id = parts[0].trim().toLowerCase();
      const valorRaw = parts[1].trim();

      const input = document.getElementById(id);
      if (input) {
        const valorLimpo = valorRaw.replace(/[R$\s.]/g, "").replace(",", ".");
        const num = parseFloat(valorLimpo);

        if (!isNaN(num)) {
          input.value = num.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
          input.classList.add("filled");
          dadosImportados++;
        }
      }
    }
  });

  if (dadosImportados > 0) {
    alert(`${dadosImportados} campos preenchidos via Excel!`);
    calcular();
    fecharModalColar();
  } else {
    alert("Não foi possível identificar dados compatíveis. Verifique se copiou as colunas ID e Valor.");
  }
}
function processarCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const lines = text.split("\n");

    let dadosImportados = 0;

    lines.forEach(line => {
      // Tenta separar por ponto-e-vírgula ou vírgula
      const parts = line.split(/[;,]/);
      if (parts.length >= 2) {
        const id = parts[0].trim().toLowerCase();
        const valorRaw = parts[1].trim();

        // Se o ID existir na página, preenchemos
        const input = document.getElementById(id);
        if (input) {
          // Limpa o valor de símbolos de moeda se houver e formata
          const valorLimpo = valorRaw.replace(/[R$\s.]/g, "").replace(",", ".");
          const num = parseFloat(valorLimpo);

          if (!isNaN(num)) {
            // Formata para o padrão brasileiro para o input
            input.value = num.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
            input.classList.add("filled");
            dadosImportados++;
          }
        }
      }
    });

    if (dadosImportados > 0) {
      alert(`${dadosImportados} campos preenchidos com sucesso!`);
      calcular(); // Dispara o cálculo automático
    } else {
      alert("Nenhum dado compatível encontrado no arquivo. Use o formato: id;valor");
    }
  };

  reader.readAsText(file);
  // Limpa o input para permitir importar o mesmo arquivo se necessário
  event.target.value = "";
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