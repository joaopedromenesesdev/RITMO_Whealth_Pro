// =============================================================================
// carteira.js — Lógica de Interface da Carteira de Investimentos
// Whealth Planner Pro — Ritmo Wealth Pro
// =============================================================================

let graficoComposicao = null;
let ativoEditandoId = null; // null = novo, string = editando

// ─── CORES DAS CLASSES ──────────────────────────────────────────────────────

const CORES_CLASSES = {
  cdi: '#2563EB',
  ipca: '#10B981',
  prefixado: '#F59E0B',
  multimercado: '#8B5CF6',
  renda_variavel: '#EF4444',
  fii: '#06B6D4',
  coe: '#EC4899',
  previdencia: '#14B8A6',
  internacional: '#6366F1',
  caixa: '#A1A1AA'
};

// ─── INICIALIZAÇÃO ──────────────────────────────────────────────────────────

window.onload = function () {
  setupMascarasCarteira();
  renderizarTudo();
};

// ─── RENDER PRINCIPAL ───────────────────────────────────────────────────────

function renderizarTudo() {
  const ativos = window.AppState ? window.AppState.getCarteiraAtivos() : [];

  if (ativos.length === 0) {
    mostrarEmptyState();
    return;
  }

  // Consolida dados usando o engine
  const consolidacao = window.CarteiraEngine.consolidarPorInstituicao(ativos);
  const composicao = window.CarteiraEngine.composicaoPorClasse(ativos);
  const vencimentos = window.CarteiraEngine.cronogramaVencimentos(ativos);
  const movimentacoes = window.AppState ? window.AppState.getCarteiraMovimentacoes() : {};
  const premissas = getPremissasUI();
  const simulacao = window.CarteiraEngine.simularCarteira(ativos, premissas);

  // Renderiza componentes
  renderizarInstituicoes(consolidacao);
  renderizarComposicao(composicao);
  renderizarVencimentos(vencimentos);
  renderizarMovimentacoes(movimentacoes);
  renderizarSimulacao(simulacao);
  renderizarListaAtivos(ativos);
}

// ─── PREMISSAS DA UI ────────────────────────────────────────────────────────

function getPremissasUI() {
  return {
    selic: parsePercentual("sim_selic"),
    ipca: parsePercentual("sim_ipca")
  };
}

function parsePercentual(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return Number(el.value.replace(/[^\d,]/g, "").replace(",", ".")) / 100 || 0;
}

function parseValorBR(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return Number(el.value.replace(/[R$\s.]/g, "").replace(",", ".")) || 0;
}

// ─── MÁSCARAS ───────────────────────────────────────────────────────────────

