// =========================
// REVEAL ANIMATION (Intersection Observer)
// =========================
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            // Dispara um evento customizado para gráficos saberem que devem animar
            entry.target.dispatchEvent(new CustomEvent('revealed'));
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal').forEach(el => {
        observer.observe(el);
    });

    // Desativa sugestões de histórico (autocomplete) nos campos de entrada do simulador
    document.querySelectorAll('input').forEach(input => {
        input.setAttribute('autocomplete', 'off');
    });
});

// =========================
// EFEITO PARALLAX SUAVE
// =========================
window.addEventListener('scroll', () => {
    const scroll = window.pageYOffset;
    document.body.style.backgroundPosition = `0px ${scroll * 0.1}px`;
});

// =========================
// MODAL DE CONFIRMAÇÃO CUSTOMIZADO (REEMPLAZA CONFIRM NATIVO)
// =========================
window.confirmarAcaoCustom = function({ titulo = "Confirmação", mensagem = "Deseja prosseguir com esta ação?", textoConfirmar = "Confirmar", textoCancelar = "Cancelar", onConfirm }) {
    let overlay = document.getElementById("custom-confirm-overlay");
    if (overlay) overlay.remove();

    overlay = document.createElement("div");
    overlay.id = "custom-confirm-overlay";
    overlay.className = "custom-confirm-overlay";
    overlay.innerHTML = `
      <div class="custom-confirm-card">
        <div class="confirm-icon-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h3 class="confirm-title">${window.escapeHTML(titulo)}</h3>
        <p class="confirm-msg">${window.escapeHTML(mensagem)}</p>
        <div class="confirm-actions">
          <button type="button" class="btn-cancel-modal" id="btn-cancel-custom">${window.escapeHTML(textoCancelar)}</button>
          <button type="button" class="btn-danger-modal" id="btn-ok-custom">${window.escapeHTML(textoConfirmar)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("btn-cancel-custom").onclick = () => overlay.remove();
    document.getElementById("btn-ok-custom").onclick = () => {
        overlay.remove();
        if (typeof onConfirm === "function") onConfirm();
    };
};


// =========================
// LIMPAR TUDO (RESET GLOBAL)
// =========================
function limparTudo() {
    window.confirmarAcaoCustom({
        titulo: "Resetar Simulação",
        mensagem: "Tem certeza que deseja limpar todos os dados salvos da simulação atual?",
        textoConfirmar: "Sim, Resetar",
        onConfirm: () => {
            sessionStorage.clear();
            window.location.href = "index.html";
        }
    });
}

// =========================
// ESCAPE HTML (XSS PREVENTION)
// =========================
window.escapeHTML = function(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// =========================
// HELPER: Inicializar ícones Lucide (CDN expõe como 'lucide' global)
function initLucide() {
    try {
        if (typeof lucide !== 'undefined') lucide.createIcons();
        else if (window.lucide) window.lucide.createIcons();
    } catch(e) {}
}

// =========================
// MODAL MASTER — GESTÃO DE EQUIPE (Premium Redesign)
// =========================
window.abrirModalMasterEquipe = function() {
    let overlay = document.getElementById("master-modal-overlay");
    if (overlay) { overlay.remove(); }

    overlay = document.createElement("div");
    overlay.id = "master-modal-overlay";
    overlay.className = "master-modal-overlay";
    overlay.onclick = (e) => { if (e.target === overlay) window.fecharModalMasterEquipe(); };

    overlay.innerHTML = `
      <div class="master-modal-card">

        <!-- Header Escuro Gradiente -->
        <div class="master-modal-header">
          <div class="mh-left">
            <div class="mh-icon-wrap"><i data-lucide="shield-check"></i></div>
            <div>
              <div class="mh-title">Gestão de Equipe</div>
              <div class="mh-sub">Pace Capital · Painel Master</div>
            </div>
          </div>
          <button class="master-modal-close" id="btn-fechar-master" onclick="window.fecharModalMasterEquipe()" title="Fechar">
            <span class="close-x">&times;</span>
          </button>
        </div>

        <!-- Body -->
        <div class="master-modal-body">

          <!-- Card: Gerar Convite -->
          <div class="mm-card">
            <div class="mm-card-header">
              <div class="mm-card-icon blue"><i data-lucide="link-2"></i></div>
              <div>
                <div class="mm-card-title">Novo Link de Convite</div>
                <div class="mm-card-desc">Link de uso único — expira após um cadastro</div>
              </div>
            </div>
            <div class="mm-card-body">
              <div class="invite-row">
                <div class="invite-email-wrap">
                  <i data-lucide="mail" class="invite-mail-icon"></i>
                  <input type="email" id="master_invite_email" class="invite-email-input"
                    placeholder="E-mail do destinatário (ex: assessor@pacecapital.com.br)">
                </div>
                <div class="invite-actions-wrap">
                  <button type="button" class="btn-gen-invite" onclick="window.executarGerarConviteMaster()" title="Gerar link de convite">
                    <i data-lucide="sparkles"></i>
                    <span>Gerar Link</span>
                  </button>
                  <button type="button" class="btn-send-email-direct" onclick="window.executarEnviarEmailMaster()" title="Gerar e abrir cliente de e-mail">
                    <i data-lucide="send"></i>
                    <span>Enviar por E-mail</span>
                  </button>
                </div>
              </div>
              <div id="master_invite_result" class="invite-result-card hidden" style="display: none;">
                <div class="invite-result-inner">
                  <i data-lucide="check-circle" class="invite-result-icon"></i>
                  <div class="invite-result-text">
                    <div class="invite-result-label">Link gerado com sucesso!</div>
                    <div class="invite-url-text" id="master_invite_url"></div>
                  </div>
                  <div class="invite-result-btns">
                    <button type="button" class="btn-copy-link" onclick="window.copiarLinkConviteMaster()">
                      <i data-lucide="copy"></i>
                      <span>Copiar</span>
                    </button>
                    <button type="button" class="btn-copy-link btn-email-action" onclick="window.executarEnviarEmailMasterResult()">
                      <i data-lucide="mail"></i>
                      <span>E-mail</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card: Histórico de Convites -->
          <div class="mm-card mm-card-list">
            <div class="mm-card-header">
              <div class="mm-card-icon gold"><i data-lucide="history"></i></div>
              <div>
                <div class="mm-card-title">Histórico de Convites</div>
                <div class="mm-card-desc">Gerencie os convites enviados</div>
              </div>
            </div>
            <div id="master_invite_list_container" class="mm-invite-list"></div>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    initLucide();
    window.renderizarTabelaConvitesMaster();
};

