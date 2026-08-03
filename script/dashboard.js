// ── CONTROLE DO DASHBOARD DE RELATÓRIOS ──

// Cache em memória dos relatórios para filtragem rápida
let relatoriosCached = [];

document.addEventListener("DOMContentLoaded", () => {
  // Event listeners para filtros
  document.getElementById("filtro_busca")?.addEventListener("input", filtrarERenderizar);
  document.getElementById("filtro_patrimonio")?.addEventListener("change", filtrarERenderizar);
  document.getElementById("filtro_ordenacao")?.addEventListener("change", filtrarERenderizar);

  // Criar ícones do Lucide
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // ── CORREÇÃO DA RACE CONDITION + FALLBACK FILE:// ──
  // O Supabase restaura a sessão de forma assíncrona após a página carregar.
  // Em origens file:// o evento INITIAL_SESSION pode não disparar.
  // Usamos um timeout como fallback para garantir que o dashboard sempre carrega.
  const client = window.supabaseClient;
  if (client) {
    let carregado = false;

    // Fallback: se após 4s a sessão não foi restaurada, tenta carregar mesmo assim
    const fallbackTimer = setTimeout(async () => {
      if (!carregado) {
        carregado = true;
        console.warn("[Dashboard] Timeout aguardando sessão Supabase. Tentando obter relatórios do banco.");
        // Tenta obter sessão uma última vez
        const { data: { session } } = await client.auth.getSession().catch(() => ({ data: { session: null } }));
        if (!session) {
          window.location.href = "login.html";
        } else {
          carregarDashboard();
        }
      }
    }, 4000);

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        if (carregado) return;
        carregado = true;
        clearTimeout(fallbackTimer);
        subscription.unsubscribe();
        if (session) {
          carregarDashboard();
        } else {
          window.location.href = "login.html";
        }
      }
    });
  } else {
    // Sem Supabase configurado: tenta carregar relatórios do banco
    carregarDashboard();
  }
});

// Mantém compatibilidade com funções antigas de restauração
function obterRelatorios() {
  return relatoriosCached;
}

// Carregar todas as informações do Dashboard buscando do banco
async function carregarDashboard() {
  // Exibe indicador visual de carregamento se desejado
  const container = document.getElementById("reports_container");
  if (container) {
    container.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-muted);"><p>Carregando relatórios...</p></div>`;
  }

  relatoriosCached = await dbObterRelatorios();
  calcularEExibirMetricas(relatoriosCached);
  renderizarRelatorios(relatoriosCached);
}

// Calcular as métricas acumuladas (KPIs)
function calcularEExibirMetricas(relatorios) {
  const totalRelatorios = relatorios.length;
  let patrimonioTotalMapeado = 0;
  let prejuizoAcumulado = 0;

  relatorios.forEach(rep => {
    patrimonioTotalMapeado += Number(rep.totalPatrimonio) || 0;
    prejuizoAcumulado += Number(rep.prejuizoTributario) || 0;
  });

  const prejuizoMedio = totalRelatorios > 0 ? (prejuizoAcumulado / totalRelatorios) : 0;

  // Atualizar DOM
  const elQtd = document.getElementById("metric_qtd_relatorios");
  const elPat = document.getElementById("metric_patrimonio_total");
  const elPrej = document.getElementById("metric_prejuizo_medio");

  if (elQtd) elQtd.innerText = totalRelatorios;
  if (elPat) elPat.innerText = "R$ " + patrimonioTotalMapeado.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elPrej) elPrej.innerText = "R$ " + prejuizoMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// Filtrar e renderizar dinamicamente em tempo real
