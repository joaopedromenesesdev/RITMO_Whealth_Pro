// =========================
// CONTROLE DE CICLO DE VIDA DA SIMULAÇÃO (WHEALTH PLANNER PRO)
// =========================
window.temSimulacaoEmAndamento = function() {
    return sessionStorage.getItem("simulacao_ativa") === "true";
};

// Guarda de Rota Imediata (executa síncrono antes do render)
(function() {
    const abasPlanejamento = ['patrimonio.html', 'familiar.html', 'evolucao.html', 'tributario.html'];
    const pathAtual = window.location.pathname;

    // Se o usuário acessar diretamente qualquer uma das 4 telas de planejamento sem ter iniciado simulação,
    // limpa qualquer resíduo anterior e redireciona imediatamente para a introdução (nova_simulacao.html)
    if (abasPlanejamento.some(aba => pathAtual.endsWith(aba))) {
        if (!window.temSimulacaoEmAndamento()) {
            sessionStorage.clear();
            window.location.replace('nova_simulacao.html');
        }
    }
})();

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

    // Desativa sugestões de preenchimento automático do navegador (Edge/Chrome Wallet Popup)
    const desativarAutofillNavegador = (scope = document) => {
        const inputs = scope.querySelectorAll('input');
        inputs.forEach(input => {
            input.setAttribute('autocomplete', 'new-password');
            input.setAttribute('data-lpignore', 'true');
            input.setAttribute('data-form-type', 'other');
            input.setAttribute('aria-autocomplete', 'none');
        });
    };

    desativarAutofillNavegador();

    // Monitora a inserção dinâmica de novos campos de input em toda a aplicação
    const observerInputs = new MutationObserver(() => desativarAutofillNavegador());
    observerInputs.observe(document.body, { childList: true, subtree: true });

    // Intercepta cliques nas 4 abas do planejamento (Patrimônio, Estrutura Familiar, Evolução, Prejuízo Tributário)
    // Se o usuário NÃO iniciou uma simulação (sem simulação em andamento), limpa resíduos e abre a introdução em nova_simulacao.html
    const abasPlanejamento = ['patrimonio.html', 'familiar.html', 'evolucao.html', 'tributario.html'];
    
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href') || '';
        if (abasPlanejamento.some(aba => href.includes(aba))) {
            link.addEventListener('click', (e) => {
                if (!window.temSimulacaoEmAndamento()) {
                    e.preventDefault();
                    sessionStorage.clear();
                    window.location.href = 'nova_simulacao.html';
                }
            });
        }
    });

    // Se a página atual for uma das 4 telas de planejamento sem simulação em andamento, redireciona para a animação em nova_simulacao.html
    const pathAtual = window.location.pathname;
    if (abasPlanejamento.some(aba => pathAtual.endsWith(aba))) {
        if (!window.temSimulacaoEmAndamento()) {
            sessionStorage.clear();
            window.location.replace('nova_simulacao.html');
        }
    }

    // Inicializa ergonomia de digitação (auto-seleção de valores numéricos ao focar)
    inicializarAutoSelectInputs();

    // Inicializa banner de modo de visualização / auditoria Master se ativo
    renderizarBannerAuditoriaMaster();

    // Inicializa o botão flutuante de suporte no canto inferior direito
    inicializarWidgetSuporte();
});

// Banner discreto para Modo de Visualização / Auditoria Master (Somente Leitura)
function renderizarBannerAuditoriaMaster() {
    if (sessionStorage.getItem("modo_auditoria_master") !== "true") return;
    if (document.getElementById("master-audit-readonly-banner")) return;

    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    const nomeAssessor = sessionStorage.getItem("auditoria_assessor_nome") || sessionStorage.getItem("nome_assessor") || "Assessor";
    const esc = typeof window.escapeHTML === "function" ? window.escapeHTML : (s => String(s || ""));

    const banner = document.createElement("div");
    banner.id = "master-audit-readonly-banner";
    banner.style.cssText = `
        background: #09090b;
        color: #ffffff;
        padding: 10px 24px;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        z-index: 900;
    `;
    banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="background: #27272a; color: #fafafa; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.04em;">VISUALIZAÇÃO MASTER (SOMENTE LEITURA)</span>
            <span style="color: #d4d4d8;">Inspecionando simulação do Assessor: <strong style="color: #ffffff;">${esc(nomeAssessor)}</strong> — O auto-salvamento está desativado para preservar os dados originais.</span>
        </div>
        <button type="button" onclick="sessionStorage.clear(); window.location.href='index.html';" style="background: #ffffff; color: #09090b; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">
            Voltar ao Meu Dashboard
        </button>
    `;
    navbar.insertAdjacentElement("afterend", banner);
}

// =========================
// EFEITO PARALLAX SUAVE
// =========================
window.addEventListener('scroll', () => {
    const scroll = window.pageYOffset;
    document.body.style.backgroundPosition = `0px ${scroll * 0.1}px`;
});

// =========================
// =========================
// MODAL DE CONFIRMAÇÃO / AVISO CUSTOMIZADO (REEMPLAZA CONFIRM NATIVO)
// =========================
window.confirmarAcaoCustom = function({
    titulo = "Confirmação",
    mensagem = "Deseja prosseguir com esta ação?",
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar",
    tipo = "danger",
    somenteAviso = false,
    onConfirm
}) {
    let overlay = document.getElementById("custom-confirm-overlay");
    if (overlay) overlay.remove();

    const isInfo = tipo === "info" || somenteAviso;
    const strokeColor = isInfo ? "#09090b" : "#ef4444";
    const iconSvg = isInfo
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

    const iconBg = isInfo ? "rgba(0, 0, 0, 0.06)" : "#fef2f2";
    const btnClass = isInfo ? "btn-cancel-modal" : "btn-danger-modal";
    const btnConfirmStyle = isInfo ? "background: #09090b; color: #fff; border-color: #09090b;" : "";

    overlay = document.createElement("div");
    overlay.id = "custom-confirm-overlay";
    overlay.className = "custom-confirm-overlay";
    overlay.innerHTML = `
      <div class="custom-confirm-card">
        <div class="confirm-icon-wrap" style="background: ${iconBg};">
          ${iconSvg}
        </div>
        <h3 class="confirm-title">${window.escapeHTML(titulo)}</h3>
        <p class="confirm-msg">${window.escapeHTML(mensagem)}</p>
        <div class="confirm-actions" style="${somenteAviso ? 'justify-content: center;' : ''}">
          ${!somenteAviso && textoCancelar ? `<button type="button" class="btn-cancel-modal" id="btn-cancel-custom">${window.escapeHTML(textoCancelar)}</button>` : ''}
          <button type="button" class="${btnClass}" id="btn-ok-custom" style="${btnConfirmStyle}">${window.escapeHTML(textoConfirmar)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnCancel = document.getElementById("btn-cancel-custom");
    if (btnCancel) btnCancel.onclick = () => overlay.remove();

    document.getElementById("btn-ok-custom").onclick = () => {
        overlay.remove();
        if (typeof onConfirm === "function") onConfirm();
    };
};

// =========================
// =========================
// LIMPAR TUDO (RESET GLOBAL COM VERIFICAÇÃO DE SIMULAÇÃO)
// =========================
function limparTudo() {
    if (!window.temSimulacaoEmAndamento()) {
        window.confirmarAcaoCustom({
            titulo: "Nenhuma Simulação em Andamento",
            mensagem: "Não existe nenhuma simulação sendo realizada no momento para ser limpa.",
            textoConfirmar: "Entendi",
            tipo: "info",
            somenteAviso: true
        });
        return;
    }

    window.confirmarAcaoCustom({
        titulo: "Resetar Simulação",
        mensagem: "Tem certeza que deseja limpar todos os dados da simulação atual e voltar ao início?",
        textoConfirmar: "Sim, Resetar",
        tipo: "danger",
        onConfirm: () => {
            sessionStorage.clear();
            window.location.href = "nova_simulacao.html";
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

// HELPER: Inicializar ícones Lucide (CDN expõe como 'lucide' global)
function initLucide() {
    try {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
            return;
        }
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons();
            return;
        }
        if (!document.getElementById("lucide-cdn-script")) {
            const script = document.createElement("script");
            script.id = "lucide-cdn-script";
            script.src = "https://unpkg.com/lucide@0.469.0";
            script.onload = () => {
                try {
                    if (window.lucide && window.lucide.createIcons) {
                        window.lucide.createIcons();
                    }
                } catch(err) {}
            };
            document.head.appendChild(script);
        }
    } catch(e) {}
}

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

// Inicialização automática do Stepper Global e Ícones Lucide
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("global-stepper-container");
    if (container && (!container.children || container.children.length === 0)) {
        const path = window.location.pathname.toLowerCase();
        if (path.includes("patrimonio")) window.renderizarStepperGlobal(1);
        else if (path.includes("familiar")) window.renderizarStepperGlobal(2);
        else if (path.includes("evolucao")) window.renderizarStepperGlobal(3);
        else if (path.includes("tributario")) window.renderizarStepperGlobal(4);
    }
    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }
});

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
        toast.innerHTML = `<span class="toast-warn" style="font-weight:700; font-size:14px; margin-right:2px;">!</span> <span>Modo Offline (Salvo localmente)</span>`;
        toast.classList.add("visible");
        setTimeout(() => toast.classList.remove("visible"), 3500);
    }
};

// =========================
// ERGONOMIA: AUTO-SELEÇÃO EM CAMPOS MONETÁRIOS E NUMÉRICOS
// =========================
function inicializarAutoSelectInputs() {
    document.addEventListener("focusin", (e) => {
        const el = e.target;
        if (!el || el.tagName !== "INPUT") return;
        if (el.type === "text" || el.type === "number") {
            setTimeout(() => {
                try {
                    if (document.activeElement === el) el.select();
                } catch (_) {}
            }, 30);
        }
    });
}

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
    if (tipo === 'aviso') { icone = '!'; corBg = 'rgba(245, 158, 11, 0.95)'; }
    if (tipo === 'info') { icone = 'i'; corBg = 'rgba(59, 130, 246, 0.95)'; }

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

