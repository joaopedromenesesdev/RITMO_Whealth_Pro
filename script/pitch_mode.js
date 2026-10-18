/**
 * =============================================================================
 * PITCH MODE — MODO APRESENTAÇÃO
 * Ritmo Wealth Pro — Apresentação em tela cheia a partir do módulo tributário.
 *
 * Os valores exibidos seguem exatamente as mesmas regras de calcularPrejuizo()
 * em tributario.js (mesma base, mesmas taxas), para que slides e tela batam.
 * =============================================================================
 */

(function () {
  'use strict';

  const TODOS_BLOCOS = [
    { id: 1, nome: 'Capa do Planejamento', desc: 'Cliente, assessor e data da reunião' },
    { id: 2, nome: 'Raio-X Patrimonial', desc: 'Composição de ativos e liquidez' },
    { id: 3, nome: 'Estrutura Familiar', desc: 'Regime de bens, herdeiros e legítima' },
    { id: 4, nome: 'Custo do Inventário', desc: 'ITCMD, honorários e custas' },
    { id: 5, nome: 'Estratégias de Preservação', desc: 'Doação em vida, previdência e seguro' },
    { id: 6, nome: 'Projeção e Próximos Passos', desc: 'Evolução patrimonial e encerramento' }
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
  let dadosApresentacao = null;
  let graficosPitch = [];

  // =============================================================================
  // UTILITÁRIOS
  // =============================================================================

  function escapeHtml(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseValor(v) {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const s = v.toString().replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
  }

  function brl(valor) {
    return 'R$ ' + Math.round(Number(valor) || 0).toLocaleString('pt-BR');
  }

  function lerJSON(chave, padrao) {
    try {
      const raw = sessionStorage.getItem(chave);
      return raw ? (JSON.parse(raw) || padrao) : padrao;
    } catch (e) {
      return padrao;
    }
  }

  function textoElemento(id) {
    const el = document.getElementById(id);
    const txt = el ? (el.innerText || '').trim() : '';
    return txt && txt !== '—' && txt !== '-' ? txt : '';
  }

  // =============================================================================
  // MODAL DE CONFIGURAÇÃO
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
        atualizarUIConfiguracao();
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
      <div class="pitch-config-modal" role="dialog" aria-modal="true" aria-labelledby="pitch_config_titulo">
        <div class="pitch-config-header">
          <div>
            <h3 id="pitch_config_titulo">Configurar Modo Apresentação</h3>
            <p>Escolha quais slides serão apresentados ao cliente.</p>
          </div>
          <button type="button" class="btn-pitch-close-config" onclick="fecharConfiguracaoPitch()" title="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="pitch-config-body">
          <div>
            <div class="pitch-section-label">Roteiros sugeridos</div>
            <div class="pitch-presets-grid">
              <div class="pitch-preset-card" id="preset_completa" onclick="selecionarPresetPitch('completa')">
                <span class="preset-name">Completa</span>
                <span class="preset-desc">Todos os 6 slides</span>
              </div>
              <div class="pitch-preset-card" id="preset_sucessorio" onclick="selecionarPresetPitch('sucessorio')">
                <span class="preset-name">Foco Sucessório</span>
                <span class="preset-desc">Família, custo do inventário e estratégias</span>
              </div>
              <div class="pitch-preset-card" id="preset_patrimonial" onclick="selecionarPresetPitch('patrimonial')">
                <span class="preset-name">Foco Patrimonial</span>
                <span class="preset-desc">Ativos, custos, estratégias e projeção</span>
              </div>
            </div>
          </div>

          <div>
            <div class="pitch-section-label">Slides</div>
            <div class="pitch-blocks-list">
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
          <button type="button" class="btn-pitch-launch" id="btn_pitch_iniciar" onclick="iniciarApresentacaoPitch()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Iniciar Apresentação</span>
          </button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) window.fecharConfiguracaoPitch();
    });

    return overlay;
  }

  function atualizarUIConfiguracao() {
    ['completa', 'sucessorio', 'patrimonial'].forEach(p => {
      const el = document.getElementById(`preset_${p}`);
      if (el) el.classList.toggle('ativo', presetAtual === p);
    });

    TODOS_BLOCOS.forEach(b => {
      const chk = document.getElementById(`chk_pitch_${b.id}`);
      if (chk) chk.checked = blocosAtivos.includes(b.id);
    });

    const countEl = document.getElementById('pitch_active_count');
    if (countEl) countEl.innerText = blocosAtivos.length;
  }

  // =============================================================================
  // APRESENTAÇÃO
  // =============================================================================

  window.iniciarApresentacaoPitch = function () {
    window.fecharConfiguracaoPitch();

    let pitchOverlay = document.getElementById('pitch_fullscreen_overlay');
    if (!pitchOverlay) {
      pitchOverlay = criarPitchOverlayDOM();
      document.body.appendChild(pitchOverlay);
    }

    // Garante que os números da tela estão atualizados antes de coletar
    if (typeof window.calcularPrejuizo === 'function') {
      try { window.calcularPrejuizo(); } catch (e) { /* mantém valores atuais */ }
    }

    dadosApresentacao = coletarDadosSimulacao();
    slidesMontados = blocosAtivos.map(id => gerarSlide(id, dadosApresentacao));

    const container = pitchOverlay.querySelector('#pitch_slide_container');
    container.innerHTML = slidesMontados.map((s, idx) => `
      <section class="pitch-slide" id="pitch_slide_${idx}">${s.html}</section>
    `).join('');

    pitchOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', lidarComTecladoPitch);

    slideIndexAtual = 0;
    mostrarSlide(0);
  };

  window.fecharApresentacaoPitch = function () {
    const pitchOverlay = document.getElementById('pitch_fullscreen_overlay');
    if (pitchOverlay) pitchOverlay.style.display = 'none';
    document.body.style.overflow = '';
    window.removeEventListener('keydown', lidarComTecladoPitch);
    destruirGraficosPitch();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
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
      pitchOverlay.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  window.pitchAbrirRelatorio = function () {
    window.fecharApresentacaoPitch();
    if (typeof window.abrirPreview === 'function') window.abrirPreview();
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
      <div class="pitch-progress-track">
        <div class="pitch-progress-bar" id="pitch_progress_bar" style="width: 0%;"></div>
      </div>

      <header class="pitch-top-bar">
        <div class="pitch-brand-logo">Ritmo <span>Wealth Pro</span></div>
        <div class="pitch-top-controls">
          <button type="button" class="pitch-btn-icon" onclick="pitchAlternarFullscreen()" title="Tela cheia (F)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
          <button type="button" class="pitch-btn-icon" id="btn_pitch_fechar" onclick="fecharApresentacaoPitch()" title="Fechar (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </header>

      <main class="pitch-stage">
        <div class="pitch-slide-container" id="pitch_slide_container"></div>
      </main>

      <div class="pitch-bottom-bar">
        <button type="button" class="pitch-btn-nav" id="btn_pitch_prev" onclick="pitchSlideAnterior()" title="Slide anterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div class="pitch-counter" id="pitch_slide_counter">Slide <strong>1</strong> de 1</div>
        <button type="button" class="pitch-btn-nav" id="btn_pitch_next" onclick="pitchProximoSlide()" title="Próximo slide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
        <div class="pitch-hint">
          <span class="pitch-kbd">&larr;</span><span class="pitch-kbd">&rarr;</span> navegar
          <span class="pitch-kbd">F</span> tela cheia
          <span class="pitch-kbd">Esc</span> sair
        </div>
      </div>
    `;

    return overlay;
  }

  function mostrarSlide(idx) {
    const container = document.getElementById('pitch_slide_container');
    if (!container) return;

    const total = slidesMontados.length;
    container.querySelectorAll('.pitch-slide').forEach((sl, i) => {
      sl.classList.toggle('ativo', i === idx);
      sl.classList.toggle('anterior', i < idx);
    });

    const progressBar = document.getElementById('pitch_progress_bar');
    if (progressBar) progressBar.style.width = `${total > 1 ? (idx / (total - 1)) * 100 : 100}%`;

    const counter = document.getElementById('pitch_slide_counter');
    if (counter) counter.innerHTML = `Slide <strong>${idx + 1}</strong> de ${total}`;

    const btnPrev = document.getElementById('btn_pitch_prev');
    const btnNext = document.getElementById('btn_pitch_next');
    if (btnPrev) btnPrev.disabled = idx === 0;
    if (btnNext) btnNext.disabled = idx === total - 1;

    renderizarGraficosSlide(idx);
  }

  // =============================================================================
  // DADOS (mesmas regras de calcularPrejuizo em tributario.js)
  // =============================================================================

  function coletarDadosSimulacao() {
    const familia = lerJSON('familia', {});
    const pat = lerJSON('patrimonio_dados', {});
    const evolucao = lerJSON('evolucao_dados', {});
    const inputsTrib = lerJSON('tributario_inputs', {});

    const rf = parseValor(pat.rf);
    const rv = parseValor(pat.rv);
    const inter = parseValor(pat.inter);
    const prev = parseValor(pat.prev);
    const offshore = parseValor(pat.offshore);
    const totalFinanceiro = rf + rv + inter + prev + offshore;
    const totalImoveis = parseValor(pat.apt) + parseValor(pat.casa) + parseValor(pat.terr) + parseValor(pat.galp);

    let totalEmpresas = 0;
    if (Array.isArray(pat.empresas)) {
      pat.empresas.forEach(emp => {
        totalEmpresas += parseValor(emp.valor) * ((Number(emp.pct) || 0) / 100);
      });
    }
    const outrosBens = parseValor(pat.bens);

    // Base de cálculo idêntica a tributario.js
    const calc = window.dadosCalculo || {};
    const totalAtual = Number(calc.totalAtual) || Number(sessionStorage.getItem('total_patrimonio')) || 0;
    const resultados = Array.isArray(evolucao.resultados) ? evolucao.resultados : [];
    const resultadosPrev = Array.isArray(evolucao.resultadosPrev) ? evolucao.resultadosPrev : [];
    const totalProjetado = Number(calc.totalProjetado) || (resultados.length ? resultados[resultados.length - 1] : totalAtual);
    const prevProjetado = Number(calc.prevProjetado) || (resultadosPrev.length ? resultadosPrev[resultadosPrev.length - 1] : prev);
    const regime = calc.regime || familia.regime || 'Não informado';

    const taxaItcmd = Number(document.getElementById('taxa_itcmd')?.value) || 0;
    const taxaHonorarios = Number(document.getElementById('taxa_honorarios')?.value) || 0;
    const taxaCustas = Number(document.getElementById('taxa_custas')?.value) || 0;
    const taxaTotal = taxaItcmd + taxaHonorarios + taxaCustas;

    const regimeLower = String(regime).toLowerCase();
    const multiplicadorRegime = (regimeLower.includes('comunhão') || regimeLower.includes('participação final') || regimeLower.includes('aquestos')) ? 0.5 : 1;

    const baseAtual = Math.max(0, totalAtual - prev) * multiplicadorRegime;
    const baseProjetada = Math.max(0, totalProjetado - prevProjetado) * multiplicadorRegime;

    const custoItcmd = baseAtual * (taxaItcmd / 100);
    const custoHonorarios = baseAtual * (taxaHonorarios / 100);
    const custoCustas = baseAtual * (taxaCustas / 100);
    const prejuizoAtual = baseAtual * (taxaTotal / 100);
    const prejuizoProjetado = baseProjetada * (taxaTotal / 100);

    // Liquidez: mesma composição do alarme de liquidez em tributario.js
    const liquidez = rf + prev + inter + offshore;

    const estadoCivil = String(familia.estadoCivil || '').toLowerCase();
    const temFilhos = familia.temFilhos === 'sim';
    const idadesFilhos = Array.isArray(familia.idadesFilhos) ? familia.idadesFilhos : [];
    const qtdFilhos = temFilhos ? Math.max(parseInt(familia.qtdFilhos) || 0, idadesFilhos.length) : 0;

    return {
      cliente: (familia.nome || '').trim() || 'Cliente',
      assessor: (sessionStorage.getItem('nome_assessor') || '').trim(),
      data: sessionStorage.getItem('data_reuniao') || new Date().toLocaleDateString('pt-BR'),

      totalAtual, totalProjetado, totalFinanceiro, totalImoveis, totalEmpresas, outrosBens,
      previdencia: prev, offshore, liquidez,

      regime, estadoCivil, temFilhos, qtdFilhos,
      nomeConjuge: (familia.conjuge || '').trim(),
      possuiPais: familia.possuiPais === 'sim',

      taxaItcmd, taxaHonorarios, taxaCustas, taxaTotal, multiplicadorRegime,
      baseAtual, custoItcmd, custoHonorarios, custoCustas, prejuizoAtual, prejuizoProjetado,

      doacaoAnual: Number(inputsTrib.doacao) || 0,
      tempoDoacao: textoElemento('tempo_atual_doacao'),
      previdenciaAporte: Number(inputsTrib.previdencia) || 0,
      previdenciaCustoTotal: textoElemento('previdencia_custo_total'),
      seguroCapital: textoElemento('seguro_resultado_capital'),
      seguroParcela: textoElemento('seguro_resultado_parcela'),
      seguroEconomia: textoElemento('seguro_resultado_economia'),

      evolucaoAnos: Array.isArray(evolucao.anos) ? evolucao.anos : [],
      evolucaoResultados: resultados,
      evolucaoTempo: evolucao.tempo || ''
    };
  }

  // =============================================================================
  // SLIDES
  // =============================================================================

  function cabecalho(tag, titulo, subtitulo) {
    return `
      <div class="pitch-slide-header">
        <span class="pitch-slide-tag">${tag}</span>
        <h2 class="pitch-slide-title">${titulo}</h2>
        ${subtitulo ? `<p class="pitch-slide-subtitle">${subtitulo}</p>` : ''}
      </div>
    `;
  }

  function gerarSlide(idBloco, d) {
    switch (idBloco) {
      case 1: return { tipo: 'capa', html: slideCapa(d) };
      case 2: return { tipo: 'patrimonio', html: slidePatrimonio(d) };
      case 3: return { tipo: 'familia', html: slideFamilia(d) };
      case 4: return { tipo: 'custos', html: slideCustos(d) };
      case 5: return { tipo: 'estrategias', html: slideEstrategias(d) };
      case 6: return { tipo: 'evolucao', html: slideEvolucao(d) };
      default: return { tipo: '', html: '' };
    }
  }

  function slideCapa(d) {
    return `
      <div class="pitch-capa">
        <div class="pitch-capa-brand">Ritmo Wealth Pro</div>
        <h1 class="pitch-capa-title">Planejamento Patrimonial e Sucessório</h1>
        <div class="pitch-capa-divider"></div>
        <div class="pitch-capa-label">Preparado para</div>
        <div class="pitch-capa-client">${escapeHtml(d.cliente)}</div>
        <div class="pitch-capa-meta">
          ${d.assessor ? `<div>Assessor: <strong>${escapeHtml(d.assessor)}</strong></div>` : ''}
          <div>Data: <strong>${escapeHtml(d.data)}</strong></div>
        </div>
      </div>
    `;
  }

  function slidePatrimonio(d) {
    const pctLiquidez = d.totalAtual > 0 ? Math.round((d.liquidez / d.totalAtual) * 100) : 0;
    return `
      ${cabecalho('Raio-X Patrimonial', 'Composição do patrimônio', 'Distribuição dos bens por classe de ativo.')}

      <div class="pitch-metrics-grid">
        <div class="pitch-card">
          <div class="pitch-card-label">Patrimônio total</div>
          <div class="pitch-big-number">${brl(d.totalAtual)}</div>
        </div>
        <div class="pitch-card">
          <div class="pitch-card-label">Aplicações financeiras</div>
          <div class="pitch-big-number">${brl(d.totalFinanceiro)}</div>
        </div>
        <div class="pitch-card">
          <div class="pitch-card-label">Imóveis</div>
          <div class="pitch-big-number">${brl(d.totalImoveis)}</div>
        </div>
        <div class="pitch-card">
          <div class="pitch-card-label">Participações societárias</div>
          <div class="pitch-big-number">${brl(d.totalEmpresas)}</div>
        </div>
      </div>

      <div class="pitch-two-cols">
        <div class="pitch-card">
          <div class="pitch-card-label">Composição por classe</div>
          <div class="pitch-chart-box"><canvas id="pitch_chart_patrimonio"></canvas></div>
        </div>
        <div class="pitch-card">
          <div class="pitch-card-label">Liquidez disponível</div>
          <div class="pitch-big-number">${brl(d.liquidez)}</div>
          <p class="pitch-paragraph">
            Renda fixa, previdência, fundos internacionais e offshore representam
            <strong>${pctLiquidez}%</strong> do patrimônio. Imóveis e participações exigem
            planejamento para não precisarem ser vendidos às pressas em um inventário.
          </p>
          <div class="pitch-rows" style="margin-top: 14px;">
            <div class="pitch-row">
              <span class="pitch-row-label">Previdência privada</span>
              <span class="pitch-row-value">${brl(d.previdencia)}</span>
            </div>
            <div class="pitch-row">
              <span class="pitch-row-label">Offshore</span>
              <span class="pitch-row-value">${brl(d.offshore)}</span>
            </div>
            <div class="pitch-row">
              <span class="pitch-row-label">Outros bens</span>
              <span class="pitch-row-value">${brl(d.outrosBens)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function slideFamilia(d) {
    const casado = d.estadoCivil === 'casado';
    let herdeiros;
    if (d.temFilhos && d.qtdFilhos > 0) {
      herdeiros = `${d.qtdFilhos} filho${d.qtdFilhos > 1 ? 's' : ''}${casado ? ' e cônjuge, conforme o regime' : ''}`;
    } else if (d.possuiPais) {
      herdeiros = `Ascendentes${casado ? ' e cônjuge' : ''}`;
    } else if (casado) {
      herdeiros = 'Cônjuge';
    } else {
      herdeiros = 'Não informado';
    }

    const meacaoTexto = d.multiplicadorRegime === 0.5
      ? 'Neste regime, metade do patrimônio comum pertence ao cônjuge (meação) e não entra na base do inventário.'
      : 'Neste cenário, a base do inventário considera a totalidade do patrimônio (descontada a previdência).';

    return `
      ${cabecalho('Estrutura Familiar', 'Regime de bens e herdeiros', 'Como a família e o regime de casamento afetam a sucessão.')}

      <div class="pitch-two-cols">
        <div class="pitch-card">
          <div class="pitch-rows">
            <div class="pitch-row">
              <span class="pitch-row-label">Titular</span>
              <span class="pitch-row-value">${escapeHtml(d.cliente)}</span>
            </div>
            ${casado ? `
            <div class="pitch-row">
              <span class="pitch-row-label">Cônjuge</span>
              <span class="pitch-row-value">${escapeHtml(d.nomeConjuge || 'Informado')}</span>
            </div>` : ''}
            <div class="pitch-row">
              <span class="pitch-row-label">Regime de bens</span>
              <span class="pitch-row-value">${escapeHtml(casado ? d.regime : 'Não se aplica')}</span>
            </div>
            <div class="pitch-row">
              <span class="pitch-row-label">Herdeiros</span>
              <span class="pitch-row-value">${escapeHtml(herdeiros)}</span>
            </div>
            <div class="pitch-row">
              <span class="pitch-row-label">Base do inventário</span>
              <span class="pitch-row-value">${brl(d.baseAtual)}</span>
            </div>
          </div>
          <div class="pitch-note">${meacaoTexto}</div>
        </div>

        <div class="pitch-card">
          <div class="pitch-card-label">Pontos de atenção</div>
          <ul class="pitch-list">
            <li><span class="pitch-list-num">1</span><span><strong>Legítima:</strong> metade do patrimônio é reservada por lei aos herdeiros necessários.</span></li>
            <li><span class="pitch-list-num">2</span><span><strong>Parte disponível:</strong> a outra metade pode ser direcionada por testamento ou doação.</span></li>
            <li><span class="pitch-list-num">3</span><span><strong>Previdência:</strong> não entra no inventário e é paga diretamente aos beneficiários indicados.</span></li>
          </ul>
        </div>
      </div>
    `;
  }

  function slideCustos(d) {
    const faltaLiquidez = d.prejuizoAtual > d.liquidez && d.totalAtual > 0;
    return `
      ${cabecalho('Custo do Inventário', 'Quanto custa transferir o patrimônio hoje', 'Estimativa sem planejamento, com as taxas configuradas nesta simulação.')}

      <div class="pitch-two-cols">
        <div class="pitch-card">
          <div class="pitch-card-label">Custo total estimado (cenário atual)</div>
          <div class="pitch-big-number lg pitch-text-prejuizo">${brl(d.prejuizoAtual)}</div>
          <p class="pitch-paragraph">
            ${d.totalAtual > 0 ? `${((d.prejuizoAtual / d.totalAtual) * 100).toFixed(1)}% do patrimônio total.` : ''}
            Valor que a família precisaria desembolsar para concluir a transferência dos bens.
          </p>
          <div class="pitch-note">
            ${faltaLiquidez
              ? `A liquidez disponível (<strong>${brl(d.liquidez)}</strong>) não cobre esse custo. Sem planejamento, a família pode precisar vender imóveis ou participações com deságio.`
              : `A liquidez disponível (<strong>${brl(d.liquidez)}</strong>) cobre esse custo, mas o pagamento reduz diretamente a herança recebida.`}
          </div>
        </div>

        <div class="pitch-card">
          <div class="pitch-card-label">Composição do custo</div>
          <div class="pitch-rows">
            <div class="pitch-row">
              <span class="pitch-row-label">ITCMD (${d.taxaItcmd}%)</span>
              <span class="pitch-row-value">${brl(d.custoItcmd)}</span>
            </div>
            <div class="pitch-row">
              <span class="pitch-row-label">Honorários advocatícios (${d.taxaHonorarios}%)</span>
              <span class="pitch-row-value">${brl(d.custoHonorarios)}</span>
            </div>
            <div class="pitch-row">
              <span class="pitch-row-label">Custas e cartório (${d.taxaCustas}%)</span>
              <span class="pitch-row-value">${brl(d.custoCustas)}</span>
            </div>
            <div class="pitch-row total">
              <span class="pitch-row-label">Total</span>
              <span class="pitch-row-value pitch-text-prejuizo">${brl(d.prejuizoAtual)}</span>
            </div>
          </div>
          <div class="pitch-note">
            No cenário projetado (patrimônio de <strong>${brl(d.totalProjetado)}</strong>), o custo estimado sobe para
            <strong class="pitch-text-prejuizo">${brl(d.prejuizoProjetado)}</strong>.
          </div>
        </div>
      </div>
    `;
  }

  function slideEstrategias(d) {
    const naoSimulado = '<div class="pitch-strat-value muted">Não simulado</div>';

    const doacaoValor = d.doacaoAnual > 0
      ? `<div class="pitch-card-label">Doação anual simulada</div><div class="pitch-strat-value">${brl(d.doacaoAnual)}</div>`
      : naoSimulado;

    const prevValor = d.previdenciaAporte > 0
      ? `<div class="pitch-card-label">Aporte simulado</div><div class="pitch-strat-value">${brl(d.previdenciaAporte)}</div>`
      : naoSimulado;

    const seguroValor = d.seguroCapital
      ? `<div class="pitch-card-label">Capital segurado</div><div class="pitch-strat-value">${escapeHtml(d.seguroCapital)}</div>
         ${d.seguroParcela ? `<div class="pitch-paragraph" style="margin-top:4px;">Parcela mensal: <strong>${escapeHtml(d.seguroParcela)}</strong></div>` : ''}
         ${d.seguroEconomia ? `<div class="pitch-paragraph" style="margin-top:2px;">Economia estimada: <strong class="pitch-text-economia">${escapeHtml(d.seguroEconomia)}</strong></div>` : ''}`
      : naoSimulado;

    return `
      ${cabecalho('Estratégias de Preservação', 'Como reduzir o custo e garantir liquidez', 'Alternativas analisadas nesta simulação.')}

      <div class="pitch-strategies-grid">
        <div class="pitch-card pitch-strat-card">
          <div>
            <h3 class="pitch-strat-title">Doação em vida</h3>
            <p class="pitch-paragraph">Transferência gradual de bens aos herdeiros enquanto o titular está vivo, reduzindo o patrimônio sujeito ao inventário.</p>
          </div>
          <div>${doacaoValor}</div>
        </div>

        <div class="pitch-card pitch-strat-card">
          <div>
            <h3 class="pitch-strat-title">Previdência privada</h3>
            <p class="pitch-paragraph">Os recursos não entram no inventário e são pagos diretamente aos beneficiários indicados pelo titular.</p>
          </div>
          <div>${prevValor}</div>
        </div>

        <div class="pitch-card pitch-strat-card">
          <div>
            <h3 class="pitch-strat-title">Seguro sucessão</h3>
            <p class="pitch-paragraph">Garante liquidez imediata para a família pagar as despesas do inventário sem vender patrimônio.</p>
          </div>
          <div>${seguroValor}</div>
        </div>
      </div>
    `;
  }

  function slideEvolucao(d) {
    const temEvolucao = d.evolucaoResultados.length > 1;
    return `
      ${cabecalho('Projeção e Próximos Passos', 'Evolução do patrimônio', temEvolucao && d.evolucaoTempo ? `Projeção para ${escapeHtml(d.evolucaoTempo)} anos, conforme premissas da etapa de evolução.` : '')}

      <div class="pitch-two-cols">
        <div class="pitch-card">
          <div class="pitch-card-label">Patrimônio projetado</div>
          ${temEvolucao
            ? `<div class="pitch-chart-box"><canvas id="pitch_chart_evolucao"></canvas></div>`
            : `<div class="pitch-empty-state">Preencha a etapa de Evolução Patrimonial para exibir a projeção.</div>`}
        </div>

        <div class="pitch-card">
          <div class="pitch-card-label">Próximos passos</div>
          <ul class="pitch-list">
            <li><span class="pitch-list-num">1</span><span>Definir a estratégia de liquidez para o custo do inventário.</span></li>
            <li><span class="pitch-list-num">2</span><span>Estruturar doações ou holding com apoio jurídico e contábil.</span></li>
            <li><span class="pitch-list-num">3</span><span>Revisar o planejamento periodicamente.</span></li>
          </ul>

          <div class="pitch-cta">
            <div>
              <h4>Relatório completo</h4>
              <p>Todos os detalhes desta análise em PDF.</p>
            </div>
            <button type="button" class="btn-pitch-view-pdf" onclick="pitchAbrirRelatorio()">Ver relatório PDF</button>
          </div>
        </div>
      </div>
    `;
  }

  // =============================================================================
  // GRÁFICOS (tons de zinc, como o restante do sistema)
  // =============================================================================

  function destruirGraficosPitch() {
    graficosPitch.forEach(g => { try { g.destroy(); } catch (e) { } });
    graficosPitch = [];
  }

  function renderizarGraficosSlide(slideIdx) {
    const slide = slidesMontados[slideIdx];
    if (!slide || !dadosApresentacao || typeof Chart === 'undefined') return;
    const d = dadosApresentacao;

    if (slide.tipo === 'patrimonio') {
      const canvas = document.getElementById('pitch_chart_patrimonio');
      if (!canvas || Chart.getChart(canvas)) return;

      graficosPitch.push(new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Financeiro', 'Imóveis', 'Empresas', 'Outros bens'],
          datasets: [{
            data: [d.totalFinanceiro, d.totalImoveis, d.totalEmpresas, d.outrosBens],
            backgroundColor: ['#09090b', '#52525b', '#a1a1aa', '#e4e4e7'],
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { position: 'right', labels: { color: '#52525b', font: { size: 12 } } },
            datalabels: { display: false },
            tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${brl(ctx.raw)}` } }
          }
        }
      }));
    } else if (slide.tipo === 'evolucao') {
      const canvas = document.getElementById('pitch_chart_evolucao');
      if (!canvas || Chart.getChart(canvas)) return;

      const labels = d.evolucaoAnos.map(a => {
        const raw = String(a).replace(/anos?/gi, '').trim();
        return raw !== '' ? `Ano ${raw}` : String(a);
      });

      graficosPitch.push(new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Patrimônio projetado',
            data: d.evolucaoResultados,
            borderColor: '#09090b',
            backgroundColor: 'rgba(9, 9, 11, 0.06)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { display: false }, ticks: { color: '#71717a', maxTicksLimit: 8 } },
            y: {
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                color: '#71717a',
                callback: (val) => val >= 1000000 ? 'R$ ' + (val / 1000000).toFixed(1) + 'M' : 'R$ ' + Math.round(val / 1000) + 'k'
              }
            }
          },
          plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: { callbacks: { label: (ctx) => brl(ctx.raw) } }
          }
        }
      }));
    }
  }

})();
