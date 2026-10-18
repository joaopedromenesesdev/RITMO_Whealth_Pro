// =========================
// ESTADO CIVIL
// =========================
document.getElementById("estado_civil").addEventListener("change", function () {

  let div = document.getElementById("dados_casamento");
  let divSucessao = document.getElementById("sucessao_conjuge");

  if (this.value === "casado") {
    div.style.display = "block";
    divSucessao.style.display = "block";
  } else {
    div.style.display = "none";
    divSucessao.style.display = "none";
  }

  salvarDados();
});


// =========================
// VERIFICAR COLATERAIS (REGRAS DE SUCESSÃO)
// =========================
function verificarColaterais() {
  let estadoCivil = document.getElementById("estado_civil").value;
  let temFilhos = document.getElementById("tem_filhos").value;
  let possuiPais = document.getElementById("possui_pais").value;
  
  let divPergunta = document.getElementById("pergunta_colaterais");
  let divDados = document.getElementById("dados_colaterais");
  let selectPossui = document.getElementById("possui_colaterais");
  
  if (!divPergunta) return;

  if (estadoCivil === "casado" || temFilhos === "sim" || possuiPais === "sim") {
    divPergunta.style.display = "none";
    divDados.style.display = "none";
    selectPossui.value = "";
  } else {
    divPergunta.style.display = "block";
    if (selectPossui.value === "sim") {
      divDados.style.display = "block";
    } else {
      divDados.style.display = "none";
    }
  }
}

document.getElementById("estado_civil").addEventListener("change", verificarColaterais);
document.getElementById("tem_filhos").addEventListener("change", verificarColaterais);
document.getElementById("possui_pais").addEventListener("change", verificarColaterais);

// =========================
// FILHOS (MOSTRAR / ESCONDER)
// =========================
document.getElementById("tem_filhos").addEventListener("change", function () {

  let area = document.getElementById("area_filhos");

  if (this.value === "sim") {
    area.style.display = "block";
  } else {
    area.style.display = "none";
    document.getElementById("idades_filhos").innerHTML = "";
  }

  salvarDados();
});