window.fecharModalMasterEquipe = function() {
    const overlay = document.getElementById("master-modal-overlay");
    if (overlay) {
        overlay.style.animation = "mmFadeOut 0.2s ease forwards";
        setTimeout(() => overlay.remove(), 200);
    }
};

window.executarGerarConviteMaster = function() {
    const emailInput = document.getElementById("master_invite_email");
    const emailRestrito = emailInput ? emailInput.value.trim() : null;

    if (window.authGerarConvite) {
        const res = window.authGerarConvite(emailRestrito || null);
        const resultDiv = document.getElementById("master_invite_result");
        const urlDiv = document.getElementById("master_invite_url");
        if (resultDiv && urlDiv) {
            urlDiv.textContent = res.url;
            resultDiv.classList.remove("hidden");
            resultDiv.style.display = "block";
            resultDiv.style.animation = "mmSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)";
        }
        window.renderizarTabelaConvitesMaster();
        initLucide();
    }
};

function dispararEmailClienteMaster(emailDestino, inviteUrl) {
    const assuntoText = "Convite Oficial de Acesso — Whealth Planner Pro";
    const corpoText = `Olá!\n\n` +
        `Você foi convidado para acessar a plataforma Whealth Planner Pro.\n\n` +
        `Clique no link abaixo para criar sua conta de acesso:\n${inviteUrl}\n\n` +
        `Atenciosamente,\nEquipe Whealth Planner Pro`;

    const assunto = encodeURIComponent(assuntoText);
    const corpo = encodeURIComponent(corpoText);

    try {
        if (emailDestino && emailDestino.toLowerCase().endsWith("@gmail.com")) {
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailDestino)}&su=${assunto}&body=${corpo}`;
            const win = window.open(gmailUrl, "_blank");
            if (!win) {
                window.location.href = `mailto:${encodeURIComponent(emailDestino)}?subject=${assunto}&body=${corpo}`;
            }
        } else {
            window.location.href = `mailto:${encodeURIComponent(emailDestino)}?subject=${assunto}&body=${corpo}`;
        }
    } catch (e) {
        console.error("Erro ao disparar cliente de e-mail:", e);
    }
}

window.executarEnviarEmailMaster = function() {
    const emailInput = document.getElementById("master_invite_email");
    const emailDestino = emailInput ? emailInput.value.trim() : "";

    if (!emailDestino || !emailDestino.includes("@")) {
        alert("Por favor, digite o e-mail do destinatário no campo antes de enviar.");
        if (emailInput) emailInput.focus();
        return;
    }

    const resultDiv = document.getElementById("master_invite_result");
    const urlDiv = document.getElementById("master_invite_url");
    let inviteUrl = "";

    // Se o card já está visível e contém a URL gerada, reutiliza a URL (evita gerar cópia no histórico)
    if (resultDiv && resultDiv.style.display !== "none" && urlDiv && urlDiv.textContent.trim()) {
        inviteUrl = urlDiv.textContent.trim();
    } else if (window.authGerarConvite) {
        // Se ainda não gerou o link, gera agora
        const res = window.authGerarConvite(emailDestino);
        inviteUrl = res.url;
        if (resultDiv && urlDiv) {
            urlDiv.textContent = inviteUrl;
            resultDiv.classList.remove("hidden");
            resultDiv.style.display = "block";
        }
        window.renderizarTabelaConvitesMaster();
    }

    if (!inviteUrl) return;

    // Dispara a janela de e-mail reutilizando o mesmo link
    const assuntoText = "Convite Oficial de Acesso — Whealth Planner Pro";
    const corpoText = `Olá!\n\n` +
        `Você foi convidado para acessar a plataforma Whealth Planner Pro.\n\n` +
        `Clique no link abaixo para criar sua conta de acesso:\n${inviteUrl}\n\n` +
        `Atenciosamente,\nEquipe Whealth Planner Pro`;

    const assunto = encodeURIComponent(assuntoText);
    const corpo = encodeURIComponent(corpoText);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailDestino)}&su=${assunto}&body=${corpo}`;
    window.open(gmailUrl, "_blank");
};