// =========================
// WIDGET FLUTUANTE & MODAL DE SUPORTE TÉCNICO (ZERO EMOJIS)
// =========================
function inicializarWidgetSuporte() {
    // DESATIVADO TEMPORARIAMENTE PARA O PILOTO DA PACE CAPITAL
    // Impede a renderização do botão flutuante e do modal na interface dos assessores
    return;

    const pathAtual = window.location.pathname;
    // Não exibe na tela de login, termos ou runner de testes
    if (pathAtual.endsWith('login.html') || pathAtual.endsWith('termos_privacidade.html') || pathAtual.includes('run_tests.html')) {
        return;
    }

    if (document.getElementById('floating_support_wrapper')) return;

    // Injeta botão flutuante no canto inferior direito
    const wrapperBtn = document.createElement('div');
    wrapperBtn.className = 'floating-support-wrapper';
    wrapperBtn.id = 'floating_support_wrapper';
    wrapperBtn.innerHTML = `
        <button type="button" class="floating-support-trigger" id="btn_trigger_support" onclick="window.abrirModalSuporte()" title="Suporte Técnico Pace Capital">
            <svg class="support-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
            <span>Suporte</span>
        </button>
    `;
    document.body.appendChild(wrapperBtn);

    // Injeta modal de atendimento
    const modalDiv = document.createElement('div');
    modalDiv.className = 'support-modal-overlay hidden';
    modalDiv.id = 'modal_suporte_overlay';
    modalDiv.setAttribute('role', 'dialog');
    modalDiv.setAttribute('aria-modal', 'true');
    modalDiv.setAttribute('aria-labelledby', 'support_modal_title');
    modalDiv.innerHTML = `
        <div class="support-modal-card" id="support_modal_card">
            <div class="support-modal-header">
                <div>
                    <h3 class="support-modal-title" id="support_modal_title">Suporte Técnico</h3>
                    <p class="support-modal-subtitle">Envie sua dúvida ou relate uma inconsistência para a equipe técnica da Pace Capital.</p>
                </div>
                <button type="button" class="support-modal-close" onclick="window.fecharModalSuporte()" aria-label="Fechar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <form id="form_suporte" onsubmit="window.enviarChamadoSuporte(event)">
                <div class="support-modal-body">
                    <div id="support_alert_msg" class="support-status-alert" style="display: none;"></div>

                    <div class="support-form-group">
                        <label for="suporte_assessor">Assessor Solicitante</label>
                        <input type="text" id="suporte_assessor" class="support-form-input" readonly>
                    </div>

                    <div class="support-form-group">
                        <label for="suporte_tipo">Tipo de Solicitação</label>
                        <select id="suporte_tipo" class="support-form-select" required>
                            <option value="duvida">Dúvida no preenchimento ou regras de cálculo</option>
                            <option value="erro">Relato de erro ou inconsistência no sistema</option>
                            <option value="sugestao">Sugestão de melhoria ou nova funcionalidade</option>
                        </select>
                    </div>

                    <div class="support-form-group">
                        <label for="suporte_assunto">Assunto</label>
                        <input type="text" id="suporte_assunto" class="support-form-input" placeholder="Resumo do chamado" required maxlength="150" autocomplete="off">
                    </div>

                    <div class="support-form-group">
                        <label for="suporte_mensagem">Descrição Detalhada</label>
                        <textarea id="suporte_mensagem" class="support-form-textarea" placeholder="Descreva o que ocorreu ou a sua dúvida com detalhes..." required maxlength="3000"></textarea>
                    </div>

                    <div class="support-form-group">
                        <div class="support-label-row">
                            <label>Captura de Tela (Opcional)</label>
                            <span class="support-optional-badge">Opcional</span>
                        </div>
                        <div class="support-screenshot-wrapper" id="support_screenshot_wrapper">
                            <div id="support_screenshot_actions" class="support-screenshot-actions">
                                <button type="button" class="support-btn-action" id="btn_capturar_tela" onclick="window.capturarPrintTela()">
                                    <i data-lucide="camera"></i>
                                    <span>Capturar Tela da Página</span>
                                </button>
                                <button type="button" class="support-btn-action-secondary" onclick="document.getElementById('suporte_file_input').click()">
                                    <i data-lucide="paperclip"></i>
                                    <span>Anexar Imagem</span>
                                </button>
                                <input type="file" id="suporte_file_input" accept="image/png, image/jpeg, image/webp" style="display: none;" onchange="window.handleUploadPrint(event)">
                            </div>
                            <div id="support_screenshot_preview_container" class="support-screenshot-preview" style="display: none;">
                                <img id="support_screenshot_img" src="" alt="Captura da tela">
                                <div class="support-screenshot-info">
                                    <span class="support-screenshot-tag">Captura Anexada</span>
                                    <button type="button" class="support-btn-remove-print" onclick="window.removerPrintTela()" title="Remover captura">
                                        <i data-lucide="trash-2"></i>
                                        <span>Remover</span>
                                    </button>
                                </div>
                            </div>
                            <p class="support-screenshot-hint">Dica: Você também pode colar um print diretamente com Ctrl+V.</p>
                        </div>
                    </div>
                </div>

                <div class="support-modal-footer">
                    <button type="button" class="support-btn-cancel" onclick="window.fecharModalSuporte()">Cancelar</button>
                    <button type="submit" class="support-btn-submit" id="btn_enviar_suporte">
                        <span>Enviar Chamado</span>
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modalDiv);

    // Suporte a colar imagem (Ctrl+V) no modal
    modalDiv.addEventListener('paste', (e) => {
        const items = (e.clipboardData || window.clipboardData)?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.startsWith('image/')) {
                const blob = items[i].getAsFile();
                if (blob) {
                    window.processarArquivoPrint(blob);
                    break;
                }
            }
        }
    });

    // Fechar ao clicar fora do card
    modalDiv.addEventListener('click', (e) => {
        if (e.target === modalDiv) {
            window.fecharModalSuporte();
        }
    });

    // Fechar com tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalDiv.classList.contains('hidden')) {
            window.fecharModalSuporte();
        }
    });
}

// Carregamento dinâmico sob demanda do html2canvas caso não exista na página
window.carregarHtml2Canvas = async function() {
    if (window.html2canvas) return window.html2canvas;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.onload = () => resolve(window.html2canvas);
        script.onerror = () => reject(new Error('Não foi possível carregar a biblioteca de captura.'));
        document.head.appendChild(script);
    });
};

// Processamento e compressão da imagem do print (JPEG 0.7 max 1280px para evitar sobrecarga)
window.processarArquivoPrint = function(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1280;
            const MAX_HEIGHT = 1280;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height = Math.round(height * (MAX_WIDTH / width));
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width = Math.round(width * (MAX_HEIGHT / height));
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            window.__suporte_screenshot_data = compressedDataUrl;

            const previewImg = document.getElementById('support_screenshot_img');
            const previewContainer = document.getElementById('support_screenshot_preview_container');
            const actionsContainer = document.getElementById('support_screenshot_actions');

            if (previewImg) previewImg.src = compressedDataUrl;
            if (previewContainer) previewContainer.style.display = 'flex';
            if (actionsContainer) actionsContainer.style.display = 'none';

            if (window.lucide) window.lucide.createIcons();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

// Captura automática da viewport da página atual
window.capturarPrintTela = async function() {
    const btnCapturar = document.getElementById('btn_capturar_tela');
    const overlay = document.getElementById('modal_suporte_overlay');
    if (!overlay) return;

    if (btnCapturar) {
        btnCapturar.disabled = true;
        btnCapturar.innerHTML = `<span>Capturando tela...</span>`;
    }

    try {
        await window.carregarHtml2Canvas();
        // Oculta temporariamente o modal para tirar o print do conteúdo de fundo
        overlay.style.display = 'none';
        await new Promise(r => setTimeout(r, 200));

        const canvas = await window.html2canvas(document.body, {
            useCORS: true,
            logging: false,
            scale: 1,
            ignoreElements: (element) => element.id === 'modal_suporte_overlay' || element.id === 'btn_trigger_support'
        });

        overlay.style.display = 'flex';

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        window.__suporte_screenshot_data = compressedDataUrl;

        const previewImg = document.getElementById('support_screenshot_img');
        const previewContainer = document.getElementById('support_screenshot_preview_container');
        const actionsContainer = document.getElementById('support_screenshot_actions');

        if (previewImg) previewImg.src = compressedDataUrl;
        if (previewContainer) previewContainer.style.display = 'flex';
        if (actionsContainer) actionsContainer.style.display = 'none';

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.warn('[Captura de Tela] Aviso ao capturar tela:', err);
        overlay.style.display = 'flex';
    } finally {
        if (btnCapturar) {
            btnCapturar.disabled = false;
            btnCapturar.innerHTML = `<i data-lucide="camera"></i><span>Capturar Tela da Página</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    }
};

window.handleUploadPrint = function(event) {
    const file = event.target?.files?.[0];
    if (file) {
        window.processarArquivoPrint(file);
    }
};

window.removerPrintTela = function() {
    window.__suporte_screenshot_data = null;
    const previewContainer = document.getElementById('support_screenshot_preview_container');
    const actionsContainer = document.getElementById('support_screenshot_actions');
    const fileInput = document.getElementById('suporte_file_input');
    const previewImg = document.getElementById('support_screenshot_img');

    if (previewImg) previewImg.src = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (actionsContainer) actionsContainer.style.display = 'flex';
    if (fileInput) fileInput.value = '';
    if (window.lucide) window.lucide.createIcons();
};