function filtrarERenderizar() {
  const relatorios = obterRelatorios();
  const busca = document.getElementById("filtro_busca")?.value.toLowerCase().trim() || "";
  const faixaPatrimonio = document.getElementById("filtro_patrimonio")?.value || "todos";
  const ordenacao = document.getElementById("filtro_ordenacao")?.value || "recentes";

  let filtrados = relatorios.filter(rep => {
    // Busca por nome do cliente ou assessor
    const nomeCliente = (rep.nomeCliente || "").toLowerCase();
    const nomeAssessor = (rep.nomeAssessor || "").toLowerCase();
    const matchBusca = nomeCliente.includes(busca) || nomeAssessor.includes(busca);

    // Filtro por faixa de patrimônio
    let matchFaixa = true;
    const pat = Number(rep.totalPatrimonio) || 0;
    if (faixaPatrimonio === "ate_5m") {
      matchFaixa = pat <= 5000000;
    } else if (faixaPatrimonio === "5m_20m") {
      matchFaixa = pat > 5000000 && pat <= 20000000;
    } else if (faixaPatrimonio === "mais_20m") {
      matchFaixa = pat > 20000000;
    }

    return matchBusca && matchFaixa;
  });

  // Ordenação
  filtrados.sort((a, b) => {
    if (ordenacao === "recentes") {
      return new Date(b.dataCriacao || b.dataReuniao) - new Date(a.dataCriacao || a.dataReuniao);
    } else if (ordenacao === "antigos") {
      return new Date(a.dataCriacao || a.dataReuniao) - new Date(b.dataCriacao || b.dataReuniao);
    } else if (ordenacao === "patrimonio_maior") {
      return (Number(b.totalPatrimonio) || 0) - (Number(a.totalPatrimonio) || 0);
    } else if (ordenacao === "patrimonio_menor") {
      return (Number(a.totalPatrimonio) || 0) - (Number(b.totalPatrimonio) || 0);
    }
    return 0;
  });

  renderizarRelatorios(filtrados);
}

