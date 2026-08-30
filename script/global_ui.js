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
    const pathAtual = window.location.pathname;
    // Não exibe na tela de login, termos ou runner de testes
    if (pathAtual.endsWith('login.html') || pathAtual.endsWith('termos_privacidade.html') || pathAtual.endsWith('run_tests.html')) {
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
            alertMsg.textContent = 'Chamado registrado e encaminhado para joaopedromeneses129@gmail.com com sucesso.';
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