window.abrirModalSuporte = function() {
    const overlay = document.getElementById('modal_suporte_overlay');
    if (!overlay) return;

    let nome = "Assessor";
    let email = "";
    try {
        const cached = localStorage.getItem("pace_user_cache");
        if (cached) {
            const u = JSON.parse(cached);
            if (u.full_name) nome = u.full_name;
            if (u.email) email = u.email;
        }
    } catch (e) {}

    const assessorInput = document.getElementById('suporte_assessor');
    if (assessorInput) {
        assessorInput.value = email ? `${nome} (${email})` : nome;
    }

    const alertMsg = document.getElementById('support_alert_msg');
    if (alertMsg) alertMsg.style.display = 'none';

    const btnSubmit = document.getElementById('btn_enviar_suporte');
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>Enviar Chamado</span>`;
    }

    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    document.getElementById('suporte_assunto')?.focus();
    if (window.lucide) window.lucide.createIcons();
};

window.fecharModalSuporte = function() {
    const overlay = document.getElementById('modal_suporte_overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
    }
};

window.enviarChamadoSuporte = async function(event) {
    event.preventDefault();
    const btnSubmit = document.getElementById('btn_enviar_suporte');
    const alertMsg = document.getElementById('support_alert_msg');

    const tipo = document.getElementById('suporte_tipo')?.value || "duvida";
    const assunto = document.getElementById('suporte_assunto')?.value.trim() || "";
    const mensagem = document.getElementById('suporte_mensagem')?.value.trim() || "";
    const printImagem = window.__suporte_screenshot_data || null;

    if (!assunto || !mensagem) return;

    let nome = "Assessor";
    let email = "";
    try {
        const cached = localStorage.getItem("pace_user_cache");
        if (cached) {
            const u = JSON.parse(cached);
            if (u.full_name) nome = u.full_name;
            if (u.email) email = u.email;
        }
    } catch (e) {}

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span>Enviando...</span>`;
    }

    try {
        if (typeof window.dbRegistrarChamadoSuporte === 'function') {
            await window.dbRegistrarChamadoSuporte({
                assessor_nome: nome,
                assessor_email: email,
                tipo: tipo,
                assunto: assunto,
                mensagem: mensagem,
                pagina_origem: window.location.pathname || "",
                print_imagem: printImagem
            });
        }

        if (alertMsg) {
            alertMsg.className = 'support-status-alert success';
            alertMsg.textContent = 'Chamado registrado e encaminhado para o Suporte Técnico Corporativo com sucesso.';
            alertMsg.style.display = 'flex';
        }

        const inputAssunto = document.getElementById('suporte_assunto');
        const inputMensagem = document.getElementById('suporte_mensagem');
        if (inputAssunto) inputAssunto.value = '';
        if (inputMensagem) inputMensagem.value = '';
        window.removerPrintTela();

        setTimeout(() => {
            window.fecharModalSuporte();
        }, 2200);

    } catch (err) {
        if (alertMsg) {
            alertMsg.className = 'support-status-alert error';
            alertMsg.textContent = 'Falha ao registrar chamado. Por favor, tente novamente.';
            alertMsg.style.display = 'flex';
        }
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<span>Enviar Chamado</span>`;
        }
    }
};

// =========================================================================
// PAINEL DE USABILIDADE DO SISTEMA & GESTÃO DE RELATÓRIOS (EXCLUSIVO MASTER)
// =========================================================================
window.__masterUsabilidadeCache = {
    usuarios: [],
    relatorios: [],
    vendas: [],
    abaAtiva: 'usuarios',
    filtroAssessorRelatorios: 'todos',
    filtroRelatorioVendas: ''
};

const PACE_PRODUTOS_VENDA_SUGESTOES = [
    "Seguro de Vida",
    "Previdência Privada (PGBL/VGBL)",
    "Holding Patrimonial",
    "Estrutura Offshore",
    "Planejamento Sucessório / Consultoria",
    "Gestão de Carteira / Investimentos",
    "Consórcio / Crédito Estruturado",
    "Outro"
];

function _formatarMoedaBRLVenda(valor, casas = 0) {
    const num = Number(valor) || 0;
    return "R$ " + num.toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
}

function _formatarDataBRVenda(isoDate) {
    if (!isoDate) return "—";
    const str = String(isoDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [ano, mes, dia] = str.split("-");
        return `${dia}/${mes}/${ano}`;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString("pt-BR");
}

function _obterDataHojeISO() {
    const d = new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function _formatarDataHoraAcessoMaster(isoStr) {
    if (!isoStr) return { dataHora: "Sem acesso registrado", relativo: "Pendente", ativo: false };
    const data = new Date(isoStr);
    if (isNaN(data.getTime())) return { dataHora: "Sem acesso registrado", relativo: "Pendente", ativo: false };

    const dataFormatada = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const horaFormatada = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const diffMs = Date.now() - data.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    let relativo = "Agora mesmo";
    if (diffDias > 0) {
        relativo = diffDias === 1 ? "Há 1 dia" : `Há ${diffDias} dias`;
    } else if (diffHoras > 0) {
        relativo = diffHoras === 1 ? "Há 1 hora" : `Há ${diffHoras} horas`;
    } else if (diffMin > 1) {
        relativo = `Há ${diffMin} min`;
    }

    return {
        dataHora: `${dataFormatada} às ${horaFormatada}`,
        relativo,
        ativo: true
    };
}

function _criarModalUsabilidadeMasterDOM() {
    let overlay = document.getElementById("modal_usabilidade_master_overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "modal_usabilidade_master_overlay";
    overlay.className = "master-usability-overlay hidden";
    overlay.style.display = "none";

    overlay.innerHTML = `
      <div class="master-usability-modal" role="dialog" aria-modal="true" aria-labelledby="master_usability_title">
        <div class="master-usability-header">
          <div class="master-usability-title-wrap">
            <div class="master-usability-badge-row">
              <span class="master-pill-badge">CONTROLE MASTER</span>
              <span class="master-subtitle-tag">Monitoramento & Auditoria de Equipe</span>
            </div>
            <h2 id="master_usability_title">Usabilidade do Sistema & Relatórios</h2>
            <p>Acompanhe quando cada usuário acessou a plataforma, quantos relatórios gerou e acesse qualquer planejamento.</p>
          </div>
          <div class="master-usability-header-actions">
            <button type="button" class="master-btn-refresh" onclick="window.recarregarDadosUsabilidadeMaster()" title="Atualizar dados">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              <span>Atualizar</span>
            </button>
            <button type="button" class="master-btn-close" onclick="window.fecharPainelUsabilidadeMaster()" aria-label="Fechar painel">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- KPIs de Usabilidade (Grid 3x2) -->
        <div class="master-kpi-grid">
          <div class="master-kpi-card">
            <span class="master-kpi-label">Total de Usuários</span>
            <strong class="master-kpi-value" id="master_kpi_total_usuarios">0</strong>
          </div>
          <div class="master-kpi-card">
            <span class="master-kpi-label">Total de Relatórios</span>
            <strong class="master-kpi-value" id="master_kpi_total_relatorios">0</strong>
          </div>
          <div class="master-kpi-card is-sales-card" id="master_kpi_card_vendas" role="button" tabindex="0" aria-label="Abrir aba de Vendas Realizadas">
            <div class="master-kpi-label-row">
              <span class="master-kpi-label">Vendas Realizadas</span>
              <span class="master-kpi-pill-sales" id="master_kpi_vendas_conv">0% conv.</span>
            </div>
            <strong class="master-kpi-value is-sales-value" id="master_kpi_total_vendas">0</strong>
            <span class="master-kpi-sub" id="master_kpi_vendas_volume">R$ 0 em volume vendido</span>
          </div>
          <div class="master-kpi-card">
            <span class="master-kpi-label">Prejuízo Médio / Cliente</span>
            <strong class="master-kpi-value" id="master_kpi_prejuizo_medio">R$ 0</strong>
          </div>
          <div class="master-kpi-card">
            <span class="master-kpi-label">Prejuízo Tributário Total</span>
            <strong class="master-kpi-value" id="master_kpi_prejuizo_total">R$ 0</strong>
          </div>
          <div class="master-kpi-card">
            <span class="master-kpi-label">Volume Patrimonial Mapeado</span>
            <strong class="master-kpi-value" id="master_kpi_patrimonio_total">R$ 0</strong>
          </div>
        </div>

        <!-- Abas de Navegação -->
        <div class="master-tabs-bar">
          <button type="button" class="master-tab-btn active" id="tab_btn_master_usuarios" data-master-tab="usuarios">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Acessos &amp; Produtividade por Usuário</span>
          </button>
          <button type="button" class="master-tab-btn" id="tab_btn_master_relatorios" data-master-tab="relatorios">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>Todos os Relatórios dos Assessores</span>
          </button>
          <button type="button" class="master-tab-btn" id="tab_btn_master_vendas" data-master-tab="vendas">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
            <span>Vendas Realizadas</span>
            <span class="master-tab-counter" id="master_tab_counter_vendas">0</span>
          </button>
        </div>

        <!-- ABA 1: USUÁRIOS E ACESSOS -->
        <div class="master-tab-content" id="master_section_usuarios">
          <div class="master-filters-row">
            <input type="text" id="master_input_busca_usuario" class="master-filter-input" placeholder="Buscar usuário por nome ou e-mail...">
            <select id="master_select_role_usuario" class="master-filter-select">
              <option value="todos">Todos os Perfis</option>
              <option value="assessor">Apenas Assessores</option>
              <option value="master">Apenas Masters</option>
            </select>
          </div>
          <div class="master-table-container">
            <table class="master-table">
              <thead>
                <tr>
                  <th>Usuário / Assessor</th>
                  <th>Perfil</th>
                  <th>Último Acesso</th>
                  <th style="text-align: center;">Relatórios</th>
                  <th style="text-align: center;">Vendas</th>
                  <th>Patrimônio Mapeado</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="master_tbody_usuarios">
                <tr><td colspan="7" class="master-empty-cell">Carregando informações de usabilidade...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ABA 2: TODOS OS RELATÓRIOS DOS ASSESSORES -->
        <div class="master-tab-content" id="master_section_relatorios" style="display: none;">
          <div class="master-filters-row">
            <input type="text" id="master_input_busca_relatorio" class="master-filter-input" placeholder="Buscar por nome do cliente ou assessor...">
            <select id="master_select_assessor_relatorio" class="master-filter-select">
              <option value="todos">Todos os Assessores</option>
            </select>
          </div>
          <div class="master-table-container">
            <table class="master-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Assessor Responsável</th>
                  <th>Data</th>
                  <th>Patrimônio Total</th>
                  <th>Prejuízo Sucessório</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="master_tbody_relatorios">
                <tr><td colspan="6" class="master-empty-cell">Carregando relatórios...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ABA 3: VENDAS REALIZADAS -->
        <div class="master-tab-content" id="master_section_vendas" style="display: none;">
          <div class="master-sales-toolbar">
            <div class="master-filters-row master-sales-filters">
              <input type="text" id="master_input_busca_venda" class="master-filter-input" placeholder="Buscar por cliente, produto, assessor ou observação...">
              <select id="master_select_assessor_venda" class="master-filter-select">
                <option value="todos">Todos os Assessores</option>
              </select>
              <select id="master_select_origem_venda" class="master-filter-select compact">
                <option value="todas">Todas as Origens</option>
                <option value="relatorio">Com Relatório</option>
                <option value="avulsa">Avulsas</option>
              </select>
              <select id="master_select_periodo_venda" class="master-filter-select compact">
                <option value="todos">Todo o Período</option>
                <option value="mes_atual">Este Mês</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>
            </div>
            <div class="master-sales-actions-bar">
              <span class="master-sales-summary" id="master_vendas_resumo_filtrado">0 vendas • R$ 0</span>
              <div class="master-sales-actions-right">
                <button type="button" class="master-btn-table-action" id="btn_master_limpar_filtro_relatorio" style="display: none;">
                  Limpar filtro do relatório
                </button>
                <button type="button" class="master-btn-new-sale" id="btn_master_registrar_venda">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Registrar Venda</span>
                </button>
              </div>
            </div>
          </div>
          <div class="master-table-container">
            <table class="master-table">
              <thead>
                <tr>
                  <th>Cliente / Origem</th>
                  <th>Produto / Serviço</th>
                  <th>Assessor</th>
                  <th>Data da Venda</th>
                  <th>Valor</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="master_tbody_vendas">
                <tr><td colspan="6" class="master-empty-cell">Carregando vendas realizadas...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            window.fecharPainelUsabilidadeMaster();
        }
    });

    // Bindings de navegação, filtros e delegação segura (anti-XSS)
    overlay.querySelectorAll("[data-master-tab]").forEach(btn => {
        btn.addEventListener("click", () => {
            window.alternarAbaPainelMaster(btn.getAttribute("data-master-tab"));
        });
    });

    const cardVendasKpi = overlay.querySelector("#master_kpi_card_vendas");
    if (cardVendasKpi) {
        const abrirAbaVendas = () => {
            window.__masterUsabilidadeCache.filtroRelatorioVendas = "";
            window.alternarAbaPainelMaster("vendas");
        };
        cardVendasKpi.addEventListener("click", abrirAbaVendas);
        cardVendasKpi.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                abrirAbaVendas();
            }
        });
    }

    overlay.querySelector("#master_input_busca_usuario")?.addEventListener("input", () => window.renderizarTabelaUsuariosMaster());
    overlay.querySelector("#master_select_role_usuario")?.addEventListener("change", () => window.renderizarTabelaUsuariosMaster());
    overlay.querySelector("#master_input_busca_relatorio")?.addEventListener("input", () => window.renderizarTabelaRelatoriosMaster());
    overlay.querySelector("#master_select_assessor_relatorio")?.addEventListener("change", () => window.renderizarTabelaRelatoriosMaster());
    overlay.querySelector("#master_input_busca_venda")?.addEventListener("input", () => window.renderizarTabelaVendasMaster());
    overlay.querySelector("#master_select_assessor_venda")?.addEventListener("change", () => window.renderizarTabelaVendasMaster());
    overlay.querySelector("#master_select_origem_venda")?.addEventListener("change", () => window.renderizarTabelaVendasMaster());
    overlay.querySelector("#master_select_periodo_venda")?.addEventListener("change", () => window.renderizarTabelaVendasMaster());

    overlay.querySelector("#btn_master_limpar_filtro_relatorio")?.addEventListener("click", () => {
        window.__masterUsabilidadeCache.filtroRelatorioVendas = "";
        window.renderizarTabelaVendasMaster();
    });

    overlay.querySelector("#btn_master_registrar_venda")?.addEventListener("click", () => {
        window.abrirModalVenda({
            isMaster: true,
            usuariosDisponiveis: window.__masterUsabilidadeCache.usuarios || [],
            relatoriosDisponiveis: window.__masterUsabilidadeCache.relatorios || [],
            onSaved: async () => {
                await window.recarregarDadosUsabilidadeMaster();
                if (typeof window.carregarDashboard === "function") {
                    window.carregarDashboard();
                }
            }
        });
    });

    // Delegação segura: Tabela de Usuários
    overlay.querySelector("#master_tbody_usuarios")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        const uid = btn.getAttribute("data-user-id") || "";
        const nome = btn.getAttribute("data-user-name") || "";
        if (action === "ver-relatorios-usuario") {
            window.filtrarRelatoriosDoUsuarioNoPainelMaster(nome, uid);
        } else if (action === "ver-vendas-usuario") {
            window.filtrarVendasDoUsuarioNoPainelMaster(nome, uid);
        }
    });

    // Delegação segura: Tabela de Relatórios
    overlay.querySelector("#master_tbody_relatorios")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        const repId = btn.getAttribute("data-relatorio-id") || "";
        if (!repId) return;

        if (action === "abrir-relatorio-editar") {
            window.abrirRelatorioPeloPainelMaster(repId, "editar");
        } else if (action === "abrir-relatorio-pdf") {
            window.abrirRelatorioPeloPainelMaster(repId, "pdf");
        } else if (action === "nova-venda-relatorio") {
            const rep = (window.__masterUsabilidadeCache.relatorios || []).find(r => String(r.id) === String(repId));
            window.abrirModalVenda({
                relatorio: rep || null,
                isMaster: true,
                usuariosDisponiveis: window.__masterUsabilidadeCache.usuarios || [],
                relatoriosDisponiveis: window.__masterUsabilidadeCache.relatorios || [],
                onSaved: async () => {
                    await window.recarregarDadosUsabilidadeMaster();
                    if (typeof window.carregarDashboard === "function") {
                        window.carregarDashboard();
                    }
                }
            });
        } else if (action === "filtrar-vendas-relatorio") {
            window.__masterUsabilidadeCache.filtroRelatorioVendas = repId;
            const selectAssessorVenda = document.getElementById("master_select_assessor_venda");
            const inputBuscaVenda = document.getElementById("master_input_busca_venda");
            if (selectAssessorVenda) selectAssessorVenda.value = "todos";
            if (inputBuscaVenda) inputBuscaVenda.value = "";
            window.alternarAbaPainelMaster("vendas");
        }
    });

    // Delegação segura: Tabela de Vendas
    overlay.querySelector("#master_tbody_vendas")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        const vendaId = btn.getAttribute("data-venda-id") || "";
        if (!vendaId) return;
        const venda = (window.__masterUsabilidadeCache.vendas || []).find(v => String(v.id) === String(vendaId));
        if (!venda) return;

        if (action === "editar-venda") {
            window.abrirModalVenda({
                venda,
                isMaster: true,
                usuariosDisponiveis: window.__masterUsabilidadeCache.usuarios || [],
                relatoriosDisponiveis: window.__masterUsabilidadeCache.relatorios || [],
                onSaved: async () => {
                    await window.recarregarDadosUsabilidadeMaster();
                    if (typeof window.carregarDashboard === "function") {
                        window.carregarDashboard();
                    }
                }
            });
        } else if (action === "excluir-venda") {
            window.confirmarExclusaoVenda(venda, async () => {
                await window.recarregarDadosUsabilidadeMaster();
                if (typeof window.carregarDashboard === "function") {
                    window.carregarDashboard();
                }
            });
        }
    });

    document.body.appendChild(overlay);
    return overlay;
}