function setupMascarasCarteira() {
  // Moeda nos modais
  ["ma_valor_aplicado", "ma_valor_atual"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function (e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value) {
        value = (Number(value) / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2, maximumFractionDigits: 2
        });
        e.target.value = value;
      }
    });
  });

  // Percentual nos modais e premissas
  ["ma_taxa", "ma_rent_mes", "ma_rent_ano", "ma_rent_12m", "ma_rent_24m", "sim_selic", "sim_ipca"].forEach(id => {
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

// ─── EMPTY STATE ────────────────────────────────────────────────────────────

function mostrarEmptyState() {
  const container = document.getElementById("ativos_lista_container");
  if (!container) return;

  // Esconde seções que dependem de dados
  ["instituicoes_container", "grid_duo_container", "simulacao_container", "movimentacoes_container"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  container.innerHTML = `
    <div class="carteira-empty">
      <i data-lucide="briefcase"></i>
      <h3>Nenhum investimento cadastrado</h3>
      <p>Clique em "Adicionar Ativo" para começar a montar a carteira do cliente. 
      Cada investimento será classificado automaticamente por indexador, instituição e prazo de vencimento.</p>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

// ─── RENDERIZAR INSTITUIÇÕES ────────────────────────────────────────────────

function renderizarInstituicoes(consolidacao) {
  const container = document.getElementById("instituicoes_container");
  const tbody = document.getElementById("instituicoes_tbody");
  if (!container || !tbody) return;

  container.style.display = "block";
  tbody.innerHTML = "";

  const fmt = v => "R$ " + Math.round(v).toLocaleString("pt-BR");
  const fmtPct = v => (v * 100).toFixed(2).replace(".", ",") + "%";

  consolidacao.instituicoes.forEach(inst => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${inst.instituicao}</td>
      <td>${fmt(inst.saldoAtual)}</td>
      <td>${fmtPct(inst.rentMes)}</td>
      <td>${fmtPct(inst.rentAno)}</td>
      <td>${fmtPct(inst.rent12m)}</td>
      <td>${fmtPct(inst.rent24m)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Linha total
  const total = consolidacao.total;
  const trTotal = document.createElement("tr");
  trTotal.className = "row-total";
  trTotal.innerHTML = `
    <td>Total Consolidado</td>
    <td>${fmt(total.saldoAtual)}</td>
    <td>${fmtPct(total.rentMes)}</td>
    <td>${fmtPct(total.rentAno)}</td>
    <td>${fmtPct(total.rent12m)}</td>
    <td>${fmtPct(total.rent24m)}</td>
  `;
  tbody.appendChild(trTotal);
}

// ─── RENDERIZAR COMPOSIÇÃO ──────────────────────────────────────────────────

function renderizarComposicao(composicao) {
  const container = document.getElementById("grid_duo_container");
  if (container) container.style.display = "grid";

  const lista = document.getElementById("composicao_lista");
  const fmt = v => "R$ " + Math.round(v).toLocaleString("pt-BR");

  if (lista) {
    lista.innerHTML = "";
    composicao.composicao.forEach(item => {
      const cor = CORES_CLASSES[item.classe] || '#A1A1AA';
      lista.innerHTML += `
        <div class="composicao-item">
          <span class="composicao-dot" style="background: ${cor};"></span>
          <div class="composicao-info">
            <span class="comp-label">${item.label}</span>
            <div class="comp-valores">
              <div class="comp-valor">${fmt(item.valor)}</div>
              <div class="comp-pct">${item.percentual.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      `;
    });
  }

  // Gráfico Donut
  renderizarGraficoComposicao(composicao);
}

function renderizarGraficoComposicao(composicao) {
  const ctx = document.getElementById("graficoComposicao");
  if (!ctx) return;

  if (graficoComposicao) graficoComposicao.destroy();

  const labels = composicao.composicao.map(c => c.label);
  const dados = composicao.composicao.map(c => c.valor);
  const cores = composicao.composicao.map(c => CORES_CLASSES[c.classe] || '#A1A1AA');

  graficoComposicao = new Chart(ctx.getContext("2d"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: dados,
        backgroundColor: cores,
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          titleColor: "#000",
          bodyColor: "#000",
          borderColor: "#e1e8f0",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function (context) {
              const val = context.raw;
              const pct = composicao.total > 0 ? ((val / composicao.total) * 100).toFixed(1) : 0;
              return `R$ ${Math.round(val).toLocaleString("pt-BR")} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ─── RENDERIZAR VENCIMENTOS ─────────────────────────────────────────────────

function renderizarVencimentos(vencimentos) {
  const container = document.getElementById("vencimentos_bars");
  if (!container) return;

  const fmt = v => "R$ " + Math.round(v).toLocaleString("pt-BR");
  const todos = [...vencimentos.porFaixa];
  if (vencimentos.semVencimento.valor > 0) {
    todos.push(vencimentos.semVencimento);
  }

  const maxValor = Math.max(...todos.map(f => f.valor), 1);

  container.innerHTML = "";
  todos.forEach(faixa => {
    const pct = Math.max(5, (faixa.valor / maxValor) * 100);
    container.innerHTML += `
      <div class="venc-bar">
        <span class="venc-label">${faixa.label}</span>
        <div class="venc-track">
          <div class="venc-fill" style="width: ${pct}%;">
            <span>${((faixa.valor / maxValor) * 100).toFixed(0)}%</span>
          </div>
        </div>
        <span class="venc-valor">${fmt(faixa.valor)}</span>
      </div>
    `;
  });

  // Vencimentos por ano
  if (vencimentos.porAno.length > 0) {
    container.innerHTML += `<hr style="border:0;border-top:1px solid rgba(0,0,0,0.04);margin:16px 0;">`;
    container.innerHTML += `<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);font-weight:700;margin-bottom:8px;">Por Ano-Calendário</div>`;

    const maxAno = Math.max(...vencimentos.porAno.map(a => a.valor), 1);
    vencimentos.porAno.forEach(ano => {
      const pct = Math.max(5, (ano.valor / maxAno) * 100);
      container.innerHTML += `
        <div class="venc-bar">
          <span class="venc-label">${ano.ano}</span>
          <div class="venc-track">
            <div class="venc-fill" style="width: ${pct}%;">
              <span>${fmt(ano.valor)}</span>
            </div>
          </div>
          <span class="venc-valor">${fmt(ano.valor)}</span>
        </div>
      `;
    });
  }
}

// ─── RENDERIZAR MOVIMENTAÇÕES ───────────────────────────────────────────────

function renderizarMovimentacoes(mov) {
  const container = document.getElementById("movimentacoes_container");
  const grid = document.getElementById("mov_grid");
  if (!container || !grid) return;

  const temDados = mov.saldoInicial || mov.aportes || mov.resgates || mov.rendimentos;
  if (!temDados) { container.style.display = "none"; return; }

  container.style.display = "block";
  const fmt = v => "R$ " + Math.round(Math.abs(v)).toLocaleString("pt-BR");
  const resultado = window.CarteiraEngine.calcularMovimentacoes(mov);

  grid.innerHTML = `
    <div class="mov-item">
      <div class="mov-label">Saldo Inicial</div>
      <div class="mov-valor">${fmt(resultado.saldoInicial)}</div>
    </div>
    <div class="mov-item positivo">
      <div class="mov-label">Aportes</div>
      <div class="mov-valor">+ ${fmt(resultado.aportes)}</div>
    </div>
    <div class="mov-item negativo">
      <div class="mov-label">Resgates</div>
      <div class="mov-valor">– ${fmt(resultado.resgates)}</div>
    </div>
    <div class="mov-item positivo">
      <div class="mov-label">Rendimentos</div>
      <div class="mov-valor">+ ${fmt(resultado.rendimentos)}</div>
    </div>
    <div class="mov-item">
      <div class="mov-label">Saldo Final</div>
      <div class="mov-valor">${fmt(resultado.saldoFinal)}</div>
    </div>
  `;
}

// ─── RENDERIZAR SIMULAÇÃO ───────────────────────────────────────────────────

function renderizarSimulacao(simulacao) {
  const container = document.getElementById("simulacao_container");
  const tbody = document.getElementById("simulacao_tbody");
  if (!container || !tbody) return;

  container.style.display = "block";
  tbody.innerHTML = "";

  const fmt = v => "R$ " + Math.round(v).toLocaleString("pt-BR");

  simulacao.ativos.forEach(ativo => {
    const tr = document.createElement("tr");
    const vencStr = ativo.dataVencimento ? new Date(ativo.dataVencimento).toLocaleDateString("pt-BR") : '—';
    const indexStr = ativo.indexador || (ativo.classe ? window.CarteiraEngine.LABELS_CLASSE[ativo.classe] : '—');

    tr.innerHTML = `
      <td>${ativo.nome || 'Sem nome'}</td>
      <td>${fmt(ativo.valorAtual)}</td>
      <td>${vencStr}</td>
      <td>${indexStr} ${ativo.taxa ? '(' + (ativo.taxa * 100).toFixed(2).replace(".", ",") + '%)' : ''}</td>
      <td style="font-weight:800;">${fmt(ativo.valorProjetado)}</td>
      <td>${fmt(ativo.valorProjetadoReal)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Linha total
  const trTotal = document.createElement("tr");
  trTotal.className = "row-total";
  trTotal.innerHTML = `
    <td>Total da Carteira</td>
    <td>${fmt(simulacao.totalAtual)}</td>
    <td>—</td>
    <td>—</td>
    <td style="font-weight:800;">${fmt(simulacao.totalProjetado)}</td>
    <td>${fmt(simulacao.totalProjetadoReal)}</td>
  `;
  tbody.appendChild(trTotal);
}

// ─── RENDERIZAR LISTA DE ATIVOS ─────────────────────────────────────────────

function renderizarListaAtivos(ativos) {
  const container = document.getElementById("ativos_lista_container");
  if (!container) return;

  if (ativos.length === 0) {
    mostrarEmptyState();
    return;
  }

  const fmt = v => "R$ " + Math.round(v).toLocaleString("pt-BR");
  let html = "";

  ativos.forEach(ativo => {
    const classeLabel = window.CarteiraEngine.LABELS_CLASSE[ativo.classe] || ativo.classe;
    html += `
      <div class="ativo-row">
        <div class="ativo-nome-col">
          <span class="ativo-nome">${ativo.nome || 'Sem nome'}</span>
          <span class="ativo-inst">${ativo.instituicao || '—'} · ${ativo.tipo || '—'}</span>
        </div>
        <div class="ativo-valor">${fmt(ativo.valorAtual)}</div>
        <div class="ativo-indexador">${ativo.indexador || '—'}</div>
        <div class="ativo-valor">${ativo.dataVencimento ? new Date(ativo.dataVencimento).toLocaleDateString("pt-BR") : '—'}</div>
        <span class="ativo-classe">${classeLabel}</span>
        <div class="ativo-acoes">
          <button onclick="editarAtivo('${ativo.id}')" title="Editar"><i data-lucide="pencil"></i></button>
          <button onclick="excluirAtivo('${ativo.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

// ─── MODAL DE ATIVO ─────────────────────────────────────────────────────────

function abrirModalAtivo() {
  ativoEditandoId = null;
  document.getElementById("modal_ativo_titulo").innerText = "Adicionar Investimento";
  limparCamposModal();
  document.getElementById("modal_ativo_overlay").style.display = "flex";
}

function fecharModalAtivo() {
  document.getElementById("modal_ativo_overlay").style.display = "none";
  ativoEditandoId = null;
}

function limparCamposModal() {
  ["ma_instituicao", "ma_nome", "ma_tipo", "ma_classe", "ma_emissor", "ma_indexador",
   "ma_valor_aplicado", "ma_valor_atual", "ma_taxa", "ma_liquidez",
   "ma_data_aplicacao", "ma_data_vencimento", "ma_tributacao",
   "ma_rent_mes", "ma_rent_ano", "ma_rent_12m", "ma_rent_24m"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    }
  });
  document.getElementById("ma_fgc").checked = false;
}

function editarAtivo(id) {
  const ativos = window.AppState.getCarteiraAtivos();
  const ativo = ativos.find(a => a.id === id);
  if (!ativo) return;

  ativoEditandoId = id;
  document.getElementById("modal_ativo_titulo").innerText = "Editar Investimento";

  // Preenche campos
  document.getElementById("ma_instituicao").value = ativo.instituicao || "";
  document.getElementById("ma_nome").value = ativo.nome || "";
  document.getElementById("ma_tipo").value = ativo.tipo || "";
  document.getElementById("ma_classe").value = ativo.classe || "cdi";
  document.getElementById("ma_emissor").value = ativo.emissor || "";
  document.getElementById("ma_indexador").value = ativo.indexador || "";
  document.getElementById("ma_valor_aplicado").value = ativo.valorAplicado ? ativo.valorAplicado.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
  document.getElementById("ma_valor_atual").value = ativo.valorAtual ? ativo.valorAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
  document.getElementById("ma_taxa").value = ativo.taxa ? (ativo.taxa * 100).toFixed(2).replace(".", ",") : "";
  document.getElementById("ma_liquidez").value = ativo.liquidez || "No vencimento";
  document.getElementById("ma_data_aplicacao").value = ativo.dataAplicacao || "";
  document.getElementById("ma_data_vencimento").value = ativo.dataVencimento || "";
  document.getElementById("ma_tributacao").value = ativo.tributacao || "";
  document.getElementById("ma_fgc").checked = ativo.fgc || false;

  if (ativo.rentMes) document.getElementById("ma_rent_mes").value = (ativo.rentMes * 100).toFixed(2).replace(".", ",");
  if (ativo.rentAno) document.getElementById("ma_rent_ano").value = (ativo.rentAno * 100).toFixed(2).replace(".", ",");
  if (ativo.rent12m) document.getElementById("ma_rent_12m").value = (ativo.rent12m * 100).toFixed(2).replace(".", ",");
  if (ativo.rent24m) document.getElementById("ma_rent_24m").value = (ativo.rent24m * 100).toFixed(2).replace(".", ",");

  document.getElementById("modal_ativo_overlay").style.display = "flex";
}

function salvarAtivo() {
  const dados = {
    instituicao: document.getElementById("ma_instituicao").value,
    nome: document.getElementById("ma_nome").value,
    tipo: document.getElementById("ma_tipo").value,
    classe: document.getElementById("ma_classe").value,
    emissor: document.getElementById("ma_emissor").value,
    indexador: document.getElementById("ma_indexador").value,
    valorAplicado: parseValorBR("ma_valor_aplicado"),
    valorAtual: parseValorBR("ma_valor_atual"),
    taxa: parsePercentual("ma_taxa"),
    liquidez: document.getElementById("ma_liquidez").value,
    dataAplicacao: document.getElementById("ma_data_aplicacao").value,
    dataVencimento: document.getElementById("ma_data_vencimento").value,
    tributacao: document.getElementById("ma_tributacao").value,
    fgc: document.getElementById("ma_fgc").checked,
    rentMes: parsePercentual("ma_rent_mes"),
    rentAno: parsePercentual("ma_rent_ano"),
    rent12m: parsePercentual("ma_rent_12m"),
    rent24m: parsePercentual("ma_rent_24m")
  };

  // Validação mínima
  if (!dados.nome && !dados.instituicao) {
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast("Informe ao menos o nome ou a instituição do ativo.", "warning");
    }
    return;
  }

  let ativos = window.AppState.getCarteiraAtivos();

  if (ativoEditandoId) {
    // Edita existente
    ativos = ativos.map(a => {
      if (a.id === ativoEditandoId) {
        return { ...a, ...dados };
      }
      return a;
    });
  } else {
    // Cria novo
    const novo = window.CarteiraEngine.criarAtivo(dados);
    ativos.push(novo);
  }

  window.AppState.setCarteiraAtivos(ativos);
  fecharModalAtivo();
  renderizarTudo();

  if (typeof dbAutoSalvar === "function") dbAutoSalvar();

  if (typeof window.mostrarToast === "function") {
    window.mostrarToast(ativoEditandoId ? "Investimento atualizado!" : "Investimento adicionado!", "success");
  }
}

function excluirAtivo(id) {
  if (typeof window.confirmarAcaoCustom === "function") {
    window.confirmarAcaoCustom({
      titulo: "Excluir Investimento",
      mensagem: "Deseja realmente excluir este investimento da carteira?",
      textoConfirmar: "Excluir",
      tipo: "danger",
      onConfirm: () => {
        let ativos = window.AppState.getCarteiraAtivos();
        ativos = ativos.filter(a => a.id !== id);
        window.AppState.setCarteiraAtivos(ativos);
        renderizarTudo();
        if (typeof dbAutoSalvar === "function") dbAutoSalvar();
      }
    });
  } else {
    let ativos = window.AppState.getCarteiraAtivos();
    ativos = ativos.filter(a => a.id !== id);
    window.AppState.setCarteiraAtivos(ativos);
    renderizarTudo();
    if (typeof dbAutoSalvar === "function") dbAutoSalvar();
  }
}

// ─── RECALCULAR COM NOVAS PREMISSAS ─────────────────────────────────────────

function recalcularCarteira() {
  renderizarTudo();
  if (typeof window.mostrarToast === "function") {
    window.mostrarToast("Carteira recalculada com as novas premissas!", "success");
  }
}