// =========================
// GERAR IDADES DOS FILHOS (COM PRESERVAÇÃO DE DADOS)
// =========================
function safeEscape(str) {
  if (typeof window.escapeHTML === "function") return window.escapeHTML(str);
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function atualizarCamposFilhos(qtd, valoresFornecidos = null) {
  const container = document.getElementById("idades_filhos");
  if (!container) return;

  // Se não foram fornecidos valores salvos, preserva o que o usuário já digitou na tela
  let idadesAtuais = valoresFornecidos;
  if (!idadesAtuais) {
    idadesAtuais = [];
    container.querySelectorAll(".idade_filho").forEach(input => {
      idadesAtuais.push(input.value);
    });
  }

  const qtdSegura = Math.min(Math.max(parseInt(qtd, 10) || 0, 0), 30);
  container.innerHTML = "";

  for (let i = 0; i < qtdSegura; i++) {
    const val = (idadesAtuais[i] !== undefined && idadesAtuais[i] !== null && idadesAtuais[i] !== "")
      ? idadesAtuais[i]
      : "";

    const wrapper = document.createElement("div");
    wrapper.className = "filho-input-item";
    wrapper.style.cssText = "display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;";
    wrapper.innerHTML = `
      <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:2px;">Idade do filho ${i + 1}</label>
      <input type="number" class="idade_filho" min="0" max="120" placeholder="Ex: 15" value="${val !== "" ? safeEscape(val) : ""}">
    `;

    const inputEl = wrapper.querySelector(".idade_filho");
    inputEl.addEventListener("input", function () {
      checkFilled(this);
      salvarDados();
    });

    container.appendChild(wrapper);
  }

  salvarDados();
}

document.getElementById("qtd_filhos").addEventListener("input", function () {
  atualizarCamposFilhos(this.value);
});


// =========================
// PAIS (ASCENDENTES)
// =========================
document.getElementById("possui_pais").addEventListener("change", function () {

  let div = document.getElementById("dados_pais");

  if (this.value === "sim") {
    div.style.display = "block";
  } else {
    div.style.display = "none";
  }

  salvarDados();
});


// =========================
// COLATERAIS
// =========================
document.getElementById("possui_colaterais").addEventListener("change", function () {

  let div = document.getElementById("dados_colaterais");

  if (this.value === "sim") {
    div.style.display = "block";
  } else {
    div.style.display = "none";
  }

  salvarDados();
});


// =========================
// PAIS CÔNJUGE
// =========================
document.getElementById("conjuge_possui_pais").addEventListener("change", function () {
  let div = document.getElementById("dados_pais_conjuge");
  if (this.value === "sim") {
    div.style.display = "block";
  } else {
    div.style.display = "none";
  }
  salvarDados();
});


// =========================
// COLATERAIS CÔNJUGE
// =========================
document.getElementById("conjuge_possui_colaterais").addEventListener("change", function () {
  let div = document.getElementById("dados_colaterais_conjuge");
  if (this.value === "sim") {
    div.style.display = "block";
  } else {
    div.style.display = "none";
  }
  salvarDados();
});


// =========================
// SALVAR AUTOMÁTICO
// =========================
document.querySelectorAll("input, select").forEach(el => {
  el.addEventListener("input", function () {
    checkFilled(this);
    salvarDados();
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
// FUNÇÃO SALVAR (COMPLETA)
// =========================
function salvarDados() {

  let idades = [];
  document.querySelectorAll(".idade_filho").forEach(input => {
    const val = input.value.trim();
    idades.push(val === "" ? "" : (Number(val) || 0));
  });

  const dados = {
    nome: document.getElementById("nome_cliente").value,
    estadoCivil: document.getElementById("estado_civil").value,
    conjuge: document.getElementById("nome_conjuge").value,
    regime: document.getElementById("regime").value,

    temFilhos: document.getElementById("tem_filhos").value,
    qtdFilhos: document.getElementById("qtd_filhos").value,
    idadesFilhos: idades,

    possuiPais: document.getElementById("possui_pais").value,
    qtdPais: document.getElementById("qtd_pais").value,

    possuiColaterais: document.getElementById("possui_colaterais").value,
    qtdColaterais: document.getElementById("qtd_colaterais").value,
    tipoColaterais: document.getElementById("tipo_colaterais").value,

    // Dados Cônjuge Extra
    conjugePossuiPais: document.getElementById("conjuge_possui_pais").value,
    conjugeQtdPais: document.getElementById("conjuge_qtd_pais").value,
    conjugePossuiColaterais: document.getElementById("conjuge_possui_colaterais").value,
    conjugeQtdColaterais: document.getElementById("conjuge_qtd_colaterais").value,
    conjugeTipoColaterais: document.getElementById("conjuge_tipo_colaterais").value
  };

  sessionStorage.setItem("familia", JSON.stringify(dados));

  if (typeof renderizarOrganogramaFamiliar === "function") {
    renderizarOrganogramaFamiliar();
  }

  // Auto-save: persiste progressivamente no Supabase com debounce
  if (typeof dbAutoSalvar === "function") dbAutoSalvar();
}


// =========================
// CARREGAR DADOS
// =========================
window.onload = function () {

  const dados = JSON.parse(sessionStorage.getItem("familia"));
  if (!dados) return;

  // ===== DADOS PRINCIPAIS =====
  document.getElementById("nome_cliente").value = dados.nome || "";
  document.getElementById("estado_civil").value = dados.estadoCivil || "";

  if (dados.estadoCivil === "casado") {
    document.getElementById("dados_casamento").style.display = "block";
    document.getElementById("sucessao_conjuge").style.display = "block";
  }

  document.getElementById("nome_conjuge").value = dados.conjuge || "";
  document.getElementById("regime").value = dados.regime || "";

  // ===== FILHOS =====
  document.getElementById("tem_filhos").value = dados.temFilhos || "";

  if (dados.temFilhos === "sim") {
    document.getElementById("area_filhos").style.display = "block";
  }

  document.getElementById("qtd_filhos").value = dados.qtdFilhos || "";

  if (dados.qtdFilhos) {
    const idadesSalvas = Array.isArray(dados.idadesFilhos) ? dados.idadesFilhos : [];
    atualizarCamposFilhos(dados.qtdFilhos, idadesSalvas);
  }

  // ===== PAIS =====
  document.getElementById("possui_pais").value = dados.possuiPais || "";

  if (dados.possuiPais === "sim") {
    document.getElementById("dados_pais").style.display = "block";
  }

  document.getElementById("qtd_pais").value = dados.qtdPais || "";

  // ===== COLATERAIS =====
  document.getElementById("possui_colaterais").value = dados.possuiColaterais || "";

  if (dados.possuiColaterais === "sim") {
    document.getElementById("dados_colaterais").style.display = "block";
  }

  document.getElementById("qtd_colaterais").value = dados.qtdColaterais || "";
  document.getElementById("tipo_colaterais").value = dados.tipoColaterais || "";

  // ===== DADOS CÔNJUGE EXTRA =====
  document.getElementById("conjuge_possui_pais").value = dados.conjugePossuiPais || "";
  if (dados.conjugePossuiPais === "sim") {
    document.getElementById("dados_pais_conjuge").style.display = "block";
  }
  document.getElementById("conjuge_qtd_pais").value = dados.conjugeQtdPais || "";

  document.getElementById("conjuge_possui_colaterais").value = dados.conjugePossuiColaterais || "";
  if (dados.conjugePossuiColaterais === "sim") {
    document.getElementById("dados_colaterais_conjuge").style.display = "block";
  }
  document.getElementById("conjuge_qtd_colaterais").value = dados.conjugeQtdColaterais || "";
  document.getElementById("conjuge_tipo_colaterais").value = dados.conjugeTipoColaterais || "";

  verificarColaterais();

  document.querySelectorAll("input, select").forEach(checkFilled);

  if (typeof renderizarOrganogramaFamiliar === "function") {
    renderizarOrganogramaFamiliar();
  }
};

// =========================
// MOTOR SUCESSÓRIO INTELIGENTE
// =========================
document.getElementById("regime").addEventListener("change", function() {
  const regime = (this.value || "").toLowerCase();
  if (regime.includes("comunhão") || regime.includes("comunhao") || regime.includes("participação final") || regime.includes("aquestos")) {
    // Cria um pequeno aviso de inteligência
    let aviso = document.getElementById("aviso_regime");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "aviso_regime";
      aviso.className = "reveal active";
      aviso.style = "margin-top: 10px; padding: 15px; background: rgba(11,83,184,0.05); border-left: 4px solid var(--primary); font-size: 14px; color: var(--text-main); border-radius: 4px;";
      this.parentElement.appendChild(aviso);
    }
    aviso.innerHTML = `<i class="icon-info" style="color: var(--primary)"></i> <strong>Inteligência Ritmo Wealth Pro:</strong> Sob este regime, o sistema aplicará automaticamente a regra de meação (50% isento de ITCMD) no cálculo do prejuízo tributário final.`;
  } else {
    const aviso = document.getElementById("aviso_regime");
    if (aviso) aviso.remove();
  }
});

// =========================
// TOGGLE VISIBILIDADE DO ORGANOGRAMA
// =========================
window.alternarVisualizacaoOrganograma = function () {
  const secao = document.getElementById("organograma_section");
  const btn = document.getElementById("btn_toggle_organograma");
  const label = document.getElementById("btn_toggle_organograma_label");
  if (!secao) return;

  const estaOculto = secao.style.display === "none";

  if (estaOculto) {
    secao.style.display = "flex";
    if (btn) btn.classList.add("ativo");
    if (label) label.textContent = "Ocultar Organograma";
    renderizarOrganogramaFamiliar();
    setTimeout(() => {
      secao.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  } else {
    secao.style.display = "none";
    if (btn) btn.classList.remove("ativo");
    if (label) label.textContent = "Ver Organograma Sucessório";
  }
};

// ==========================================
// 🌳 RENDERIZADOR DO ORGANOGRAMA FAMILIAR
// ==========================================
function renderizarOrganogramaFamiliar() {
  const treeContainer = document.getElementById("tree_canvas");
  const metricasContainer = document.getElementById("organograma_metricas_rapidas");
  const alertasContainer = document.getElementById("alertas_sucessorios_container");
  if (!treeContainer) return;

  const secao = document.getElementById("organograma_section");
  if (secao && secao.style.display === "none") return;

  // 1. Obter dados dos inputs
  const nomeCliente = (document.getElementById("nome_cliente")?.value || "").trim() || "Cliente (Titular)";
  const estadoCivil = document.getElementById("estado_civil")?.value || "solteiro";
  const ehCasado = estadoCivil === "casado";
  const nomeConjuge = (document.getElementById("nome_conjuge")?.value || "").trim() || "Cônjuge";
  const regime = document.getElementById("regime")?.value || "Regime a definir";

  const temFilhos = document.getElementById("tem_filhos")?.value === "sim";
  const qtdFilhosInput = parseInt(document.getElementById("qtd_filhos")?.value) || 0;

  const idadesFilhos = [];
  let menoresDeIdade = 0;
  document.querySelectorAll(".idade_filho").forEach(inp => {
    const v = parseInt(inp.value);
    if (!isNaN(v)) {
      idadesFilhos.push(v);
      if (v < 18) menoresDeIdade++;
    } else {
      idadesFilhos.push(null);
    }
  });

  const qtdFilhos = temFilhos ? Math.max(qtdFilhosInput, idadesFilhos.length) : 0;

  const possuiPais = document.getElementById("possui_pais")?.value === "sim";
  const qtdPais = parseInt(document.getElementById("qtd_pais")?.value) || 0;

  const possuiColaterais = document.getElementById("possui_colaterais")?.value === "sim";
  const tipoColaterais = (document.getElementById("tipo_colaterais")?.value || "").trim() || "Irmãos / Parentes";

  // Total de patrimônio vindo do passo 1 (se preenchido)
  const totalPatrimonioRaw = parseFloat(sessionStorage.getItem("total_patrimonio")) || 0;
  const totalFormatado = totalPatrimonioRaw > 0 
    ? "R$ " + Math.round(totalPatrimonioRaw).toLocaleString("pt-BR") 
    : "Patrimônio Integrado";

  // 2. Análise Jurídica Sucessória (Código Civil)
  let temMeacao = false;
  let meacaoDesc = "Sem Meação";
  const regimeLower = regime.toLowerCase();

  if (ehCasado) {
    if (regimeLower.includes("comunhão parcial") || regimeLower.includes("comunhao parcial")) {
      temMeacao = true;
      meacaoDesc = "Meação: 50% dos aquestos";
    } else if (regimeLower.includes("comunhão universal") || regimeLower.includes("comunhao universal")) {
      temMeacao = true;
      meacaoDesc = "Meação: 50% de todo patrimônio";
    } else if (regimeLower.includes("separação") || regimeLower.includes("separacao")) {
      temMeacao = false;
      meacaoDesc = "Sem Meação (Herdeiro concorrente)";
    } else if (regimeLower.includes("aquestos")) {
      temMeacao = true;
      meacaoDesc = "Meação sobre aquestos onerosos";
    }
  }

  // 3. Renderizar Métricas Rápidas
  if (metricasContainer) {
    let meacaoBadge = "";
    if (ehCasado && temMeacao) {
      meacaoBadge = `
        <div class="metrica-card-sucessoria destaque-meacao">
          <span class="metrica-card-label">Meação do Cônjuge</span>
          <span class="metrica-card-val" style="color: #059669;">50%</span>
          <span class="metrica-card-desc">Isento de ITCMD (Bens Comuns)</span>
        </div>
      `;
    }

    metricasContainer.innerHTML = `
      ${meacaoBadge}
      <div class="metrica-card-sucessoria destaque-legitima">
        <span class="metrica-card-label">Legítima (Indisponível)</span>
        <span class="metrica-card-val">50%</span>
        <span class="metrica-card-desc">Reservada aos herdeiros necessários</span>
      </div>
      <div class="metrica-card-sucessoria destaque-disponivel">
        <span class="metrica-card-label">Parcela Disponível</span>
        <span class="metrica-card-val" style="color: #0284c7;">50%</span>
        <span class="metrica-card-desc">Cota de livre disposição (Art. 1.789 CC)</span>
      </div>
    `;
  }

  // 4. Montar a Árvore Visual
  let htmlTree = "";

  // ── NÍVEL 1: Titular e Casal ──
  htmlTree += `<div class="tree-level">`;
  htmlTree += `<div class="tree-couple-wrapper">`;

  // Nó Titular
  htmlTree += `
    <div class="tree-node-card node-titular">
      <div class="tree-node-avatar"><i data-lucide="user-check"></i></div>
      <div class="tree-node-name" title="${safeEscape(nomeCliente)}">${safeEscape(nomeCliente)}</div>
      <div class="tree-node-role">Titular do Patrimônio</div>
      <div class="tree-node-badge badge-legitima">${safeEscape(totalFormatado)}</div>
    </div>
  `;

  // Nó Cônjuge se Casado
  if (ehCasado) {
    htmlTree += `
      <div class="tree-marriage-bridge">
        <span class="tree-marriage-tag">
          <i data-lucide="heart" style="width:13px; height:13px; fill:#ffffff;"></i>
          ${safeEscape(regime || "Casado")}
        </span>
        <div class="tree-marriage-line"></div>
      </div>

      <div class="tree-node-card node-conjuge">
        <div class="tree-node-avatar"><i data-lucide="users"></i></div>
        <div class="tree-node-name" title="${safeEscape(nomeConjuge)}">${safeEscape(nomeConjuge)}</div>
        <div class="tree-node-role">${temMeacao ? "Cônjuge Meeiro(a)" : "Cônjuge Herdeiro(a)"}</div>
        <div class="tree-node-badge badge-meacao">${safeEscape(meacaoDesc)}</div>
      </div>
    `;
  }

  htmlTree += `</div></div>`; // Fecha casal e nível 1

  // ── NÍVEL 2: Filhos ou Ascendentes ou Colaterais ──
  if (qtdFilhos > 0) {
    htmlTree += `<div class="tree-connector-down"></div>`;
    htmlTree += `<div class="tree-children-container">`;
    if (qtdFilhos > 1) {
      const branchWidth = Math.min(qtdFilhos * 210, 800);
      htmlTree += `<div class="tree-children-branch-line" style="width: min(${branchWidth}px, 92%);"></div>`;
    }
    htmlTree += `<div class="tree-children-list">`;

    const fatiaPorFilho = (100 / qtdFilhos).toFixed(1);

    for (let i = 0; i < qtdFilhos; i++) {
      const idade = idadesFilhos[i];
      const ehMenor = idade !== null && idade !== undefined && idade < 18;
      const idadeStr = idade !== null && idade !== undefined && idade !== "" ? `${idade} anos` : "Idade não informada";
      const tagMenor = ehMenor 
        ? `<div class="tree-node-badge badge-menor">⚠️ Menor de Idade (${idadeStr})</div>`
        : (idade ? `<div class="tree-node-badge badge-legitima">${idadeStr}</div>` : "");

      htmlTree += `
        <div class="tree-node-card node-filho ${ehMenor ? 'menor-idade' : ''}">
          <div class="tree-node-avatar"><i data-lucide="${ehMenor ? 'alert-triangle' : 'user'}"></i></div>
          <div class="tree-node-name">Filho(a) ${i + 1}</div>
          <div class="tree-node-role">Herdeiro Necessário</div>
          ${tagMenor}
          <div class="tree-node-badge badge-legitima" style="margin-top:2px;">Fatia: ${fatiaPorFilho}% da legítima</div>
        </div>
      `;
    }

    htmlTree += `</div></div>`; // Fecha filhos

  } else if (possuiPais) {
    htmlTree += `<div class="tree-connector-down"></div>`;
    htmlTree += `<div class="tree-children-container">`;
    htmlTree += `
      <div class="tree-children-list">
        <div class="tree-node-card" style="border-color: #6366f1;">
          <div class="tree-node-avatar" style="background: #e0e7ff; color: #4338ca;"><i data-lucide="shield"></i></div>
          <div class="tree-node-name">Ascendentes (${qtdPais || 1} vivo(s))</div>
          <div class="tree-node-role">Herdeiros Necessários (Pais)</div>
          <div class="tree-node-badge badge-legitima">Na ausência de filhos, os pais concorrem na herança</div>
        </div>
      </div>
    </div>`;

  } else if (!ehCasado && possuiColaterais) {
    htmlTree += `<div class="tree-connector-down"></div>`;
    htmlTree += `<div class="tree-children-container">`;
    htmlTree += `
      <div class="tree-children-list">
        <div class="tree-node-card" style="border-color: #94a3b8;">
          <div class="tree-node-avatar" style="background: #f1f5f9; color: #475569;"><i data-lucide="users"></i></div>
          <div class="tree-node-name">${safeEscape(tipoColaterais)}</div>
          <div class="tree-node-role">Herdeiros Facultativos (Colaterais)</div>
          <div class="tree-node-badge badge-legitima">Irmãos/Parentes até 4º grau (podem ser excluídos por testamento)</div>
        </div>
      </div>
    </div>`;

  } else if (!ehCasado) {
    htmlTree += `
      <p style="font-size:13px; color:var(--text-muted); text-align:center; margin-top:20px;">
        💡 Conforme preencher os dados de casamento, filhos ou ascendentes acima, a árvore sucessória e cotas serão calculadas em tempo real.
      </p>
    `;
  }

  treeContainer.innerHTML = htmlTree;

  // 5. Gerar Alertas Inteligentes de Risco Sucessório
  if (alertasContainer) {
    const alertas = [];

    if (menoresDeIdade > 0) {
      alertas.push({
        tipo: "alerta-aviso",
        icone: "alert-triangle",
        titulo: `Inventário Judicial Obrigatório (${menoresDeIdade} herdeiro(s) menor(es) de idade)`,
        texto: "A legislação brasileira veda a realização de inventário extrajudicial em cartório quando há herdeiros menores de 18 anos. A partilha exigirá intervenção do Ministério Público e via judicial, ampliando custos e tempo de liberação dos bens."
      });
    }

    if (ehCasado && regimeLower.includes("comunhão universal")) {
      alertas.push({
        tipo: "alerta-aviso",
        icone: "shield-alert",
        titulo: "Comunhão Universal: Comunicação Total de Patrimônio",
        texto: "Todos os bens passados e futuros de ambos os cônjuges comunicam-se integralmente. Heranças e doações recebidas de terceiros entram na meação, a menos que tenham sido gravadas formalmente com cláusula de incomunicabilidade."
      });
    } else if (ehCasado && regimeLower.includes("separação")) {
      alertas.push({
        tipo: "alerta-info",
        icone: "info",
        titulo: "Separação de Bens: Cônjuge concorre na Herança",
        texto: "Embora não haja meação de bens em vida ou em divórcio, na sucessão causa mortis o cônjuge sobrevivente é herdeiro necessário e concorrerá em igualdade de cotas com os filhos sobre o acervo do titular (Código Civil, Art. 1.829, I)."
      });
    }

    const inventarioPendente = document.getElementById("inventario_concluido")?.value === "nao";
    if (estadoCivil === "viuvo" && inventarioPendente) {
      alertas.push({
        tipo: "alerta-aviso",
        icone: "alert-circle",
        titulo: "Inventário Anterior Pendente",
        texto: "50% do patrimônio atual pode legalmente pertencer ao espólio e herdeiros do cônjuge falecido. A realização de um novo planejamento patrimonial requer a regularização prévia das partilhas pendentes."
      });
    }

    if (alertas.length > 0) {
      alertasContainer.style.display = "flex";
      let htmlAlertas = "";
      alertas.forEach(a => {
        htmlAlertas += `
          <div class="alerta-sucessorio-item ${a.tipo}">
            <i data-lucide="${a.icone}"></i>
            <div>
              <strong>${a.titulo}:</strong> ${a.texto}
            </div>
          </div>
        `;
      });
      alertasContainer.innerHTML = htmlAlertas;
    } else {
      alertasContainer.style.display = "none";
      alertasContainer.innerHTML = "";
    }
  }

  // Atualiza ícones Lucide
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

// Inicialização imediata caso o DOM já esteja pronto
if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(renderizarOrganogramaFamiliar, 50);
}