window.alternarAbaPainelMaster = function(aba) {
    const abaNormalizada = (aba === "relatorios" || aba === "vendas") ? aba : "usuarios";
    window.__masterUsabilidadeCache.abaAtiva = abaNormalizada;

    const abas = [
        { id: "usuarios", btn: "tab_btn_master_usuarios", sec: "master_section_usuarios" },
        { id: "relatorios", btn: "tab_btn_master_relatorios", sec: "master_section_relatorios" },
        { id: "vendas", btn: "tab_btn_master_vendas", sec: "master_section_vendas" }
    ];

    abas.forEach(item => {
        const ativo = item.id === abaNormalizada;
        document.getElementById(item.btn)?.classList.toggle("active", ativo);
        const secEl = document.getElementById(item.sec);
        if (secEl) {
            secEl.style.display = ativo ? "block" : "none";
            if (ativo) secEl.scrollTop = 0;
        }
    });

    if (abaNormalizada === "relatorios") {
        window.renderizarTabelaRelatoriosMaster();
    } else if (abaNormalizada === "vendas") {
        window.renderizarTabelaVendasMaster();
    } else {
        window.renderizarTabelaUsuariosMaster();
    }
};

window.filtrarVendasDoUsuarioNoPainelMaster = function(nomeAssessor, userId) {
    window.__masterUsabilidadeCache.filtroRelatorioVendas = "";
    const select = document.getElementById("master_select_assessor_venda");
    const buscaInput = document.getElementById("master_input_busca_venda");
    if (buscaInput) buscaInput.value = "";
    if (select) {
        const targetId = String(userId || "").trim();
        const targetNome = String(nomeAssessor || "").toLowerCase().trim();
        const matchOption = Array.from(select.options).find(opt =>
            (targetId && opt.value === targetId) ||
            (targetNome && opt.value.toLowerCase() === `nome:${targetNome}`) ||
            (targetNome && opt.textContent.toLowerCase().trim() === targetNome)
        );
        if (matchOption) {
            select.value = matchOption.value;
        } else {
            select.value = "todos";
            if (buscaInput && nomeAssessor) buscaInput.value = nomeAssessor;
        }
    }
    window.alternarAbaPainelMaster("vendas");
};

window.filtrarRelatoriosDoUsuarioNoPainelMaster = function(nomeAssessor, userId) {
    const select = document.getElementById("master_select_assessor_relatorio");
    const buscaInput = document.getElementById("master_input_busca_relatorio");
    if (buscaInput) buscaInput.value = "";
    if (select) {
        const targetId = String(userId || "").trim();
        const targetNome = String(nomeAssessor || "").toLowerCase().trim();
        const matchOption = Array.from(select.options).find(opt =>
            (targetId && opt.value === targetId) ||
            (targetNome && opt.value.toLowerCase() === `nome:${targetNome}`) ||
            (targetNome && opt.textContent.toLowerCase().trim() === targetNome)
        );
        if (matchOption) {
            select.value = matchOption.value;
        } else {
            select.value = "todos";
            if (buscaInput && nomeAssessor) buscaInput.value = nomeAssessor;
        }
    }
    window.alternarAbaPainelMaster("relatorios");
};

