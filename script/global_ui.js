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

    // Inicializa o botão flutuante de suporte no canto inferior direito
    inicializarWidgetSuporte();
});

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
    abaAtiva: 'usuarios',
    filtroAssessorRelatorios: 'todos'
};

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

        <!-- KPIs de Usabilidade -->
        <div class="master-kpi-grid">
          <div class="master-kpi-card">
            <span class="master-kpi-label">Total de Usuários</span>
            <strong class="master-kpi-value" id="master_kpi_total_usuarios">0</strong>
          </div>
          <div class="master-kpi-card">
            <span class="master-kpi-label">Usuários com Acesso</span>
            <strong class="master-kpi-value" id="master_kpi_usuarios_ativos">0</strong>
          </div>
          <div class="master-kpi-card">
            <span class="master-kpi-label">Relatórios Gerados</span>
            <strong class="master-kpi-value" id="master_kpi_total_relatorios">0</strong>
          </div>
          <div class="master-kpi-card">
            <span class="master-kpi-label">Volume Patrimonial Mapeado</span>
            <strong class="master-kpi-value" id="master_kpi_patrimonio_total">R$ 0</strong>
          </div>
        </div>

        <!-- Abas de Navegação -->
        <div class="master-tabs-bar">
          <button type="button" class="master-tab-btn active" id="tab_btn_master_usuarios" onclick="window.alternarAbaPainelMaster('usuarios')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Acessos & Produtividade por Usuário</span>
          </button>
          <button type="button" class="master-tab-btn" id="tab_btn_master_relatorios" onclick="window.alternarAbaPainelMaster('relatorios')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>Todos os Relatórios dos Assessores</span>
          </button>
        </div>

        <!-- ABA 1: USUÁRIOS E ACESSOS -->
        <div class="master-tab-content" id="master_section_usuarios">
          <div class="master-filters-row">
            <input type="text" id="master_input_busca_usuario" class="master-filter-input" placeholder="Buscar usuário por nome ou e-mail..." oninput="window.renderizarTabelaUsuariosMaster()">
            <select id="master_select_role_usuario" class="master-filter-select" onchange="window.renderizarTabelaUsuariosMaster()">
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
                  <th style="text-align: center;">Relatórios Gerados</th>
                  <th>Patrimônio Mapeado</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="master_tbody_usuarios">
                <tr><td colspan="6" class="master-empty-cell">Carregando informações de usabilidade...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ABA 2: TODOS OS RELATÓRIOS DOS ASSESSORES -->
        <div class="master-tab-content" id="master_section_relatorios" style="display: none;">
          <div class="master-filters-row">
            <input type="text" id="master_input_busca_relatorio" class="master-filter-input" placeholder="Buscar por nome do cliente ou assessor..." oninput="window.renderizarTabelaRelatoriosMaster()">
            <select id="master_select_assessor_relatorio" class="master-filter-select" onchange="window.renderizarTabelaRelatoriosMaster()">
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
                  <th style="text-align: right;">Acesso Completo</th>
                </tr>
              </thead>
              <tbody id="master_tbody_relatorios">
                <tr><td colspan="6" class="master-empty-cell">Carregando relatórios...</td></tr>
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

    document.body.appendChild(overlay);
    return overlay;
}

window.alternarAbaPainelMaster = function(aba) {
    window.__masterUsabilidadeCache.abaAtiva = aba;
    const btnUsuarios = document.getElementById("tab_btn_master_usuarios");
    const btnRelatorios = document.getElementById("tab_btn_master_relatorios");
    const secUsuarios = document.getElementById("master_section_usuarios");
    const secRelatorios = document.getElementById("master_section_relatorios");

    if (aba === "relatorios") {
        btnUsuarios?.classList.remove("active");
        btnRelatorios?.classList.add("active");
        if (secUsuarios) secUsuarios.style.display = "none";
        if (secRelatorios) secRelatorios.style.display = "block";
        window.renderizarTabelaRelatoriosMaster();
    } else {
        btnRelatorios?.classList.remove("active");
        btnUsuarios?.classList.add("active");
        if (secRelatorios) secRelatorios.style.display = "none";
        if (secUsuarios) secUsuarios.style.display = "block";
        window.renderizarTabelaUsuariosMaster();
    }
};

