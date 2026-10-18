/**
 * =============================================================================
 * PITCH MODE — MODO APRESENTAÇÃO EXECUTIVO
 * Ritmo Wealth Pro (Pace Capital) — Apresentação Interativa em Tela Cheia
 * =============================================================================
 */

(function () {
  'use strict';

  // Definição dos blocos disponíveis
  const TODOS_BLOCOS = [
    { id: 1, chave: 'capa', nome: 'Capa do Planejamento', desc: 'Identificação do cliente, assessor e confidencialidade' },
    { id: 2, chave: 'patrimonio', nome: 'Raio-X Patrimonial', desc: 'Composição de ativos, liquidez e offshore' },
    { id: 3, chave: 'familia', nome: 'Governança & Organograma', desc: 'Regime de bens, meação e sucessão familiar' },
    { id: 4, chave: 'custos', nome: 'Diagnóstico de Prejuízo de Inventário', desc: 'Custo tributário (ITCMD), cartório e advogados' },
    { id: 5, chave: 'estrategias', nome: 'Estratégias de Preservação', desc: 'Comparativo de doação, previdência, seguro e holding' },
    { id: 6, chave: 'evolucao', nome: 'Projeção de Crescimento & Encerramento', desc: 'Curva composta de longo prazo e próximos passos' }
  ];

  const PRESETS = {
    completa: [1, 2, 3, 4, 5, 6],
    sucessorio: [1, 3, 4, 5],
    patrimonial: [1, 2, 4, 5, 6]
  };

  let blocosAtivos = [...PRESETS.completa];
  let presetAtual = 'completa';
  let slideIndexAtual = 0;
  let slidesMontados = [];
  let graficosPitch = [];

  // =============================================================================
  // MODAL DE CONFIGURAÇÃO PRÉVIA
  // =============================================================================

  window.abrirConfiguracaoPitch = function () {
    let overlay = document.getElementById('pitch_config_overlay');
    if (!overlay) {
      overlay = criarModalConfiguracaoDOM();
      document.body.appendChild(overlay);
    }
    atualizarUIConfiguracao();
    overlay.style.display = 'flex';
  };

  window.fecharConfiguracaoPitch = function () {
    const overlay = document.getElementById('pitch_config_overlay');
    if (overlay) overlay.style.display = 'none';
  };

  window.selecionarPresetPitch = function (nomePreset) {
    if (!PRESETS[nomePreset]) return;
    presetAtual = nomePreset;
    blocosAtivos = [...PRESETS[nomePreset]];
    atualizarUIConfiguracao();
  };

  window.toggleBlocoPitch = function (idBloco) {
    idBloco = Number(idBloco);
    const index = blocosAtivos.indexOf(idBloco);
    if (index > -1) {
      if (blocosAtivos.length <= 1) {
        if (window.mostrarToast) window.mostrarToast('Selecione ao menos um slide para a apresentação', 'aviso');
        return;
      }
      blocosAtivos.splice(index, 1);
    } else {
      blocosAtivos.push(idBloco);
      blocosAtivos.sort((a, b) => a - b);
    }
    presetAtual = 'personalizado';
    atualizarUIConfiguracao();
  };

  function criarModalConfiguracaoDOM() {
    const overlay = document.createElement('div');
    overlay.id = 'pitch_config_overlay';
    overlay.className = 'pitch-config-overlay';
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div class="pitch-config-modal">
        <div class="pitch-config-header">
          <div>
            <h3>Configurar Modo Apresentação</h3>
            <p>Personalize os blocos e a narrativa que serão projetados para o cliente.</p>
          </div>
          <button type="button" class="btn-pitch-close-config" onclick="fecharConfiguracaoPitch()" title="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="pitch-config-body">
          <div>
            <div class="pitch-presets-label">Narrativas Recomendadas (Presets Rápidos)</div>
            <div class="pitch-presets-grid">
              <div class="pitch-preset-card ativo" id="preset_completa" onclick="selecionarPresetPitch('completa')">
                <span class="preset-icon">💎</span>
                <span class="preset-name">Completa</span>
                <span class="preset-desc">Todos os 6 slides (Visão 360° patrimonial e sucessória)</span>
              </div>
              <div class="pitch-preset-card" id="preset_sucessorio" onclick="selecionarPresetPitch('sucessorio')">
                <span class="preset-icon">⚖️</span>
                <span class="preset-name">Foco Sucessório</span>
                <span class="preset-desc">Governança familiar, riscos de inventário e blindagem</span>
              </div>
              <div class="pitch-preset-card" id="preset_patrimonial" onclick="selecionarPresetPitch('patrimonial')">
                <span class="preset-icon">📊</span>
                <span class="preset-name">Foco Patrimonial</span>
                <span class="preset-desc">Composição de ativos, custos fiscais e projeção futura</span>
              </div>
            </div>
          </div>

          <div>
            <div class="pitch-presets-label">Seleção Individual de Slides</div>
            <div class="pitch-blocks-list" id="pitch_blocks_list">
              ${TODOS_BLOCOS.map(b => `
                <div class="pitch-block-item" onclick="toggleBlocoPitch(${b.id})">
                  <div class="pitch-block-info">
                    <div class="pitch-block-num">${b.id}</div>
                    <div>
                      <div class="pitch-block-title">${b.nome}</div>
                      <div class="pitch-block-sub">${b.desc}</div>
                    </div>
                  </div>
                  <label class="pitch-switch" onclick="event.stopPropagation()">
                    <input type="checkbox" id="chk_pitch_${b.id}" onchange="toggleBlocoPitch(${b.id})">
                    <span class="pitch-slider"></span>
                  </label>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="pitch-config-footer">
          <div class="pitch-config-stats">
            Slides ativos: <strong id="pitch_active_count">6</strong> de ${TODOS_BLOCOS.length}
          </div>
          <button type="button" class="btn-pitch-launch" onclick="iniciarApresentacaoPitch()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Iniciar Apresentação</span>
          </button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) fecharConfiguracaoPitch();
    });

    return overlay;
  }

  function atualizarUIConfiguracao() {
    ['completa', 'sucessorio', 'patrimonial'].forEach(p => {
      const el = document.getElementById(`preset_${p}`);
      if (el) {
        if (presetAtual === p) el.classList.add('ativo');
        else el.classList.remove('ativo');
      }
    });

    TODOS_BLOCOS.forEach(b => {
      const chk = document.getElementById(`chk_pitch_${b.id}`);
      if (chk) {
        chk.checked = blocosAtivos.includes(b.id);
      }
    });

    const countEl = document.getElementById('pitch_active_count');
    if (countEl) countEl.innerText = blocosAtivos.length;
  }

  // =============================================================================
  // MOTOR DE APRESENTAÇÃO (FULLSCREEN PITCH OVERLAY)
  // =============================================================================

  window.iniciarApresentacaoPitch = function () {
    fecharConfiguracaoPitch();

    let pitchOverlay = document.getElementById('pitch_fullscreen_overlay');
    if (!pitchOverlay) {
      pitchOverlay = criarPitchOverlayDOM();
      document.body.appendChild(pitchOverlay);
    }

    // Compila os dados da simulação
    const dadosSimulacao = coletarDadosSimulacao();

    // Monta os slides ativos
    slidesMontados = blocosAtivos.map(id => {
      return gerarHTMLSlide(id, dadosSimulacao);
    });

    renderizarSlidesNoDOM(pitchOverlay);
    slideIndexAtual = 0;
    mostrarSlide(slideIndexAtual);

    pitchOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Registra listeners de teclado
    window.addEventListener('keydown', lidarComTecladoPitch);

    // Inicializa gráficos do slide ativo se houver
    setTimeout(() => {
      renderizarGraficosSlide(slideIndexAtual, dadosSimulacao);
    }, 150);
  };

  window.fecharApresentacaoPitch = function () {
    const pitchOverlay = document.getElementById('pitch_fullscreen_overlay');
    if (pitchOverlay) {
      pitchOverlay.style.display = 'none';
    }
    document.body.style.overflow = '';
    window.removeEventListener('keydown', lidarComTecladoPitch);

    // Destrói instâncias de Chart.js
    destruirGraficosPitch();

    // Se estiver em fullscreen nativo, encerra
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  window.pitchProximoSlide = function () {
    if (slideIndexAtual < slidesMontados.length - 1) {
      slideIndexAtual++;
      mostrarSlide(slideIndexAtual);
    }
  };

  window.pitchSlideAnterior = function () {
    if (slideIndexAtual > 0) {
      slideIndexAtual--;
      mostrarSlide(slideIndexAtual);
    }
  };

  window.pitchAlternarFullscreen = function () {
    const pitchOverlay = document.getElementById('pitch_fullscreen_overlay');
    if (!pitchOverlay) return;

    if (!document.fullscreenElement) {
      pitchOverlay.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  function lidarComTecladoPitch(e) {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      window.pitchProximoSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      window.pitchSlideAnterior();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      window.fecharApresentacaoPitch();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      window.pitchAlternarFullscreen();
    }
  }

  function criarPitchOverlayDOM() {
    const overlay = document.createElement('div');
    overlay.id = 'pitch_fullscreen_overlay';
    overlay.className = 'pitch-fullscreen-overlay';
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <!-- Progresso Linear -->
      <div class="pitch-progress-track">
        <div class="pitch-progress-bar" id="pitch_progress_bar" style="width: 0%;"></div>
      </div>

      <!-- Barra Superior -->
      <header class="pitch-top-bar">
        <div class="pitch-brand-badge">
          <div class="pitch-brand-logo">
            RITMO <span>WEALTH PRO</span>
          </div>
          <div class="pitch-badge-live">Modo Apresentação</div>
        </div>

        <div class="pitch-top-controls">
          <button type="button" class="pitch-btn-icon" onclick="pitchAlternarFullscreen()" title="Tela Cheia (F)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
          <button type="button" class="pitch-btn-icon" onclick="fecharApresentacaoPitch()" title="Fechar (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </header>

      <!-- Palco Central dos Slides -->
      <main class="pitch-stage">
        <div class="pitch-slide-container" id="pitch_slide_container"></div>
      </main>

      <!-- Barra de Controle Inferior Flutuante -->
      <div class="pitch-bottom-bar">
        <button type="button" class="pitch-btn-nav" id="btn_pitch_prev" onclick="pitchSlideAnterior()" title="Slide Anterior (←)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        <div class="pitch-counter" id="pitch_slide_counter">
          Slide <strong>1</strong> de 6
        </div>

        <button type="button" class="pitch-btn-nav" id="btn_pitch_next" onclick="pitchProximoSlide()" title="Próximo Slide (→ ou Espaço)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>

        <div class="pitch-hint">
          <span class="pitch-kbd">←</span> <span class="pitch-kbd">→</span> Navegar
          <span class="pitch-kbd" style="margin-left: 6px;">F</span> Tela Cheia
          <span class="pitch-kbd" style="margin-left: 6px;">Esc</span> Sair
        </div>
      </div>
    `;

    return overlay;
  }

  function renderizarSlidesNoDOM(pitchOverlay) {
    const container = pitchOverlay.querySelector('#pitch_slide_container');
    if (!container) return;

    container.innerHTML = slidesMontados.map((s, idx) => `
      <div class="pitch-slide" id="pitch_slide_${idx}">
        ${s.html}
      </div>
    `).join('');
  }

  function mostrarSlide(idx) {
    const container = document.getElementById('pitch_slide_container');
    if (!container) return;

    const total = slidesMontados.length;
    const slides = container.querySelectorAll('.pitch-slide');

    slides.forEach((sl, i) => {
      sl.classList.remove('ativo', 'anterior');
      if (i === idx) {
        sl.classList.add('ativo');
      } else if (i < idx) {
        sl.classList.add('anterior');
      }
    });

    // Atualiza barra de progresso linear
    const progressBar = document.getElementById('pitch_progress_bar');
    if (progressBar) {
      const pct = total > 1 ? (idx / (total - 1)) * 100 : 100;
      progressBar.style.width = `${pct}%`;
    }

    // Atualiza contador
    const counter = document.getElementById('pitch_slide_counter');
    if (counter) {
      counter.innerHTML = `Slide <strong>${idx + 1}</strong> de ${total}`;
    }

    // Atualiza botões
    const btnPrev = document.getElementById('btn_pitch_prev');
    const btnNext = document.getElementById('btn_pitch_next');
    if (btnPrev) btnPrev.disabled = idx === 0;
    if (btnNext) btnNext.disabled = idx === total - 1;

    // Renderiza gráficos associados ao slide atual
    const dados = coletarDadosSimulacao();
    renderizarGraficosSlide(idx, dados);
  }

  // =============================================================================
  // COLETA E TRATAMENTO DE DADOS DA SIMULAÇÃO
  // =============================================================================

  function coletarDadosSimulacao() {
    const familia = JSON.parse(sessionStorage.getItem('familia')) || {};
    const dadosPatrimonio = JSON.parse(sessionStorage.getItem('patrimonio_dados')) || {};
    const evolucao = JSON.parse(sessionStorage.getItem('evolucao_dados')) || {};

    const nomeCliente = (familia.nome || '').trim() || 'Cliente';
    const nomeAssessor = sessionStorage.getItem('nome_assessor') || 'Assessor Especialista';
    const dataReuniao = sessionStorage.getItem('data_reuniao') || new Date().toLocaleDateString('pt-BR');

    // Patrimônio bruto
    const totalPatrimonioRaw = Number(sessionStorage.getItem('total_patrimonio')) || 0;

    // Categorias de patrimônio
    const rf = parseValor(dadosPatrimonio.rf);
    const rv = parseValor(dadosPatrimonio.rv);
    const inter = parseValor(dadosPatrimonio.inter);
    const prev = parseValor(dadosPatrimonio.prev);
    const offshore = parseValor(dadosPatrimonio.offshore);
    const totalFinanceiro = rf + rv + inter + prev + offshore;

    const apt = parseValor(dadosPatrimonio.apt);
    const casa = parseValor(dadosPatrimonio.casa);
    const terr = parseValor(dadosPatrimonio.terr);
    const galp = parseValor(dadosPatrimonio.galp);
    const totalImoveis = apt + casa + terr + galp;

    let totalEmpresas = 0;
    if (dadosPatrimonio.empresas && Array.isArray(dadosPatrimonio.empresas)) {
      dadosPatrimonio.empresas.forEach(emp => {
        const val = parseValor(emp.valor);
        const pct = Number(emp.pct) || 0;
        totalEmpresas += val * (pct / 100);
      });
    }

    const outrosBens = parseValor(dadosPatrimonio.bens);

    // Prejuízo e custos (coletados de elementos calculados no DOM)
    const itcmdTaxa = document.getElementById('taxa_itcmd') ? document.getElementById('taxa_itcmd').value : '4';
    const itcmdValorEl = document.getElementById('itcmd');
    const custasCartorioEl = document.getElementById('custas_cartorio');
    const honorariosEl = document.getElementById('honorarios');
    const totalCustosEl = document.getElementById('total_custos');
    const totalProjetadoEl = document.getElementById('total_projetado');
    const prejuizoProjetadoEl = document.getElementById('prejuizo_projetado');

    const itcmdFormatado = itcmdValorEl ? itcmdValorEl.innerText : 'R$ 0,00';
    const custasFormatadas = custasCartorioEl ? custasCartorioEl.innerText : 'R$ 0,00';
    const honorariosFormatados = honorariosEl ? honorariosEl.innerText : 'R$ 0,00';
    const totalCustosFormatado = totalCustosEl ? totalCustosEl.innerText : 'R$ 0,00';
    const totalProjetadoFormatado = totalProjetadoEl ? totalProjetadoEl.innerText : 'R$ 0,00';
    const prejuizoProjetadoFormatado = prejuizoProjetadoEl ? prejuizoProjetadoEl.innerText : 'R$ 0,00';

    // Estratégias
    const doacaoEcoEl = document.getElementById('doacao_economia');
    const seguroCapEl = document.getElementById('seguro_resultado_capital');
    const seguroParcEl = document.getElementById('seguro_resultado_parcela');
    const seguroEcoEl = document.getElementById('seguro_resultado_economia');

    return {
      cliente: nomeCliente,
      assessor: nomeAssessor,
      data: dataReuniao,
      totalPatrimonio: totalPatrimonioRaw,
      totalPatrimonioFormatado: 'R$ ' + Math.round(totalPatrimonioRaw).toLocaleString('pt-BR'),
      totalFinanceiro,
      totalFinanceiroFormatado: 'R$ ' + Math.round(totalFinanceiro).toLocaleString('pt-BR'),
      totalImoveis,
      totalImoveisFormatado: 'R$ ' + Math.round(totalImoveis).toLocaleString('pt-BR'),
      totalEmpresas,
      totalEmpresasFormatado: 'R$ ' + Math.round(totalEmpresas).toLocaleString('pt-BR'),
      outrosBens,
      previdencia: prev,
      offshore,
      familia,
      itcmdTaxa,
      itcmdFormatado,
      custasFormatadas,
      honorariosFormatados,
      totalCustosFormatado,
      totalProjetadoFormatado,
      prejuizoProjetadoFormatado,
      doacaoEconomia: doacaoEcoEl ? doacaoEcoEl.innerText : 'R$ 0,00',
      seguroCapital: seguroCapEl ? seguroCapEl.innerText : '—',
      seguroParcela: seguroParcEl ? seguroParcEl.innerText : '—',
      seguroEconomia: seguroEcoEl ? seguroEcoEl.innerText : '—',
      evolucao
    };
  }

  function parseValor(v) {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    let s = v.toString().replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
  }

  // =============================================================================
  // CONSTRUTORES DE SLIDES EM HTML
  // =============================================================================

  function gerarHTMLSlide(idBloco, d) {
    switch (idBloco) {
      case 1:
        return {
          id: 1,
          tipo: 'capa',
          html: `
            <div class="pitch-capa-hero">
              <div class="pitch-capa-monogram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h1 class="pitch-capa-title">Planejamento Patrimonial &amp; Sucessório</h1>
              <div class="pitch-capa-client">Apresentado para: <strong>${d.cliente}</strong></div>
              <div class="pitch-capa-meta-row">
                <div>Assessor: <strong>${d.assessor}</strong></div>
                <div>•</div>
                <div>Data: <strong>${d.data}</strong></div>
                <div>•</div>
                <div>Status: <strong style="color: #34d399;">Diagnóstico Estratégico</strong></div>
              </div>
            </div>
          `
        };

      case 2:
        return {
          id: 2,
          tipo: 'patrimonio',
          html: `
            <div class="pitch-slide-header">
              <span class="pitch-slide-tag">Raio-X do Patrimônio</span>
              <h2 class="pitch-slide-title">Mapeamento de Ativos e Liquidez</h2>
              <p class="pitch-slide-subtitle">Distribuição por classes de ativos, liquidez imediata e bens imobilizados.</p>
            </div>

            <div class="pitch-metrics-grid">
              <div class="pitch-card-dark">
                <div class="pitch-number-label">Patrimônio Consolidado</div>
                <div class="pitch-big-number">${d.totalPatrimonioFormatado}</div>
              </div>
              <div class="pitch-card-dark">
                <div class="pitch-number-label">Aplicações Financeiras</div>
                <div class="pitch-big-number">${d.totalFinanceiroFormatado}</div>
              </div>
              <div class="pitch-card-dark">
                <div class="pitch-number-label">Imóveis &amp; Terrenos</div>
                <div class="pitch-big-number">${d.totalImoveisFormatado}</div>
              </div>
              <div class="pitch-card-dark">
                <div class="pitch-number-label">Participação Societária</div>
                <div class="pitch-big-number">${d.totalEmpresasFormatado}</div>
              </div>
            </div>

            <div class="pitch-two-cols">
              <div class="pitch-card-dark" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 260px;">
                <div class="pitch-number-label" style="align-self: flex-start; margin-bottom: 12px;">Composição por Classe</div>
                <div style="width: 100%; max-width: 320px; height: 210px; position: relative;">
                  <canvas id="pitch_chart_patrimonio"></canvas>
                </div>
              </div>

              <div class="pitch-card-dark" style="display: flex; flex-direction: column; justify-content: space-around;">
                <div>
                  <div class="pitch-number-label">Liquidez vs. Ativos Ilíquidos</div>
                  <p style="font-size: 13.5px; color: #a1a1aa; line-height: 1.6; margin-top: 6px;">
                    Ativos financeiros e previdência oferecem agilidade para suportar despesas emergenciais, enquanto ativos imobiliários e participações exigem planejamento específico para evitar alienação forçada com deságio em caso de inventário.
                  </p>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 10px;">
                  <div style="flex: 1; padding: 12px 14px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 10px;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #38bdf8; font-weight: 700;">Previdência Privada</span>
                    <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-top: 2px;">R$ ${Math.round(d.previdencia).toLocaleString('pt-BR')}</div>
                  </div>
                  <div style="flex: 1; padding: 12px 14px; background: rgba(129, 140, 248, 0.08); border: 1px solid rgba(129, 140, 248, 0.2); border-radius: 10px;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #818cf8; font-weight: 700;">Ativos Offshore</span>
                    <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-top: 2px;">R$ ${Math.round(d.offshore).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              </div>
            </div>
          `
        };

      case 3:
        const fam = d.familia || {};
        const regime = fam.regime || 'Comunhão Parcial de Bens';
        const estadoCivil = (fam.estadoCivil || 'solteiro').toLowerCase();
        const temFilhos = fam.temFilhos === 'sim';
        const qtdFilhos = parseInt(fam.qtdFilhos) || (Array.isArray(fam.idadesFilhos) ? fam.idadesFilhos.length : 0);

        return {
          id: 3,
          tipo: 'familia',
          html: `
            <div class="pitch-slide-header">
              <span class="pitch-slide-tag">Governança Familiar</span>
              <h2 class="pitch-slide-title">Regime de Bens &amp; Ordem de Sucessão</h2>
              <p class="pitch-slide-subtitle">Impacto da legislação civil na preservação do patrimônio familiar.</p>
            </div>

            <div class="pitch-two-cols">
              <div class="pitch-card-dark">
                <div class="pitch-number-label">Regime Matrimonial e Meação</div>
                <h3 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 8px 0;">${regime}</h3>
                <p style="font-size: 13.5px; color: #a1a1aa; line-height: 1.6; margin-top: 8px;">
                  ${estadoCivil === 'casado'
                    ? `O cônjuge possui direitos de meação e/ou concorrência sucessória conforme os artigos 1.658 e 1.829 do Código Civil. A correta identificação dos bens comuns versus particulares previne conflitos de inventário.`
                    : `Titular em estado civil ${estadoCivil}. A totalidade do acervo patrimonial integra a base de herança dos descendentes necessários ou ascendentes.`}
                </p>

                <div style="margin-top: 20px; padding: 14px 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: 700;">Herdeiros Necessários</div>
                    <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-top: 2px;">
                      ${temFilhos ? `${qtdFilhos} Filho(s) descendente(s)` : 'Sem descendentes diretos'}
                    </div>
                  </div>
                  <span style="font-size: 12px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-weight: 700;">Legítima 50%</span>
                </div>
              </div>

              <div class="pitch-card-dark" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div class="pitch-number-label">Pilares de Governança Sucessória</div>
                  <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px;">
                    <div style="padding: 12px 14px; background: rgba(255, 255, 255, 0.02); border-left: 3px solid #38bdf8; border-radius: 8px; font-size: 13px; color: #d4d4d8;">
                      <strong>Proteção da Legítima:</strong> 50% do patrimônio é reservado obrigatoriamente aos herdeiros necessários por lei (Código Civil).
                    </div>
                    <div style="padding: 12px 14px; background: rgba(255, 255, 255, 0.02); border-left: 3px solid #818cf8; border-radius: 8px; font-size: 13px; color: #d4d4d8;">
                      <strong>Parcela Disponível:</strong> Os outros 50% podem ser direcionados livremente via testamento, doação com reserva ou previdência.
                    </div>
                    <div style="padding: 12px 14px; background: rgba(255, 255, 255, 0.02); border-left: 3px solid #34d399; border-radius: 8px; font-size: 13px; color: #d4d4d8;">
                      <strong>Prevenção de Litígios:</strong> O planejamento antecipado elimina a necessidade de disputas judiciais desgastantes entre herdeiros.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `
        };

      case 4:
        return {
          id: 4,
          tipo: 'custos',
          html: `
            <div class="pitch-slide-header">
              <span class="pitch-slide-tag" style="color: #f87171;">Diagnóstico de Risco</span>
              <h2 class="pitch-slide-title">O Custo Oculto da Ausência de Planejamento</h2>
              <p class="pitch-slide-subtitle">Prejuízo tributário e processual estimado em caso de inventário tradicional.</p>
            </div>

            <div class="pitch-two-cols">
              <div class="pitch-card-dark" style="border-color: rgba(248, 113, 113, 0.3); background: linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, rgba(24, 24, 27, 0.8) 100%);">
                <div class="pitch-number-label" style="color: #f87171;">Prejuízo Tributário Consolidado</div>
                <div class="pitch-big-number alerta" style="margin: 10px 0 16px 0;">${d.totalCustosFormatado}</div>
                <p style="font-size: 13.5px; color: #a1a1aa; line-height: 1.6;">
                  Representa a perda de capital que a família deverá desembolsar à vista para transferir os bens deixados pelo titular, exigindo liquidez imediata em até 60 dias para evitar multas de mora da Fazenda Estadual.
                </p>

                <div style="margin-top: 18px; padding: 12px 16px; background: rgba(0, 0, 0, 0.3); border-radius: 10px; font-size: 12px; color: #fca5a5;">
                  ⚠️ Sem planejamento, o inventário pode forçar a liquidação de imóveis ou ações com deságio de até 30%.
                </div>
              </div>

              <div class="pitch-card-dark">
                <div class="pitch-number-label">Composição dos Custos de Transmissão</div>
                <div class="pitch-custos-breakdown" style="margin-top: 14px;">
                  <div class="pitch-custo-row">
                    <span class="pitch-custo-name">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background: #f87171;"></span>
                      ITCMD Estadual (${d.itcmdTaxa}%)
                    </span>
                    <span class="pitch-custo-val danger">${d.itcmdFormatado}</span>
                  </div>
                  <div class="pitch-custo-row">
                    <span class="pitch-custo-name">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background: #fb923c;"></span>
                      Custas Judiciais e Cartorárias
                    </span>
                    <span class="pitch-custo-val">${d.custasFormatadas}</span>
                  </div>
                  <div class="pitch-custo-row">
                    <span class="pitch-custo-name">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background: #facc15;"></span>
                      Honorários Advocatícios
                    </span>
                    <span class="pitch-custo-val">${d.honorariosFormatados}</span>
                  </div>
                </div>

                <div style="margin-top: 20px; padding: 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: 700;">Cenário Projetado Futuro</div>
                  <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;">
                    <span style="font-size: 13px; color: #a1a1aa;">Patrimônio: ${d.totalProjetadoFormatado}</span>
                    <span style="font-size: 15px; font-weight: 700; color: #f87171;">Prejuízo: ${d.prejuizoProjetadoFormatado}</span>
                  </div>
                </div>
              </div>
            </div>
          `
        };

      case 5:
        return {
          id: 5,
          tipo: 'estrategias',
          html: `
            <div class="pitch-slide-header">
              <span class="pitch-slide-tag" style="color: #34d399;">Soluções Estratégicas</span>
              <h2 class="pitch-slide-title">Estratégias de Preservação &amp; Liquidez</h2>
              <p class="pitch-slide-subtitle">Soluções para mitigar o impacto tributário e blindar a transferência geracional.</p>
            </div>

            <div class="pitch-strategies-grid">
              <div class="pitch-strat-card destaque">
                <div>
                  <div class="pitch-strat-title">
                    <span>1. Doação com Usufruto</span>
                  </div>
                  <div class="pitch-strat-body" style="margin-top: 8px;">
                    Antecipação da herança com reserva vitalícia de usufruto ao titular, aproveitando faixas de isenção e congelando a base de cálculo tributária.
                  </div>
                </div>
                <div>
                  <div class="pitch-number-label" style="color: #34d399;">Economia Estimada</div>
                  <div class="pitch-strat-val">${d.doacaoEconomia}</div>
                </div>
              </div>

              <div class="pitch-strat-card">
                <div>
                  <div class="pitch-strat-title">
                    <span>2. Previdência Privada</span>
                  </div>
                  <div class="pitch-strat-body" style="margin-top: 8px;">
                    Transmissão rápida de recursos sem passar pelo inventário cível, com isenção de IOF até R$ 600.000/ano e livre indicação de beneficiários.
                  </div>
                </div>
                <div>
                  <div class="pitch-number-label">Liquidez Familiar</div>
                  <div style="font-size: 16px; font-weight: 700; color: #ffffff;">Disponibilidade Rápida</div>
                </div>
              </div>

              <div class="pitch-strat-card">
                <div>
                  <div class="pitch-strat-title">
                    <span>3. Seguro Sucessório</span>
                  </div>
                  <div class="pitch-strat-body" style="margin-top: 8px;">
                    Garante 100% da liquidez necessária para pagar o inventário através de uma fração de desembolso mensal em 120 parcelas, 100% isento de impostos.
                  </div>
                </div>
                <div>
                  <div class="pitch-number-label">Economia de Liquidez</div>
                  <div class="pitch-strat-val">${d.seguroEconomia !== '—' ? d.seguroEconomia : 'Alavancagem Imediata'}</div>
                </div>
              </div>
            </div>

            <div style="margin-top: 20px; padding: 14px 20px; background: rgba(52, 211, 153, 0.06); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13.5px; color: #d1fae5;">
                A combinação integrada dessas ferramentas permite reduzir até <strong>70% dos custos totais</strong> de inventário e blindar a família contra bloqueios de contas.
              </span>
            </div>
          `
        };

      case 6:
        return {
          id: 6,
          tipo: 'evolucao',
          html: `
            <div class="pitch-slide-header">
              <span class="pitch-slide-tag">Visão de Futuro</span>
              <h2 class="pitch-slide-title">Projeção Patrimonial &amp; Próximos Passos</h2>
              <p class="pitch-slide-subtitle">Construção de valor sustentável e roteiro de implementação com o assessor.</p>
            </div>

            <div class="pitch-two-cols">
              <div class="pitch-card-dark" style="display: flex; flex-direction: column; justify-content: center;">
                <div class="pitch-number-label" style="margin-bottom: 12px;">Curva de Evolução Composta</div>
                <div style="width: 100%; height: 240px; position: relative;">
                  <canvas id="pitch_chart_evolucao"></canvas>
                </div>
              </div>

              <div class="pitch-card-dark" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div class="pitch-number-label">Roteiro de Implementação Recomendado</div>
                  <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 14px;">
                    <div style="display: flex; align-items: center; gap: 12px; font-size: 13px; color: #e4e4e7;">
                      <span style="width: 22px; height: 22px; border-radius: 50%; background: #38bdf8; color: #09090b; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center;">1</span>
                      <span>Alocação de liquidez sucessória e proteção imediata</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; font-size: 13px; color: #e4e4e7;">
                      <span style="width: 22px; height: 22px; border-radius: 50%; background: #38bdf8; color: #09090b; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center;">2</span>
                      <span>Elaboração da estrutura de holding ou doação em vida</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; font-size: 13px; color: #e4e4e7;">
                      <span style="width: 22px; height: 22px; border-radius: 50%; background: #38bdf8; color: #09090b; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center;">3</span>
                      <span>Revisão periódica anual das alíquotas estaduais (ITCMD)</span>
                    </div>
                  </div>
                </div>

                <div class="pitch-cta-box" style="margin-top: 16px;">
                  <div class="pitch-cta-text">
                    <h4>Documentação Executiva</h4>
                    <p>O relatório formal de 5 páginas está disponível para consulta e assinatura.</p>
                  </div>
                  <button type="button" class="btn-pitch-view-pdf" onclick="fecharApresentacaoPitch(); if (window.abrirPreview) window.abrirPreview();">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>Ver Relatório PDF</span>
                  </button>
                </div>
              </div>
            </div>
          `
        };

      default:
        return { id: 0, html: '<div>Slide não encontrado</div>' };
    }
  }

  // =============================================================================
  // RENDERIZAÇÃO DE GRÁFICOS DINÂMICOS NOS SLIDES
  // =============================================================================

  function destruirGraficosPitch() {
    graficosPitch.forEach(g => {
      try { g.destroy(); } catch (e) {}
    });
    graficosPitch = [];
  }

  function renderizarGraficosSlide(slideIdx, d) {
    if (!slidesMontados[slideIdx]) return;
    const tipo = slidesMontados[slideIdx].tipo;

    if (tipo === 'patrimonio') {
      const canvas = document.getElementById('pitch_chart_patrimonio');
      if (canvas && typeof Chart !== 'undefined') {
        const existente = Chart.getChart(canvas);
        if (existente) existente.destroy();

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Financeiro', 'Imóveis', 'Empresas', 'Outros'],
            datasets: [{
              data: [d.totalFinanceiro, d.totalImoveis, d.totalEmpresas, d.outrosBens],
              backgroundColor: ['#38bdf8', '#818cf8', '#34d399', '#f59e0b'],
              borderColor: '#09090b',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { color: '#a1a1aa', font: { size: 11, family: 'Plus Jakarta Sans' } }
              },
              datalabels: { display: false }
            },
            cutout: '65%'
          }
        });
        graficosPitch.push(chart);
      }
    } else if (tipo === 'evolucao') {
      const canvas = document.getElementById('pitch_chart_evolucao');
      if (canvas && typeof Chart !== 'undefined') {
        const existente = Chart.getChart(canvas);
        if (existente) existente.destroy();

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Hoje', 'Ano 3', 'Ano 5', 'Ano 10', 'Ano 15', 'Ano 20'],
            datasets: [{
              label: 'Patrimônio Projetado',
              data: [
                d.totalPatrimonio,
                d.totalPatrimonio * 1.25,
                d.totalPatrimonio * 1.48,
                d.totalPatrimonio * 2.2,
                d.totalPatrimonio * 3.4,
                d.totalPatrimonio * 5.1
              ],
              borderColor: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              fill: true,
              tension: 0.35,
              borderWidth: 2.5,
              pointBackgroundColor: '#38bdf8',
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#71717a', font: { size: 10 } }
              },
              y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  color: '#71717a',
                  font: { size: 10 },
                  callback: function (val) {
                    return 'R$ ' + (val / 1000000).toFixed(1) + 'M';
                  }
                }
              }
            },
            plugins: {
              legend: { display: false },
              datalabels: { display: false }
            }
          }
        });
        graficosPitch.push(chart);
      }
    }
  }

  if (typeof window !== 'undefined') {
    const initLucide = () => {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initLucide);
    } else {
      setTimeout(initLucide, 50);
    }
  }

})();