window.renderizarTabelaUsuariosMaster = function() {
    const tbody = document.getElementById("master_tbody_usuarios");
    if (!tbody) return;

    const usuarios = window.__masterUsabilidadeCache.usuarios || [];
    const busca = (document.getElementById("master_input_busca_usuario")?.value || "").toLowerCase().trim();
    const roleFiltro = document.getElementById("master_select_role_usuario")?.value || "todos";

    const filtrados = usuarios.filter(u => {
        const nome = (u.full_name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const matchBusca = !busca || nome.includes(busca) || email.includes(busca);
        const matchRole = roleFiltro === "todos" || (u.role || "assessor") === roleFiltro;
        return matchBusca && matchRole;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="master-empty-cell">Nenhum usuário encontrado para os filtros selecionados.</td></tr>`;
        return;
    }

    const esc = window.escapeHTML;
    let html = "";

    filtrados.forEach(u => {
        const nome = u.full_name || "Assessor";
        const email = u.email || "—";
        const isMasterUser = u.role === "master";
        const partes = nome.trim().split(" ");
        const iniciais = partes.length >= 2
            ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
            : nome.substring(0, 2).toUpperCase();

        const infoAcesso = _formatarDataHoraAcessoMaster(u.ultimo_acesso);
        const qtdRelatorios = Number(u.total_relatorios) || 0;
        const qtdVendas = Number(u.total_vendas) || 0;
        const volVendas = _formatarMoedaBRLVenda(u.valor_total_vendas || 0, 0);
        const patTotal = _formatarMoedaBRLVenda(u.total_patrimonio || 0, 0);
        const safeNomeAttr = esc(nome);
        const safeIdAttr = esc(u.id || "");

        html += `
          <tr>
            <td>
              <div class="master-user-cell">
                <div class="master-user-avatar">${esc(iniciais)}</div>
                <div class="master-user-meta">
                  <strong>${esc(nome)}</strong>
                  <span>${esc(email)}</span>
                </div>
              </div>
            </td>
            <td>
              <span class="master-role-badge ${isMasterUser ? 'role-master' : 'role-assessor'}">
                ${isMasterUser ? 'MASTER' : 'Assessor'}
              </span>
            </td>
            <td>
              <div class="master-access-cell">
                <span class="master-access-date">${esc(infoAcesso.dataHora)}</span>
                <span class="master-access-status ${infoAcesso.ativo ? 'status-online' : 'status-pending'}">${esc(infoAcesso.relativo)}</span>
              </div>
            </td>
            <td style="text-align: center;">
              <span class="master-report-count-badge ${qtdRelatorios > 0 ? 'has-reports' : ''}">${qtdRelatorios}</span>
            </td>
            <td style="text-align: center;">
              <button type="button" class="master-sale-count-btn ${qtdVendas > 0 ? 'has-sales' : ''}" data-action="ver-vendas-usuario" data-user-id="${safeIdAttr}" data-user-name="${safeNomeAttr}" title="Filtrar vendas de ${safeNomeAttr}">
                <span class="master-sale-count-num">${qtdVendas}</span>
                ${qtdVendas > 0 ? `<span class="master-sale-count-vol">${esc(volVendas)}</span>` : ""}
              </button>
            </td>
            <td style="font-weight: 600; color: #09090b;">${esc(patTotal)}</td>
            <td style="text-align: right;">
              <button type="button" class="master-btn-table-action" data-action="ver-relatorios-usuario" data-user-id="${safeIdAttr}" data-user-name="${safeNomeAttr}">
                Ver Relatórios (${qtdRelatorios})
              </button>
            </td>
          </tr>
        `;
    });

    tbody.innerHTML = html;
};

window.renderizarTabelaRelatoriosMaster = function() {
    const tbody = document.getElementById("master_tbody_relatorios");
    if (!tbody) return;

    const usuarios = window.__masterUsabilidadeCache.usuarios || [];
    const relatorios = window.__masterUsabilidadeCache.relatorios || [];
    const vendas = window.__masterUsabilidadeCache.vendas || [];
    const busca = document.getElementById("master_input_busca_relatorio")?.value || "";
    const filtroAssessor = document.getElementById("master_select_assessor_relatorio")?.value || "todos";

    const filtrados = (typeof window.filtrarRelatoriosPainelMaster === "function")
        ? window.filtrarRelatoriosPainelMaster(relatorios, usuarios, { filtroAssessor, busca })
        : relatorios.filter(rep => {
            if (!rep) return false;
            if (filtroAssessor === "todos") return true;
            return String(rep.userId || "") === filtroAssessor ||
                String(rep.nomeAssessor || "").toLowerCase().trim() === filtroAssessor.toLowerCase().trim();
        });

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="master-empty-cell">Nenhum relatório encontrado para os critérios selecionados.</td></tr>`;
        return;
    }

    const metricasVendas = typeof window.calcularMetricasVendas === "function"
        ? window.calcularMetricasVendas(vendas, relatorios)
        : { porRelatorio: {} };
    const vendasPorRelatorio = metricasVendas.porRelatorio || {};

    const esc = window.escapeHTML;
    let html = "";
    const usuariosById = new Map();
    usuarios.forEach(u => {
        if (u && u.id) usuariosById.set(String(u.id), u);
    });

    filtrados.forEach(rep => {
        const safeId = String(rep.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
        const nomeCliente = rep.nomeCliente || "Cliente";
        const donoUsuario = rep.userId ? usuariosById.get(String(rep.userId)) : null;
        const nomeRaw = String(rep.nomeAssessor || "").trim();
        const nomeAssessor = (nomeRaw && nomeRaw.toLowerCase() !== "assessor")
            ? nomeRaw
            : (donoUsuario?.full_name || "Assessor");
        const pat = _formatarMoedaBRLVenda(rep.totalPatrimonio || 0, 0);
        const prej = _formatarMoedaBRLVenda(rep.prejuizoTributario || 0, 0);

        const statsVenda = vendasPorRelatorio[String(rep.id)] || null;
        const badgeVendaHtml = statsVenda && statsVenda.quantidade > 0
            ? `<button type="button" class="master-report-sale-pill" data-action="filtrar-vendas-relatorio" data-relatorio-id="${esc(safeId)}" title="Ver vendas vinculadas a este planejamento">✓ ${statsVenda.quantidade} ${statsVenda.quantidade === 1 ? 'venda' : 'vendas'} • ${esc(_formatarMoedaBRLVenda(statsVenda.valorTotal, 0))}</button>`
            : "";

        let dataStr = rep.dataReuniao || "";
        if (rep.dataCriacao) {
            const d = new Date(rep.dataCriacao);
            if (!isNaN(d.getTime())) {
                dataStr = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            }
        }

        html += `
          <tr>
            <td>
              <div class="master-client-cell-wrap">
                <strong style="color: #09090b;">${esc(nomeCliente)}</strong>
                ${badgeVendaHtml}
              </div>
            </td>
            <td><span class="master-advisor-pill">${esc(nomeAssessor)}</span></td>
            <td style="color: #64748b; font-size: 12.5px;">${esc(dataStr || "—")}</td>
            <td style="font-weight: 600; color: #09090b;">${esc(pat)}</td>
            <td style="font-weight: 600; color: #dc2626;">${esc(prej)}</td>
            <td style="text-align: right;">
              <div class="master-report-actions">
                <button type="button" class="master-btn-table-action sale-accent" data-action="nova-venda-relatorio" data-relatorio-id="${esc(safeId)}" title="Registrar venda para este planejamento">
                  + Venda
                </button>
                <button type="button" class="master-btn-table-action" data-action="abrir-relatorio-editar" data-relatorio-id="${esc(safeId)}">
                  Abrir Simulação
                </button>
                <button type="button" class="master-btn-table-action primary" data-action="abrir-relatorio-pdf" data-relatorio-id="${esc(safeId)}">
                  Ver PDF
                </button>
              </div>
            </td>
          </tr>
        `;
    });

    tbody.innerHTML = html;
};

window.renderizarTabelaVendasMaster = function() {
    const tbody = document.getElementById("master_tbody_vendas");
    if (!tbody) return;

    const usuarios = window.__masterUsabilidadeCache.usuarios || [];
    const vendas = window.__masterUsabilidadeCache.vendas || [];
    const busca = document.getElementById("master_input_busca_venda")?.value || "";
    const filtroAssessor = document.getElementById("master_select_assessor_venda")?.value || "todos";
    const origem = document.getElementById("master_select_origem_venda")?.value || "todas";
    const periodo = document.getElementById("master_select_periodo_venda")?.value || "todos";
    const relatorioIdFiltro = window.__masterUsabilidadeCache.filtroRelatorioVendas || "";

    const btnLimparRel = document.getElementById("btn_master_limpar_filtro_relatorio");
    if (btnLimparRel) {
        btnLimparRel.style.display = relatorioIdFiltro ? "inline-flex" : "none";
    }

    const filtradas = (typeof window.filtrarVendasPainel === "function")
        ? window.filtrarVendasPainel(vendas, usuarios, {
            busca,
            filtroAssessor,
            origem,
            periodo,
            relatorioId: relatorioIdFiltro
        })
        : vendas;

    const volumeFiltrado = filtradas.reduce((acc, v) => acc + (Number(v.valorVenda) || 0), 0);
    const resumoEl = document.getElementById("master_vendas_resumo_filtrado");
    if (resumoEl) {
        const sufixoRel = relatorioIdFiltro ? " (filtrado por relatório)" : "";
        resumoEl.textContent = `${filtradas.length} ${filtradas.length === 1 ? 'venda' : 'vendas'} • ${_formatarMoedaBRLVenda(volumeFiltrado, 0)}${sufixoRel}`;
    }

    if (filtradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="master-empty-cell">Nenhuma venda registrada para os critérios selecionados.</td></tr>`;
        return;
    }

    const esc = window.escapeHTML;
    const usuariosById = new Map();
    usuarios.forEach(u => {
        if (u && u.id) usuariosById.set(String(u.id), u);
    });

    let html = "";
    filtradas.forEach(v => {
        const safeId = String(v.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
        const donoUsuario = v.userId ? usuariosById.get(String(v.userId)) : null;
        const nomeRaw = String(v.nomeAssessor || "").trim();
        const nomeAssessor = (nomeRaw && nomeRaw.toLowerCase() !== "assessor")
            ? nomeRaw
            : (donoUsuario?.full_name || "Assessor");
        const isVinculada = Boolean(v.relatorioId);
        const obsTrim = String(v.observacao || "").trim();
        const obsCurta = obsTrim.length > 68 ? `${obsTrim.slice(0, 65)}...` : obsTrim;

        html += `
          <tr>
            <td>
              <div class="master-client-cell-wrap">
                <strong style="color: #09090b;">${esc(v.nomeCliente || "Cliente")}</strong>
                <span class="master-origin-pill ${isVinculada ? 'is-report' : 'is-standalone'}">
                  ${isVinculada ? 'Relatório' : 'Avulsa'}
                </span>
              </div>
              ${obsCurta ? `<div class="master-sale-obs-preview" title="${esc(obsTrim)}">${esc(obsCurta)}</div>` : ""}
            </td>
            <td><span class="master-product-tag">${esc(v.produto || "—")}</span></td>
            <td><span class="master-advisor-pill">${esc(nomeAssessor)}</span></td>
            <td class="master-nowrap" style="color: #64748b; font-size: 12.5px;">${esc(_formatarDataBRVenda(v.dataVenda))}</td>
            <td class="master-nowrap" style="font-weight: 700; color: #059669;">${esc(_formatarMoedaBRLVenda(v.valorVenda, 2))}</td>
            <td style="text-align: right;">
              <div class="master-report-actions">
                <button type="button" class="master-btn-table-action" data-action="editar-venda" data-venda-id="${esc(safeId)}">
                  Editar
                </button>
                <button type="button" class="master-btn-table-action danger" data-action="excluir-venda" data-venda-id="${esc(safeId)}">
                  Excluir
                </button>
              </div>
            </td>
          </tr>
        `;
    });

    tbody.innerHTML = html;
};

window.abrirRelatorioPeloPainelMaster = async function(repId, modo = "editar") {
    const relatorios = window.__masterUsabilidadeCache.relatorios || [];
    const rep = relatorios.find(r => String(r.id) === String(repId));
    if (!rep) return;

    sessionStorage.clear();

    if (typeof window.normalizarSessao === "function" && rep.dadosSessao) {
        window.normalizarSessao(rep.dadosSessao, rep.totalPatrimonio);
    } else if (rep.dadosSessao && typeof rep.dadosSessao === "object") {
        let ds = rep.dadosSessao;
        if (ds.patrimonio && ds.patrimonio.dados) {
            sessionStorage.setItem("patrimonio_dados", JSON.stringify(ds.patrimonio.dados));
            const tot = ds.patrimonio.total ?? rep.totalPatrimonio ?? 0;
            sessionStorage.setItem("total_patrimonio", tot);
            const dp = ds.patrimonio.dados;
            const off = (window.AppState && typeof window.AppState.obterOffshoreBRL === "function")
                ? window.AppState.obterOffshoreBRL(dp)
                : (Number(dp.offshore_brl) || (dp.offshore_modo === "usd" ? ((Number(dp.offshore) || 0) * (Number(dp.offshore_ptax) || 1)) : (Number(dp.offshore) || 0)));
            sessionStorage.setItem("total_patrimonio_nacional", ds.patrimonio.totalNacional ?? Math.max(0, tot - off));
            if (ds.familia) sessionStorage.setItem("familia", JSON.stringify(ds.familia));
            if (ds.evolucao?.inputs) sessionStorage.setItem("evolucao_inputs", JSON.stringify(ds.evolucao.inputs));
            if (ds.evolucao?.dados) sessionStorage.setItem("evolucao_dados", JSON.stringify(ds.evolucao.dados));
            if (ds.tributario?.inputs) sessionStorage.setItem("tributario_inputs", JSON.stringify(ds.tributario.inputs));
            if (ds.tributario?.prejuizoFinal) sessionStorage.setItem("prejuizo_final", JSON.stringify(ds.tributario.prejuizoFinal));
            if (ds.meta?.nomeAssessor) sessionStorage.setItem("nome_assessor", ds.meta.nomeAssessor);
            if (ds.meta?.dataReuniao) sessionStorage.setItem("data_reuniao", ds.meta.dataReuniao);
        } else {
            Object.keys(ds).forEach(k => {
                if (k === "current_report_id") return;
                const v = ds[k];
                if (v !== null && v !== undefined) {
                    sessionStorage.setItem(k, typeof v === "object" ? JSON.stringify(v) : v);
                }
            });
            const tot = ds.total_patrimonio ?? rep.totalPatrimonio ?? 0;
            sessionStorage.setItem("total_patrimonio", tot);
            if (!sessionStorage.getItem("total_patrimonio_nacional")) {
                let off = 0;
                try {
                    const dp = JSON.parse(sessionStorage.getItem("patrimonio_dados") || "{}");
                    off = (window.AppState && typeof window.AppState.obterOffshoreBRL === "function")
                        ? window.AppState.obterOffshoreBRL(dp)
                        : (Number(dp.offshore_brl) || (dp.offshore_modo === "usd" ? ((Number(dp.offshore) || 0) * (Number(dp.offshore_ptax) || 1)) : (Number(dp.offshore) || 0)));
                } catch (_) {}
                sessionStorage.setItem("total_patrimonio_nacional", Math.max(0, tot - off));
            }
        }
    } else {
        sessionStorage.setItem("total_patrimonio", rep.totalPatrimonio || 0);
        if (rep.nomeCliente) sessionStorage.setItem("familia", JSON.stringify({ nome: rep.nomeCliente }));
    }

    if (rep.nomeAssessor && !sessionStorage.getItem("nome_assessor")) {
        sessionStorage.setItem("nome_assessor", rep.nomeAssessor);
    }
    if (rep.userId) {
        sessionStorage.setItem("current_report_owner_id", rep.userId);
    }

    let currentUid = "";
    try {
        if (typeof window.authObterUsuario === "function") {
            const u = await window.authObterUsuario();
            if (u && u.id) currentUid = String(u.id);
        }
        if (!currentUid) {
            const cached = JSON.parse(localStorage.getItem("pace_user_cache") || "{}");
            if (cached && cached.id) currentUid = String(cached.id);
        }
    } catch (_) {}

    const ehRelatorioDeOutroAssessor = !currentUid || !rep.userId || String(rep.userId) !== String(currentUid);
    if (ehRelatorioDeOutroAssessor) {
        sessionStorage.setItem("modo_auditoria_master", "true");
        sessionStorage.setItem("auditoria_assessor_nome", rep.nomeAssessor || "Assessor");
    }

    sessionStorage.setItem("current_report_id", rep.id);
    sessionStorage.setItem("simulacao_ativa", "true");

    window.fecharPainelUsabilidadeMaster();

    if (modo === "pdf") {
        window.location.href = "tributario.html?preview=true";
    } else {
        window.location.href = "patrimonio.html";
    }
};

window.recarregarDadosUsabilidadeMaster = async function() {
    const tbodyU = document.getElementById("master_tbody_usuarios");
    if (tbodyU) {
        tbodyU.innerHTML = `<tr><td colspan="7" class="master-empty-cell">Sincronizando dados de usabilidade, relatórios e vendas...</td></tr>`;
    }

    try {
        const res = typeof window.dbObterUsabilidadeUsuarios === "function"
            ? await window.dbObterUsabilidadeUsuarios()
            : { usuarios: [], relatorios: [], vendas: [] };

        const usuarios = res.usuarios || [];
        const relatorios = res.relatorios || [];
        const vendas = res.vendas || [];

        window.__masterUsabilidadeCache.usuarios = usuarios;
        window.__masterUsabilidadeCache.relatorios = relatorios;
        window.__masterUsabilidadeCache.vendas = vendas;

        // Atualiza KPIs
        const totalUsuarios = usuarios.length;
        const totalRelatorios = relatorios.length;
        const patrimonioTotal = relatorios.reduce((acc, r) => acc + (Number(r.totalPatrimonio) || 0), 0);
        const prejuizoTotal = relatorios.reduce((acc, r) => acc + (Number(r.prejuizoTributario) || 0), 0);
        const prejuizoMedio = totalRelatorios > 0 ? Math.round(prejuizoTotal / totalRelatorios) : 0;

        const metricasVendas = typeof window.calcularMetricasVendas === "function"
            ? window.calcularMetricasVendas(vendas, relatorios)
            : { totalVendas: vendas.length, valorTotalVendas: 0, taxaConversao: 0 };

        const elTotalU = document.getElementById("master_kpi_total_usuarios");
        const elTotalR = document.getElementById("master_kpi_total_relatorios");
        const elTotalV = document.getElementById("master_kpi_total_vendas");
        const elVolV = document.getElementById("master_kpi_vendas_volume");
        const elConvV = document.getElementById("master_kpi_vendas_conv");
        const elTabCounterV = document.getElementById("master_tab_counter_vendas");
        const elPrejMedio = document.getElementById("master_kpi_prejuizo_medio");
        const elPrejTotal = document.getElementById("master_kpi_prejuizo_total");
        const elPatTotal = document.getElementById("master_kpi_patrimonio_total");

        if (elTotalU) elTotalU.textContent = String(totalUsuarios);
        if (elTotalR) elTotalR.textContent = String(totalRelatorios);
        if (elTotalV) elTotalV.textContent = String(metricasVendas.totalVendas);
        if (elVolV) elVolV.textContent = `${_formatarMoedaBRLVenda(metricasVendas.valorTotalVendas, 0)} em volume vendido`;
        if (elConvV) elConvV.textContent = `${String(metricasVendas.taxaConversao).replace(".", ",")}% conv.`;
        if (elTabCounterV) elTabCounterV.textContent = String(metricasVendas.totalVendas);

        // Formatação unificada para garantir alinhamento visual
        if (elPrejMedio) elPrejMedio.innerHTML = `<span>R$</span> <span>${prejuizoMedio.toLocaleString("pt-BR")}</span>`;
        if (elPrejTotal) elPrejTotal.innerHTML = `<span>R$</span> <span>${Math.round(prejuizoTotal).toLocaleString("pt-BR")}</span>`;
        if (elPatTotal) elPatTotal.innerHTML = `<span>R$</span> <span>${Math.round(patrimonioTotal).toLocaleString("pt-BR")}</span>`;

        // Popula selects de assessores nas abas de relatórios e vendas usando userId canônico
        const popularSelectAssessores = (selectEl, totalItens, registrosExtras) => {
            if (!selectEl) return;
            const valorAnterior = selectEl.value || "todos";
            const opcoesSelect = [];
            const idsMapeados = new Set();

            usuarios
                .slice()
                .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""), "pt-BR"))
                .forEach(u => {
                    if (!u || !u.id) return;
                    const idStr = String(u.id);
                    idsMapeados.add(idStr);
                    opcoesSelect.push({ value: idStr, label: u.full_name || "Assessor" });
                });

            const nomesOrfaos = new Set();
            (registrosExtras || []).forEach(r => {
                if (!r) return;
                const uidStr = r.userId ? String(r.userId) : "";
                if (!uidStr || !idsMapeados.has(uidStr)) {
                    const nomeR = String(r.nomeAssessor || "").trim();
                    if (nomeR && !nomesOrfaos.has(nomeR.toLowerCase())) {
                        nomesOrfaos.add(nomeR.toLowerCase());
                        opcoesSelect.push({ value: `nome:${nomeR}`, label: nomeR });
                    }
                }
            });

            let opts = `<option value="todos">Todos os Assessores (${totalItens})</option>`;
            opcoesSelect.forEach(opt => {
                opts += `<option value="${window.escapeHTML(opt.value)}">${window.escapeHTML(opt.label)}</option>`;
            });
            selectEl.innerHTML = opts;
            if (opcoesSelect.some(o => o.value === valorAnterior)) {
                selectEl.value = valorAnterior;
            }
        };

        popularSelectAssessores(document.getElementById("master_select_assessor_relatorio"), relatorios.length, relatorios);
        popularSelectAssessores(document.getElementById("master_select_assessor_venda"), vendas.length, vendas);

        window.renderizarTabelaUsuariosMaster();
        window.renderizarTabelaRelatoriosMaster();
        window.renderizarTabelaVendasMaster();
    } catch (e) {
        console.error("[recarregarDadosUsabilidadeMaster] Erro:", e);
        if (tbodyU) {
            tbodyU.innerHTML = `<tr><td colspan="7" class="master-empty-cell">Não foi possível carregar os dados no momento.</td></tr>`;
        }
    }
};

window.abrirPainelUsabilidadeMaster = async function() {
    // Valida se o usuário atual possui permissão Master estritamente via sessão autenticada
    let isMaster = false;
    try {
        if (typeof window.authObterUsuario === "function") {
            const u = await window.authObterUsuario();
            if (u && typeof window.authIsMaster === "function" && window.authIsMaster(u)) {
                isMaster = true;
            }
        }
    } catch (e) {}

    if (!isMaster) {
        if (typeof window.confirmarAcaoCustom === "function") {
            window.confirmarAcaoCustom({
                titulo: "Acesso Restrito",
                mensagem: "Apenas usuários com perfil Master possuem acesso ao painel de usabilidade do sistema.",
                textoConfirmar: "Entendi",
                somenteAviso: true
            });
        }
        return;
    }

    const overlay = _criarModalUsabilidadeMasterDOM();
    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
    await window.recarregarDadosUsabilidadeMaster();
};

window.fecharPainelUsabilidadeMaster = function() {
    const overlay = document.getElementById("modal_usabilidade_master_overlay");
    if (overlay) {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
    }
};

// =========================================================================
// MODAIS REUTILIZÁVEIS DE VENDAS (CADASTRO / EDIÇÃO E LISTAGEM DO ASSESSOR)
// =========================================================================

window.__paceVendaModalState = {
    vendaId: null,
    isMaster: false,
    onSaved: null,
    relatoriosMap: new Map(),
    usuariosMap: new Map()
};

function _criarModalVendaDOM() {
    let overlay = document.getElementById("modal_venda_pace_overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "modal_venda_pace_overlay";
    overlay.className = "pace-venda-overlay hidden";
    overlay.style.display = "none";

    const datalistOptions = PACE_PRODUTOS_VENDA_SUGESTOES
        .map(item => `<option value="${window.escapeHTML(item)}"></option>`)
        .join("");

    overlay.innerHTML = `
      <div class="pace-venda-modal" role="dialog" aria-modal="true" aria-labelledby="pace_venda_modal_title">
        <div class="pace-venda-header">
          <div>
            <span class="pace-venda-badge" id="pace_venda_modal_badge">NOVA VENDA</span>
            <h3 id="pace_venda_modal_title">Registrar Venda Realizada</h3>
            <p id="pace_venda_modal_subtitle">Vincule a um planejamento patrimonial ou registre uma venda avulsa.</p>
          </div>
          <button type="button" class="master-btn-close" id="btn_fechar_modal_venda" aria-label="Fechar janela de venda">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form id="form_pace_venda" class="pace-venda-form" novalidate>
          <div class="pace-venda-alert" id="pace_venda_alert" style="display: none;"></div>

          <div class="pace-venda-field">
            <label for="venda_input_relatorio">Planejamento Vinculado (Opcional)</label>
            <select id="venda_input_relatorio" class="pace-venda-control">
              <option value="">Venda avulsa (sem relatório vinculado)</option>
            </select>
          </div>

          <div class="pace-venda-grid-2">
            <div class="pace-venda-field">
              <label for="venda_input_cliente">Nome do Cliente *</label>
              <input type="text" id="venda_input_cliente" class="pace-venda-control" maxlength="200" placeholder="Ex.: Família Oliveira" required>
            </div>
            <div class="pace-venda-field">
              <label for="venda_input_produto">Produto / Serviço *</label>
              <input type="text" id="venda_input_produto" class="pace-venda-control" list="pace_produtos_venda_datalist" maxlength="120" placeholder="Ex.: Seguro de Vida, Holding..." required autocomplete="off">
              <datalist id="pace_produtos_venda_datalist">${datalistOptions}</datalist>
            </div>
          </div>

          <div class="pace-venda-grid-2">
            <div class="pace-venda-field">
              <label for="venda_input_valor">Valor da Venda (R$) *</label>
              <input type="text" id="venda_input_valor" class="pace-venda-control" inputmode="decimal" placeholder="Ex.: R$ 250.000,00" required>
            </div>
            <div class="pace-venda-field">
              <label for="venda_input_data">Data da Venda *</label>
              <input type="date" id="venda_input_data" class="pace-venda-control" required>
            </div>
          </div>

          <div class="pace-venda-field" id="venda_group_assessor" style="display: none;">
            <label for="venda_input_assessor">Assessor Responsável</label>
            <select id="venda_input_assessor" class="pace-venda-control"></select>
          </div>

          <div class="pace-venda-field">
            <label for="venda_input_observacao">Observações (Opcional)</label>
            <textarea id="venda_input_observacao" class="pace-venda-control pace-venda-textarea" maxlength="1000" rows="3" placeholder="Detalhes comerciais, seguradora/instituição, condição fechada..."></textarea>
          </div>

          <div class="pace-venda-footer">
            <button type="button" class="master-btn-table-action" id="btn_cancelar_modal_venda">Cancelar</button>
            <button type="submit" class="master-btn-new-sale" id="btn_salvar_modal_venda">Salvar Venda</button>
          </div>
        </form>
      </div>
    `;

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) window.fecharModalVenda();
    });
    overlay.querySelector("#btn_fechar_modal_venda")?.addEventListener("click", () => window.fecharModalVenda());
    overlay.querySelector("#btn_cancelar_modal_venda")?.addEventListener("click", () => window.fecharModalVenda());

    const selectRel = overlay.querySelector("#venda_input_relatorio");
    const inputCliente = overlay.querySelector("#venda_input_cliente");
    const selectAssessor = overlay.querySelector("#venda_input_assessor");

    selectRel?.addEventListener("change", () => {
        const rep = window.__paceVendaModalState.relatoriosMap.get(selectRel.value);
        if (rep) {
            if (inputCliente && (!inputCliente.value.trim() || inputCliente.dataset.autofilled === "true")) {
                inputCliente.value = rep.nomeCliente || "";
                inputCliente.dataset.autofilled = "true";
            }
            if (selectAssessor && rep.userId && Array.from(selectAssessor.options).some(o => o.value === String(rep.userId))) {
                selectAssessor.value = String(rep.userId);
            }
        }
    });

    inputCliente?.addEventListener("input", () => {
        inputCliente.dataset.autofilled = "false";
    });

    const inputValor = overlay.querySelector("#venda_input_valor");
    inputValor?.addEventListener("blur", () => {
        const num = typeof window.sanitizarNumero === "function"
            ? window.sanitizarNumero(inputValor.value, 0)
            : (parseFloat(String(inputValor.value || "").replace(/[^\d,.-]/g, "").replace(",", ".")) || 0);
        const seguro = Math.max(0, num);
        inputValor.value = _formatarMoedaBRLVenda(seguro, 2);
    });

    overlay.querySelector("#form_pace_venda")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await _submeterFormularioVenda();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const ov = document.getElementById("modal_venda_pace_overlay");
            if (ov && !ov.classList.contains("hidden")) {
                window.fecharModalVenda();
            }
        }
    });

    document.body.appendChild(overlay);
    return overlay;
}

async function _submeterFormularioVenda() {
    const alertEl = document.getElementById("pace_venda_alert");
    const btnSalvar = document.getElementById("btn_salvar_modal_venda");
    const mostrarErro = (msg) => {
        if (!alertEl) return;
        alertEl.textContent = msg;
        alertEl.className = "pace-venda-alert error";
        alertEl.style.display = "block";
    };

    if (alertEl) alertEl.style.display = "none";

    const state = window.__paceVendaModalState;
    const relatorioId = document.getElementById("venda_input_relatorio")?.value || "";
    const nomeCliente = (document.getElementById("venda_input_cliente")?.value || "").trim();
    const produto = (document.getElementById("venda_input_produto")?.value || "").trim();
    const valorRaw = document.getElementById("venda_input_valor")?.value || "0";
    const dataVenda = document.getElementById("venda_input_data")?.value || _obterDataHojeISO();
    const observacao = (document.getElementById("venda_input_observacao")?.value || "").trim();
    const selectAssessor = document.getElementById("venda_input_assessor");

    if (!nomeCliente) {
        mostrarErro("Informe o nome do cliente.");
        return;
    }
    if (!produto) {
        mostrarErro("Informe o produto ou serviço vendido.");
        return;
    }

    let userId = null;
    let nomeAssessor = "";
    if (state.isMaster && selectAssessor && selectAssessor.value) {
        userId = selectAssessor.value;
        const userObj = state.usuariosMap.get(String(userId));
        nomeAssessor = userObj?.full_name || selectAssessor.options[selectAssessor.selectedIndex]?.textContent || "Assessor";
    } else {
        try {
            if (typeof window.authObterUsuario === "function") {
                const u = await window.authObterUsuario();
                if (u) {
                    userId = u.id || null;
                    nomeAssessor = u.full_name || u.user_metadata?.full_name || u.email || "Assessor";
                }
            }
        } catch (_) {}
    }

    if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.textContent = "Salvando...";
    }

    try {
        if (typeof window.dbSalvarVenda !== "function") {
            throw new Error("Serviço de vendas indisponível nesta página.");
        }

        const vendaSalva = await window.dbSalvarVenda({
            id: state.vendaId || null,
            userId,
            relatorioId: relatorioId || null,
            nomeCliente,
            nomeAssessor,
            produto,
            valorVenda: valorRaw,
            dataVenda,
            observacao
        });

        window.fecharModalVenda();
        if (typeof window.PaceUI?.mostrarToast === "function") {
            window.PaceUI.mostrarToast(
                state.vendaId ? "Venda atualizada com sucesso!" : "Venda registrada com sucesso!",
                "sucesso"
            );
        }
        if (typeof state.onSaved === "function") {
            await state.onSaved(vendaSalva);
        }
    } catch (err) {
        console.error("[_submeterFormularioVenda] Erro ao salvar venda:", err);
        mostrarErro(err?.message || "Não foi possível salvar a venda. Verifique sua conexão e se a migration de vendas foi aplicada no Supabase.");
    } finally {
        if (btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.textContent = state.vendaId ? "Atualizar Venda" : "Salvar Venda";
        }
    }
}

window.abrirModalVenda = async function(opcoes = {}) {
    const overlay = _criarModalVendaDOM();
    const state = window.__paceVendaModalState;

    const venda = opcoes.venda || null;
    const relatorioPre = opcoes.relatorio || null;
    const isMaster = Boolean(opcoes.isMaster);
    const relatorios = Array.isArray(opcoes.relatoriosDisponiveis) ? opcoes.relatoriosDisponiveis : [];
    const usuarios = Array.isArray(opcoes.usuariosDisponiveis) ? opcoes.usuariosDisponiveis : [];

    state.vendaId = venda?.id || null;
    state.isMaster = isMaster;
    state.onSaved = typeof opcoes.onSaved === "function" ? opcoes.onSaved : null;
    state.relatoriosMap = new Map();
    state.usuariosMap = new Map();

    const alertEl = document.getElementById("pace_venda_alert");
    if (alertEl) alertEl.style.display = "none";

    const badgeEl = document.getElementById("pace_venda_modal_badge");
    const titleEl = document.getElementById("pace_venda_modal_title");
    const btnSalvar = document.getElementById("btn_salvar_modal_venda");
    if (badgeEl) badgeEl.textContent = venda ? "EDITAR VENDA" : "NOVA VENDA";
    if (titleEl) titleEl.textContent = venda ? "Editar Venda Realizada" : "Registrar Venda Realizada";
    if (btnSalvar) btnSalvar.textContent = venda ? "Atualizar Venda" : "Salvar Venda";

    // Popular relatórios disponíveis
    const selectRel = document.getElementById("venda_input_relatorio");
    if (selectRel) {
        const esc = window.escapeHTML;
        let opts = `<option value="">Venda avulsa (sem relatório vinculado)</option>`;
        relatorios.forEach(r => {
            if (!r || !r.id) return;
            state.relatoriosMap.set(String(r.id), r);
            const labelPat = _formatarMoedaBRLVenda(r.totalPatrimonio || 0, 0);
            opts += `<option value="${esc(r.id)}">${esc(r.nomeCliente || "Cliente")} — ${esc(labelPat)}</option>`;
        });
        if (relatorioPre && relatorioPre.id && !state.relatoriosMap.has(String(relatorioPre.id))) {
            state.relatoriosMap.set(String(relatorioPre.id), relatorioPre);
            opts += `<option value="${esc(relatorioPre.id)}">${esc(relatorioPre.nomeCliente || "Cliente")}</option>`;
        }
        selectRel.innerHTML = opts;
        selectRel.value = venda?.relatorioId || relatorioPre?.id || "";
    }

    // Popular assessores (apenas para Master) — resolve owner antes de liberar o modal
    const groupAssessor = document.getElementById("venda_group_assessor");
    const selectAssessor = document.getElementById("venda_input_assessor");
    let currentUserFallbackId = "";
    const ownerTarget = venda?.userId || relatorioPre?.userId || "";
    if (isMaster && !ownerTarget && typeof window.authObterUsuario === "function") {
        try {
            const uAtual = await window.authObterUsuario();
            if (uAtual?.id) currentUserFallbackId = String(uAtual.id);
        } catch (_) {}
    }

    if (groupAssessor && selectAssessor) {
        if (isMaster && usuarios.length > 0) {
            groupAssessor.style.display = "flex";
            const esc = window.escapeHTML;
            let optsU = "";
            usuarios
                .slice()
                .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""), "pt-BR"))
                .forEach(u => {
                    if (!u || !u.id) return;
                    state.usuariosMap.set(String(u.id), u);
                    optsU += `<option value="${esc(u.id)}">${esc(u.full_name || u.email || "Assessor")}</option>`;
                });
            selectAssessor.innerHTML = optsU;
            if (ownerTarget && state.usuariosMap.has(String(ownerTarget))) {
                selectAssessor.value = String(ownerTarget);
            } else if (currentUserFallbackId && state.usuariosMap.has(currentUserFallbackId)) {
                selectAssessor.value = currentUserFallbackId;
            }
        } else {
            groupAssessor.style.display = "none";
        }
    }

    const inputCliente = document.getElementById("venda_input_cliente");
    const inputProduto = document.getElementById("venda_input_produto");
    const inputValor = document.getElementById("venda_input_valor");
    const inputData = document.getElementById("venda_input_data");
    const inputObs = document.getElementById("venda_input_observacao");

    if (inputCliente) {
        inputCliente.value = venda?.nomeCliente || relatorioPre?.nomeCliente || "";
        inputCliente.dataset.autofilled = (!venda && relatorioPre) ? "true" : "false";
    }
    if (inputProduto) inputProduto.value = venda?.produto || "";
    if (inputValor) {
        inputValor.value = venda ? _formatarMoedaBRLVenda(venda.valorVenda || 0, 2) : "";
    }
    if (inputData) inputData.value = venda?.dataVenda || _obterDataHojeISO();
    if (inputObs) inputObs.value = venda?.observacao || "";

    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
    setTimeout(() => (inputCliente?.value ? inputProduto : inputCliente)?.focus(), 50);
};

window.fecharModalVenda = function() {
    const overlay = document.getElementById("modal_venda_pace_overlay");
    if (overlay) {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
    }
};

window.confirmarExclusaoVenda = function(venda, onDeleted) {
    if (!venda || !venda.id) return;
    const executar = async () => {
        try {
            await window.dbExcluirVenda(venda.id);
            if (typeof window.PaceUI?.mostrarToast === "function") {
                window.PaceUI.mostrarToast("Venda excluída com sucesso.", "info");
            }
            if (typeof onDeleted === "function") {
                await onDeleted();
            }
        } catch (err) {
            console.error("[confirmarExclusaoVenda] Erro ao excluir venda:", err);
            if (typeof window.PaceUI?.mostrarToast === "function") {
                window.PaceUI.mostrarToast(err?.message || "Erro ao excluir venda.", "erro");
            }
        }
    };

    const descricao = `${venda.produto || "Venda"} — ${venda.nomeCliente || "Cliente"} (${_formatarMoedaBRLVenda(venda.valorVenda || 0, 2)})`;
    if (typeof window.confirmarAcaoCustom === "function") {
        window.confirmarAcaoCustom({
            titulo: "Excluir Venda",
            mensagem: `Tem certeza que deseja excluir permanentemente o registro "${descricao}"?`,
            textoConfirmar: "Sim, Excluir",
            onConfirm: executar
        });
    } else if (confirm(`Excluir a venda "${descricao}"?`)) {
        executar();
    }
};

// Modal "Minhas Vendas" (Dashboard do Assessor / Master)
window.__paceListaVendasState = {
    vendas: [],
    relatorios: [],
    usuarios: [],
    isMaster: false,
    relatorioFiltro: null,
    onChanged: null
};

function _criarModalListaVendasDOM() {
    let overlay = document.getElementById("modal_lista_vendas_overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "modal_lista_vendas_overlay";
    overlay.className = "master-usability-overlay hidden";
    overlay.style.display = "none";

    overlay.innerHTML = `
      <div class="master-usability-modal pace-lista-vendas-modal" role="dialog" aria-modal="true" aria-labelledby="lista_vendas_modal_title">
        <div class="master-usability-header">
          <div class="master-usability-title-wrap">
            <div class="master-usability-badge-row">
              <span class="master-pill-badge is-sales">VENDAS REALIZADAS</span>
              <span class="master-subtitle-tag" id="lista_vendas_modal_subtag">Acompanhamento Comercial</span>
            </div>
            <h2 id="lista_vendas_modal_title">Minhas Vendas Realizadas</h2>
            <p id="lista_vendas_modal_desc">Consulte, edite ou registre vendas vinculadas aos seus planejamentos ou avulsas.</p>
          </div>
          <div class="master-usability-header-actions">
            <button type="button" class="master-btn-new-sale" id="btn_lista_vendas_nova">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Nova Venda</span>
            </button>
            <button type="button" class="master-btn-close" id="btn_fechar_lista_vendas" aria-label="Fechar">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div class="master-tab-content">
          <div class="master-sales-actions-bar" style="margin-bottom: 14px;">
            <span class="master-sales-summary" id="lista_vendas_resumo">0 vendas • R$ 0</span>
            <button type="button" class="master-btn-table-action" id="btn_lista_vendas_ver_todas" style="display: none;">
              Ver todas as vendas
            </button>
          </div>
          <div class="master-filters-row">
            <input type="text" id="lista_vendas_busca" class="master-filter-input" placeholder="Buscar por cliente, produto ou observação...">
            <select id="lista_vendas_origem" class="master-filter-select compact">
              <option value="todas">Todas as Origens</option>
              <option value="relatorio">Com Relatório</option>
              <option value="avulsa">Avulsas</option>
            </select>
          </div>
          <div class="master-table-container">
            <table class="master-table">
              <thead>
                <tr>
                  <th>Cliente / Origem</th>
                  <th>Produto / Serviço</th>
                  <th>Data</th>
                  <th>Valor</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="lista_vendas_tbody">
                <tr><td colspan="5" class="master-empty-cell">Nenhuma venda registrada.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) window.fecharModalListaVendas();
    });
    overlay.querySelector("#btn_fechar_lista_vendas")?.addEventListener("click", () => window.fecharModalListaVendas());
    overlay.querySelector("#lista_vendas_busca")?.addEventListener("input", () => _renderizarModalListaVendas());
    overlay.querySelector("#lista_vendas_origem")?.addEventListener("change", () => _renderizarModalListaVendas());
    overlay.querySelector("#btn_lista_vendas_ver_todas")?.addEventListener("click", () => {
        window.__paceListaVendasState.relatorioFiltro = null;
        _renderizarModalListaVendas();
    });

    overlay.querySelector("#btn_lista_vendas_nova")?.addEventListener("click", () => {
        const st = window.__paceListaVendasState;
        window.abrirModalVenda({
            relatorio: st.relatorioFiltro || null,
            isMaster: st.isMaster,
            relatoriosDisponiveis: st.relatorios,
            usuariosDisponiveis: st.usuarios,
            onSaved: async () => {
                if (typeof st.onChanged === "function") {
                    const novosDados = await st.onChanged();
                    if (novosDados && Array.isArray(novosDados.vendas)) {
                        st.vendas = novosDados.vendas;
                    }
                }
                _renderizarModalListaVendas();
            }
        });
    });

    overlay.querySelector("#lista_vendas_tbody")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        const vendaId = btn.getAttribute("data-venda-id") || "";
        const st = window.__paceListaVendasState;
        const venda = st.vendas.find(v => String(v.id) === String(vendaId));
        if (!venda) return;

        if (action === "editar-venda") {
            window.abrirModalVenda({
                venda,
                isMaster: st.isMaster,
                relatoriosDisponiveis: st.relatorios,
                usuariosDisponiveis: st.usuarios,
                onSaved: async () => {
                    if (typeof st.onChanged === "function") {
                        const novosDados = await st.onChanged();
                        if (novosDados && Array.isArray(novosDados.vendas)) {
                            st.vendas = novosDados.vendas;
                        }
                    }
                    _renderizarModalListaVendas();
                }
            });
        } else if (action === "excluir-venda") {
            window.confirmarExclusaoVenda(venda, async () => {
                if (typeof st.onChanged === "function") {
                    const novosDados = await st.onChanged();
                    if (novosDados && Array.isArray(novosDados.vendas)) {
                        st.vendas = novosDados.vendas;
                    }
                } else {
                    st.vendas = st.vendas.filter(v => String(v.id) !== String(vendaId));
                }
                _renderizarModalListaVendas();
            });
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const ov = document.getElementById("modal_lista_vendas_overlay");
            if (ov && !ov.classList.contains("hidden")) {
                window.fecharModalListaVendas();
            }
        }
    });

    document.body.appendChild(overlay);
    return overlay;
}