window.filtrarRelatoriosDoUsuarioNoPainelMaster = function(nomeAssessor, userId) {
    const select = document.getElementById("master_select_assessor_relatorio");
    const buscaInput = document.getElementById("master_input_busca_relatorio");
    if (select) {
        const matchOption = Array.from(select.options).find(opt =>
            opt.value === userId || opt.value.toLowerCase() === (nomeAssessor || "").toLowerCase()
        );
        if (matchOption) {
            select.value = matchOption.value;
            if (buscaInput) buscaInput.value = "";
        } else {
            select.value = "todos";
            if (buscaInput) buscaInput.value = nomeAssessor || "";
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
        tbody.innerHTML = `<tr><td colspan="6" class="master-empty-cell">Nenhum usuário encontrado para os filtros selecionados.</td></tr>`;
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
        const patTotal = "R$ " + (Number(u.total_patrimonio) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
        const safeNomeJs = esc(nome).replace(/'/g, "\\'");
        const safeIdJs = esc(u.id || "").replace(/'/g, "\\'");

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
            <td style="font-weight: 600; color: #09090b;">${patTotal}</td>
            <td style="text-align: right;">
              <button type="button" class="master-btn-table-action" onclick="window.filtrarRelatoriosDoUsuarioNoPainelMaster('${safeNomeJs}', '${safeIdJs}')">
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

    const relatorios = window.__masterUsabilidadeCache.relatorios || [];
    const busca = (document.getElementById("master_input_busca_relatorio")?.value || "").toLowerCase().trim();
    const filtroAssessor = document.getElementById("master_select_assessor_relatorio")?.value || "todos";

    const filtrados = relatorios.filter(rep => {
        const cliente = (rep.nomeCliente || "").toLowerCase();
        const assessor = (rep.nomeAssessor || "").toLowerCase();
        const matchBusca = !busca || cliente.includes(busca) || assessor.includes(busca);
        let matchAssessor = true;
        if (filtroAssessor !== "todos") {
            matchAssessor = String(rep.userId || "") === filtroAssessor ||
                assessor.trim() === filtroAssessor.toLowerCase().trim();
        }
        return matchBusca && matchAssessor;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="master-empty-cell">Nenhum relatório encontrado para os critérios selecionados.</td></tr>`;
        return;
    }

    const esc = window.escapeHTML;
    let html = "";

    filtrados.forEach(rep => {
        const safeId = String(rep.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
        const nomeCliente = rep.nomeCliente || "Cliente";
        const nomeAssessor = rep.nomeAssessor || "Assessor";
        const pat = "R$ " + (Number(rep.totalPatrimonio) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
        const prej = "R$ " + (Number(rep.prejuizoTributario) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

        let dataStr = rep.dataReuniao || "";
        if (rep.dataCriacao) {
            const d = new Date(rep.dataCriacao);
            if (!isNaN(d.getTime())) {
                dataStr = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            }
        }

        html += `
          <tr>
            <td><strong style="color: #09090b;">${esc(nomeCliente)}</strong></td>
            <td><span class="master-advisor-pill">${esc(nomeAssessor)}</span></td>
            <td style="color: #64748b; font-size: 12.5px;">${esc(dataStr || "—")}</td>
            <td style="font-weight: 600; color: #09090b;">${pat}</td>
            <td style="font-weight: 600; color: #dc2626;">${prej}</td>
            <td style="text-align: right;">
              <div class="master-report-actions">
                <button type="button" class="master-btn-table-action" onclick="window.abrirRelatorioPeloPainelMaster('${safeId}', 'editar')">
                  Abrir Simulação
                </button>
                <button type="button" class="master-btn-table-action primary" onclick="window.abrirRelatorioPeloPainelMaster('${safeId}', 'pdf')">
                  Ver PDF
                </button>
              </div>
            </td>
          </tr>
        `;
    });

    tbody.innerHTML = html;
};

window.abrirRelatorioPeloPainelMaster = function(repId, modo = "editar") {
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
            sessionStorage.setItem("total_patrimonio", ds.patrimonio.total ?? rep.totalPatrimonio ?? 0);
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
            if (!ds.total_patrimonio && rep.totalPatrimonio) {
                sessionStorage.setItem("total_patrimonio", rep.totalPatrimonio);
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
        tbodyU.innerHTML = `<tr><td colspan="6" class="master-empty-cell">Sincronizando dados de usabilidade e relatórios...</td></tr>`;
    }

    try {
        const res = typeof window.dbObterUsabilidadeUsuarios === "function"
            ? await window.dbObterUsabilidadeUsuarios()
            : { usuarios: [], relatorios: [] };

        const usuarios = res.usuarios || [];
        const relatorios = res.relatorios || [];

        window.__masterUsabilidadeCache.usuarios = usuarios;
        window.__masterUsabilidadeCache.relatorios = relatorios;

        // Atualiza KPIs
        const totalUsuarios = usuarios.length;
        const usuariosAtivos = usuarios.filter(u => !!u.ultimo_acesso).length;
        const totalRelatorios = relatorios.length;
        const patrimonioTotal = relatorios.reduce((acc, r) => acc + (Number(r.totalPatrimonio) || 0), 0);

        const elTotalU = document.getElementById("master_kpi_total_usuarios");
        const elAtivosU = document.getElementById("master_kpi_usuarios_ativos");
        const elTotalR = document.getElementById("master_kpi_total_relatorios");
        const elPatTotal = document.getElementById("master_kpi_patrimonio_total");

        if (elTotalU) elTotalU.textContent = String(totalUsuarios);
        if (elAtivosU) elAtivosU.textContent = String(usuariosAtivos);
        if (elTotalR) elTotalR.textContent = String(totalRelatorios);
        if (elPatTotal) elPatTotal.textContent = "R$ " + patrimonioTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

        // Popula select de assessores na aba de relatórios
        const selectAssessor = document.getElementById("master_select_assessor_relatorio");
        if (selectAssessor) {
            const valorAnterior = selectAssessor.value || "todos";
            const assessoresMap = new Map();
            usuarios.forEach(u => {
                if (u.full_name) assessoresMap.set(u.full_name, u.full_name);
            });
            relatorios.forEach(r => {
                if (r.nomeAssessor) assessoresMap.set(r.nomeAssessor, r.nomeAssessor);
            });

            let opts = `<option value="todos">Todos os Assessores (${relatorios.length})</option>`;
            Array.from(assessoresMap.keys()).sort((a, b) => a.localeCompare(b, "pt-BR")).forEach(nome => {
                opts += `<option value="${window.escapeHTML(nome)}">${window.escapeHTML(nome)}</option>`;
            });
            selectAssessor.innerHTML = opts;
            if (Array.from(assessoresMap.keys()).includes(valorAnterior)) {
                selectAssessor.value = valorAnterior;
            }
        }

        window.renderizarTabelaUsuariosMaster();
        window.renderizarTabelaRelatoriosMaster();
    } catch (e) {
        console.error("[recarregarDadosUsabilidadeMaster] Erro:", e);
        if (tbodyU) {
            tbodyU.innerHTML = `<tr><td colspan="6" class="master-empty-cell">Não foi possível carregar os dados no momento.</td></tr>`;
        }
    }
};

window.abrirPainelUsabilidadeMaster = async function() {
    // Valida se o usuário atual possui permissão Master
    let isMaster = false;
    try {
        const cached = JSON.parse(localStorage.getItem("pace_user_cache") || "{}");
        if (cached && cached.role === "master") isMaster = true;
        if (!isMaster && typeof window.authObterUsuario === "function") {
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


