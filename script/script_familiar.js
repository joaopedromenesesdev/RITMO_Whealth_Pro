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
// GERAR IDADES DOS FILHOS
// =========================
document.getElementById("qtd_filhos").addEventListener("input", function () {

  let qtd = Number(this.value);
  let container = document.getElementById("idades_filhos");

  container.innerHTML = "";

  for (let i = 1; i <= qtd; i++) {
    container.innerHTML += `
      <h5>Idade do filho ${i}</h5>
      <input type="number" class="idade_filho" min="0">
    `;
  }

  salvarDados();
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
    idades.push(Number(input.value) || 0);
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
    let container = document.getElementById("idades_filhos");
    container.innerHTML = "";

    for (let i = 0; i < dados.qtdFilhos; i++) {
      container.innerHTML += `
        <h5>Idade do filho ${i + 1}</h5>
        <input type="number" class="idade_filho" value="${dados.idadesFilhos[i] || ""}">
      `;
    }
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
    aviso.innerHTML = `<i class="icon-info" style="color: var(--primary)"></i> <strong>Inteligência Pace:</strong> Sob este regime, o sistema aplicará automaticamente a regra de meação (50% isento de ITCMD) no cálculo do prejuízo tributário final.`;
  } else {
    const aviso = document.getElementById("aviso_regime");
    if (aviso) aviso.remove();
  }
});