function _renderizarModalListaVendas() {
    const st = window.__paceListaVendasState;
    const tbody = document.getElementById("lista_vendas_tbody");
    if (!tbody) return;

    const busca = document.getElementById("lista_vendas_busca")?.value || "";
    const origem = document.getElementById("lista_vendas_origem")?.value || "todas";
    const relFiltro = st.relatorioFiltro;

    const titleEl = document.getElementById("lista_vendas_modal_title");
    const subtagEl = document.getElementById("lista_vendas_modal_subtag");
    const btnVerTodas = document.getElementById("btn_lista_vendas_ver_todas");
    if (titleEl) {
        titleEl.textContent = relFiltro
            ? `Vendas — ${relFiltro.nomeCliente || "Planejamento"}`
            : "Vendas Realizadas";
    }
    if (subtagEl) {
        subtagEl.textContent = relFiltro ? "Planejamento Vinculado" : "Acompanhamento Comercial";
    }
    if (btnVerTodas) {
        btnVerTodas.style.display = relFiltro ? "inline-flex" : "none";
    }

    const filtradas = typeof window.filtrarVendasPainel === "function"
        ? window.filtrarVendasPainel(st.vendas, st.usuarios, {
            busca,
            origem,
            relatorioId: relFiltro?.id || ""
        })
        : st.vendas;

    const totalVol = filtradas.reduce((acc, v) => acc + (Number(v.valorVenda) || 0), 0);
    const resumoEl = document.getElementById("lista_vendas_resumo");
    if (resumoEl) {
        resumoEl.textContent = `${filtradas.length} ${filtradas.length === 1 ? 'venda' : 'vendas'} • ${_formatarMoedaBRLVenda(totalVol, 0)}`;
    }

    if (filtradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="master-empty-cell">Nenhuma venda registrada neste filtro.</td></tr>`;
        return;
    }

    const esc = window.escapeHTML;
    let html = "";
    filtradas.forEach(v => {
        const safeId = String(v.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
        const isVinculada = Boolean(v.relatorioId);
        const obsTrim = String(v.observacao || "").trim();
        const obsCurta = obsTrim.length > 68 ? `${obsTrim.slice(0, 65)}...` : obsTrim;

        html += `
          <tr>
            <td>
              <div class="master-client-cell-wrap">
                <strong style="color: #09090b;">${esc(v.nomeCliente || "Cliente")}</strong>
                <span class="master-origin-pill ${isVinculada ? 'is-report' : 'is-standalone'}">
                  ${isVinculada ? 'Relatório' : 'Avulsa'}
                </span>
              </div>
              ${obsCurta ? `<div class="master-sale-obs-preview" title="${esc(obsTrim)}">${esc(obsCurta)}</div>` : ""}
            </td>
            <td><span class="master-product-tag">${esc(v.produto || "—")}</span></td>
            <td class="master-nowrap" style="color: #64748b; font-size: 12.5px;">${esc(_formatarDataBRVenda(v.dataVenda))}</td>
            <td class="master-nowrap" style="font-weight: 700; color: #059669;">${esc(_formatarMoedaBRLVenda(v.valorVenda, 2))}</td>
            <td style="text-align: right;">
              <div class="master-report-actions">
                <button type="button" class="master-btn-table-action" data-action="editar-venda" data-venda-id="${esc(safeId)}">Editar</button>
                <button type="button" class="master-btn-table-action danger" data-action="excluir-venda" data-venda-id="${esc(safeId)}">Excluir</button>
              </div>
            </td>
          </tr>
        `;
    });
    tbody.innerHTML = html;
}

window.abrirModalListaVendas = function(opcoes = {}) {
    const overlay = _criarModalListaVendasDOM();
    const st = window.__paceListaVendasState;
    st.vendas = Array.isArray(opcoes.vendas) ? opcoes.vendas : [];
    st.relatorios = Array.isArray(opcoes.relatorios) ? opcoes.relatorios : [];
    st.usuarios = Array.isArray(opcoes.usuarios) ? opcoes.usuarios : [];
    st.isMaster = Boolean(opcoes.isMaster);
    st.relatorioFiltro = opcoes.relatorio || null;
    st.onChanged = typeof opcoes.onChanged === "function" ? opcoes.onChanged : null;

    const buscaEl = document.getElementById("lista_vendas_busca");
    const origemEl = document.getElementById("lista_vendas_origem");
    if (buscaEl) buscaEl.value = "";
    if (origemEl) origemEl.value = "todas";

    _renderizarModalListaVendas();
    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
};

window.fecharModalListaVendas = function() {
    const overlay = document.getElementById("modal_lista_vendas_overlay");
    if (overlay) {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
    }
};