// Renderizar a lista de cards ou Empty State
function renderizarRelatorios(relatorios) {
  const container = document.getElementById("reports_container");
  if (!container) return;

  if (relatorios.length === 0) {
    container.style.display = "block";
    container.innerHTML = `
      <div class="empty-state reveal active">
        <div class="empty-state-icon">
          <i data-lucide="folder-open"></i>
        </div>
        <h3>Nenhum relatório encontrado</h3>
        <p>Inicie uma nova simulação patrimonial para preencher o seu histórico de relatórios gerados.</p>
        <a href="nova_simulacao.html" class="btn-new-report" style="margin: 0 auto; display: inline-flex;">
          <i data-lucide="plus"></i>
          Nova Simulação
        </a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.style.display = "grid";
  let html = "";

  relatorios.forEach(rep => {
    const totalPat = Number(rep.totalPatrimonio) || 0;
    const totalPrej = Number(rep.prejuizoTributario) || 0;

    // Risco de liquidez: Se prejuízo tributável ultrapassar liquidez (RF + Prev + Fundos + Offshore)
    // Usamos os dados internos salvos da simulação para calcular
    const dados = rep.dadosSessao?.patrimonio_dados || {};
    const rf = parseValor(dados.rf);
    const prev = parseValor(dados.prev);
    const inter = parseValor(dados.inter);
    const offshore = parseValor(dados.offshore);
    const liquidezTotal = rf + prev + inter + offshore;
    const isRiscoLiquidez = totalPrej > liquidezTotal && totalPat > 0;

    const formattedPat = "R$ " + totalPat.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    const formattedPrej = "R$ " + totalPrej.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    const formattedDate = rep.dataReuniao || new Date(rep.dataCriacao).toLocaleDateString("pt-BR");

    html += `
      <div class="report-card reveal active" id="card_${rep.id}">
        <div class="report-card-header">
          <div class="report-client-info">
            <h3 class="report-client-name">${escapeHTML(rep.nomeCliente)}</h3>
            <span class="report-advisor-name">Assessor: ${escapeHTML(rep.nomeAssessor)}</span>
          </div>
          <span class="report-date-pill">${formattedDate}</span>
        </div>
        <div class="report-card-body">
          <div class="report-data-item">
            <label>Patrimônio Total</label>
            <span>${formattedPat}</span>
          </div>
          <div class="report-data-item accent">
            <label>Prejuízo Sucessório</label>
            <span>${formattedPrej}</span>
          </div>
          
          <div class="report-badge-container">
            ${isRiscoLiquidez ?
        `<div class="liquidity-badge danger">
                <i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Risco de Liquidez Alto
              </div>` :
        `<div class="liquidity-badge safe">
                <i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Liquidez Adequada
              </div>`
      }
          </div>
        </div>
        <div class="report-card-footer">
          <button class="btn-action danger-icon" onclick="excluirRelatorio('${rep.id}')" title="Excluir Simulação">
            <i data-lucide="trash-2"></i>
          </button>
          <button class="btn-action secondary" onclick="editarSimulacao('${rep.id}')">
            <i data-lucide="edit-3"></i> Editar
          </button>
          <button class="btn-action primary" onclick="visualizarPDF('${rep.id}')">
            <i data-lucide="file-text"></i> PDF
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

// Auxiliar para parser
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

// XSS Prevention
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Normaliza o dadosSessao (qualquer formato) e escreve as chaves corretas no sessionStorage
function normalizarSessao(dadosSessao, totalPatrimonioFallback) {
  if (!dadosSessao) {
    console.warn("[normalizarSessao] dadosSessao é null/undefined.");
    return;
  }

  // Segurança: se vier como string (double-encoding), tenta parsear
  if (typeof dadosSessao === "string") {
    try {
      dadosSessao = JSON.parse(dadosSessao);
      console.log("[normalizarSessao] dadosSessao era string — parseado com sucesso.");
    } catch (e) {
      console.error("[normalizarSessao] Falha ao parsear dadosSessao como string:", e);
      return;
    }
  }

  console.log("[normalizarSessao] Estrutura recebida:", JSON.stringify(dadosSessao, null, 2));

  // ── FORMATO A: Snapshot via AppState.exportSnapshot() (estrutura aninhada) ──
  // Detectado pela presença de dadosSessao.patrimonio.dados
  const isFormatoA = dadosSessao.patrimonio && typeof dadosSessao.patrimonio === "object" && dadosSessao.patrimonio.dados;

  if (isFormatoA) {
    console.log("[normalizarSessao] ✅ Detectado Formato A (AppState snapshot). Traduzindo chaves...");

    // Patrimônio
    const dadosPatrimonio = dadosSessao.patrimonio.dados;
    console.log("[normalizarSessao] patrimonio.dados:", dadosPatrimonio);
    sessionStorage.setItem("patrimonio_dados", JSON.stringify(dadosPatrimonio));

    const totalPat = dadosSessao.patrimonio.total ?? totalPatrimonioFallback ?? 0;
    sessionStorage.setItem("total_patrimonio", totalPat);

    // Família
    if (dadosSessao.familia) {
      sessionStorage.setItem("familia", JSON.stringify(dadosSessao.familia));
    }

    // Evolução
    if (dadosSessao.evolucao) {
      if (dadosSessao.evolucao.inputs) {
        sessionStorage.setItem("evolucao_inputs", JSON.stringify(dadosSessao.evolucao.inputs));
      }
      if (dadosSessao.evolucao.dados) {
        sessionStorage.setItem("evolucao_dados", JSON.stringify(dadosSessao.evolucao.dados));
      }
    }

    // Tributário
    if (dadosSessao.tributario) {
      if (dadosSessao.tributario.inputs) {
        sessionStorage.setItem("tributario_inputs", JSON.stringify(dadosSessao.tributario.inputs));
      }
      if (dadosSessao.tributario.prejuizoFinal) {
        sessionStorage.setItem("prejuizo_final", JSON.stringify(dadosSessao.tributario.prejuizoFinal));
      }
    }

    // Meta
    if (dadosSessao.meta) {
      if (dadosSessao.meta.nomeAssessor) sessionStorage.setItem("nome_assessor", dadosSessao.meta.nomeAssessor);
      if (dadosSessao.meta.dataReuniao) sessionStorage.setItem("data_reuniao", dadosSessao.meta.dataReuniao);
    }

  } else {
    // ── FORMATO B: Chaves soltas na raiz (legado) ──
    console.log("[normalizarSessao] ✅ Detectado Formato B (flat keys). Gravando diretamente...");
    console.log("[normalizarSessao] Chaves encontradas:", Object.keys(dadosSessao));

    Object.keys(dadosSessao).forEach(key => {
      if (key === "current_report_id") return; // controlado separadamente
      const val = dadosSessao[key];
      if (val === null || val === undefined) return;
      if (typeof val === "object") {
        sessionStorage.setItem(key, JSON.stringify(val));
      } else {
        sessionStorage.setItem(key, val);
      }
    });

    // Se patrimônio_dados veio como flat mas total_patrimônio não, usa o fallback
    if (!dadosSessao.total_patrimonio && totalPatrimonioFallback) {
      sessionStorage.setItem("total_patrimonio", totalPatrimonioFallback);
    }
  }

  console.log("[normalizarSessao] sessionStorage após restauração:", {
    patrimonio_dados: sessionStorage.getItem("patrimonio_dados"),
    total_patrimonio: sessionStorage.getItem("total_patrimonio"),
    familia: sessionStorage.getItem("familia")
  });
}

// Restaurar sessão no sessionStorage para visualizar o PDF
function restaurarSessao(id) {
  const relatorios = obterRelatorios();
  const rep = relatorios.find(r => String(r.id) === String(id));

  console.log("[restaurarSessao] Procurando id:", id);
  console.log("[restaurarSessao] Relatório encontrado:", rep ? "SIM" : "NÃO");
  if (rep) {
    console.log("[restaurarSessao] dadosSessao é:", rep.dadosSessao);
    console.log("[restaurarSessao] totalPatrimonio:", rep.totalPatrimonio);
  }

  if (!rep) {
    alert("Dados da simulação não encontrados.");
    return false;
  }

  // Limpa sessão atual
  sessionStorage.clear();

  if (rep.dadosSessao && typeof rep.dadosSessao === "object" && Object.keys(rep.dadosSessao).length > 0) {
    normalizarSessao(rep.dadosSessao, rep.totalPatrimonio);
  } else {
    // dadosSessao vazio ou null: monta um mínimo para navegar ao formulário
    console.warn("[restaurarSessao] dadosSessao vazio — criando sessão mínima a partir dos metadados do card.");
    sessionStorage.setItem("total_patrimonio", rep.totalPatrimonio || 0);
    if (rep.nomeCliente) {
      sessionStorage.setItem("familia", JSON.stringify({ nome: rep.nomeCliente }));
    }
    if (rep.nomeAssessor) {
      sessionStorage.setItem("nome_assessor", rep.nomeAssessor);
    }
  }

  // Sempre define o ID correto por último (garante que não foi sobrescrito)
  sessionStorage.setItem("current_report_id", id);

  return true;
}

// Ação de Visualizar PDF
function visualizarPDF(id) {
  if (restaurarSessao(id)) {
    // Redireciona com um parâmetro para abrir o preview do PDF de forma imediata
    window.location.href = "tributario.html?preview=true";
  }
}

// Ação de Editar Simulação
function editarSimulacao(id) {
  if (restaurarSessao(id)) {
    window.location.href = "patrimonio.html";
  }
}

// Excluir relatório com confirmação customizada
async function excluirRelatorio(id) {
  const relatorios = obterRelatorios();
  const rep = relatorios.find(r => r.id === id);
  if (!rep) return;

  if (typeof window.confirmarAcaoCustom === "function") {
    window.confirmarAcaoCustom({
      titulo: "Excluir Simulação",
      mensagem: `Tem certeza que deseja excluir permanentemente a simulação do cliente "${rep.nomeCliente}"?`,
      textoConfirmar: "Sim, Excluir",
      onConfirm: async () => {
        await dbExcluirRelatorio(id);
        await carregarDashboard();
      }
    });
  } else if (confirm(`Tem certeza que deseja excluir a simulação do cliente ${rep.nomeCliente}?`)) {
    await dbExcluirRelatorio(id);
    await carregarDashboard();
  }
}