window.executarEnviarEmailMasterResult = function() {
    const urlDiv = document.getElementById("master_invite_url");
    const inviteUrl = urlDiv ? urlDiv.textContent.trim() : "";
    const emailInput = document.getElementById("master_invite_email");
    const emailDestino = emailInput ? emailInput.value.trim() : "";

    if (!inviteUrl) return;

    const assuntoText = "Convite Oficial de Acesso — Whealth Planner Pro";
    const corpoText = `Olá!\n\n` +
        `Você foi convidado para acessar a plataforma Whealth Planner Pro.\n\n` +
        `Clique no link abaixo para criar sua conta de acesso:\n${inviteUrl}\n\n` +
        `Atenciosamente,\nEquipe Whealth Planner Pro`;

    const assunto = encodeURIComponent(assuntoText);
    const corpo = encodeURIComponent(corpoText);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailDestino)}&su=${assunto}&body=${corpo}`;
    window.open(gmailUrl, "_blank");
};

window.copiarLinkConviteMaster = function() {
    const urlDiv = document.getElementById("master_invite_url");
    if (!urlDiv) return;

    // SVGs inline para os estados do botão copiar
    const svgCopy = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    const svgCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    navigator.clipboard.writeText(urlDiv.textContent).then(() => {
        const btn = document.querySelector(".btn-copy-link");
        if (btn) {
            btn.innerHTML = `${svgCheck}<span>Copiado!</span>`;
            btn.classList.add("copied");
            setTimeout(() => {
                btn.innerHTML = `${svgCopy}<span>Copiar</span>`;
                btn.classList.remove("copied");
            }, 2500);
        }
    });
};

window.excluirConviteMaster = function(tokenId) {
    if (!window.authObterConvites || !window.authSalvarConvites) return;
    const convites = window.authObterConvites().filter(c => c.id !== tokenId);
    window.authSalvarConvites(convites);
    window.renderizarTabelaConvitesMaster();
};

// SVGs inline para os ícones dos cards de histórico
const _svgMail = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
const _svgUserCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`;
const _svgX = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const _svgInbox = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`;

window.renderizarTabelaConvitesMaster = function() {
    const container = document.getElementById("master_invite_list_container");
    if (!container || !window.authObterConvites) return;

    const convites = window.authObterConvites().slice().reverse();

    if (convites.length === 0) {
        container.innerHTML = `
          <div class="mm-empty-state">
            ${_svgInbox}
            <p>Nenhum convite gerado ainda.</p>
          </div>`;
        return;
    }

    let html = "";
    convites.forEach(c => {
        const dataStr = new Date(c.created_at).toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });

        const destinatario = c.email_restrito ? window.escapeHTML(c.email_restrito) : "Qualquer e-mail";
        const tokenSafe = window.escapeHTML(c.id);
        const statusClass = c.used ? "used" : "active";
        const statusLabel = c.used
            ? `Usado por <strong>${window.escapeHTML(c.used_by || "—")}</strong>`
            : "Ativo";
        const statusDot = c.used ? "dot-used" : "dot-active";
        const avatarIcon = c.used ? _svgUserCheck : _svgMail;
        const avatarClass = c.used ? "avatar-used" : "avatar-active";

        html += `
          <div class="mm-invite-item">
            <div class="mii-avatar ${avatarClass}">${avatarIcon}</div>
            <div class="mii-info">
              <div class="mii-email">${destinatario}</div>
              <div class="mii-date">${dataStr}</div>
            </div>
            <div class="mii-status ${statusClass}">
              <span class="mii-dot ${statusDot}"></span>
              ${statusLabel}
            </div>
            <button class="btn-delete-invite" onclick="window.excluirConviteMaster('${tokenSafe}')" title="Excluir convite">
              <span class="btn-x-icon">&times;</span>
            </button>
          </div>
        `;
    });

    container.innerHTML = html;
};

// =========================
// WIZARD STEPPER GLOBAL
// =========================
window.renderizarStepperGlobal = function(passoAtual) {
    const container = document.getElementById("global-stepper-container");
    if (!container) return;

    const passos = [
        { num: 1, label: "Inventário de Bens", url: "patrimonio.html" },
        { num: 2, label: "Estrutura Familiar", url: "familiar.html" },
        { num: 3, label: "Projeção Patrimonial", url: "evolucao.html" },
        { num: 4, label: "Diagnóstico & PDF", url: "tributario.html" }
    ];

    let html = `<div class="wizard-stepper-bar">`;
    passos.forEach(p => {
        const isCompleted = p.num < passoAtual;
        const isActive = p.num === passoAtual;
        const statusClass = isActive ? "active" : (isCompleted ? "completed" : "");
        const checkOrNum = isCompleted ? `✓` : p.num;

        html += `
          <a href="${p.url}" class="stepper-step ${statusClass}" title="${p.label}">
            <div class="stepper-circle">${checkOrNum}</div>
            <span class="stepper-label">${p.label}</span>
          </a>
        `;
        if (p.num < passos.length) {
            html += `<div class="stepper-line ${isCompleted ? "completed" : ""}"></div>`;
        }
    });
    html += `</div>`;

    container.innerHTML = html;
};

// =========================
// NOTIFICAÇÃO DE AUTO-SAVE
// =========================
window.notificarAutoSave = function(status = "salvo") {
    let toast = document.getElementById("autosave-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "autosave-toast";
        toast.className = "autosave-toast";
        document.body.appendChild(toast);
    }

    if (status === "salvando") {
        toast.innerHTML = `<span class="toast-spinner"></span> <span>Salvando alterações...</span>`;
        toast.classList.add("visible");
    } else if (status === "salvo") {
        toast.innerHTML = `<span class="toast-check">✓</span> <span>Alterações salvas</span>`;
        toast.classList.add("visible");
        setTimeout(() => toast.classList.remove("visible"), 2500);
    } else if (status === "offline") {
        toast.innerHTML = `<span class="toast-warn">⚠️</span> <span>Modo Offline (Salvo localmente)</span>`;
        toast.classList.add("visible");
        setTimeout(() => toast.classList.remove("visible"), 3500);
    }
};

// =========================
// SISTEMA PACE UI TOAST
// =========================
window.PaceUI = window.PaceUI || {};

window.PaceUI.mostrarToast = function(mensagem, tipo = 'sucesso', duracaoMs = 3000) {
    let container = document.getElementById("pace-toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "pace-toast-container";
        container.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `pace-toast pace-toast-${tipo}`;
    
    let icone = '✓';
    let corBg = 'rgba(16, 185, 129, 0.95)';
    if (tipo === 'erro') { icone = '✕'; corBg = 'rgba(239, 68, 68, 0.95)'; }
    if (tipo === 'aviso') { icone = '⚠️'; corBg = 'rgba(245, 158, 11, 0.95)'; }
    if (tipo === 'info') { icone = 'ℹ️'; corBg = 'rgba(59, 130, 246, 0.95)'; }

    toast.style.cssText = `
        background: ${corBg};
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        gap: 10px;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    toast.innerHTML = `<span style="font-weight: bold; font-size: 16px;">${icone}</span> <span>${window.escapeHTML(mensagem)}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, duracaoMs);
};

