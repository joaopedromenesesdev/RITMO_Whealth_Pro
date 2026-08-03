// db.js - Abstração de Acesso a Dados (Supabase Primário + LocalStorage Backup)
// Fonte única da verdade: Supabase. LocalStorage é usado como backup offline.

// ─── Auxiliares ──────────────────────────────────────────────────────────────

// Aguarda a sessão Supabase ser restaurada (resolve race condition no carregamento inicial)
function aguardarSessao(timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (!window.supabaseClient) return resolve(null);

    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) return resolve(session);

      const timer = setTimeout(() => {
        sub?.data?.subscription?.unsubscribe();
        resolve(null);
      }, timeoutMs);

      const sub = window.supabaseClient.auth.onAuthStateChange((event, s) => {
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          clearTimeout(timer);
          sub?.data?.subscription?.unsubscribe();
          resolve(s);
        }
      });
    });
  });
}

// Verifica se um ID é um UUID válido (do Supabase)
function isUUID(str) {
  if (!str) return false;
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return pattern.test(str);
}

// Sanitiza valores monetários e numéricos (converte "R$ 1.500,00" ou números para float válido)
function sanitizarNumero(valor, padrao = 0) {
  if (typeof valor === 'number') {
    return isNaN(valor) || !isFinite(valor) ? padrao : valor;
  }
  if (!valor || typeof valor !== 'string') return padrao;
  // Remove R$, espaços, pontos de milhar e substitui vírgula por ponto
  const limpo = valor.replace(/R\$\s?/gi, '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(limpo);
  return isNaN(num) || !isFinite(num) ? padrao : num;
}

// Sanitiza e valida o payload da simulação antes de salvar no Supabase ou LocalStorage
function sanitizarEValidarSimulacao(relatorio) {
  const erros = [];
  const copia = JSON.parse(JSON.stringify(relatorio || {}));

  // Sanitização de campos texto
  copia.nomeCliente = String(copia.nomeCliente || 'Cliente').trim().substring(0, 150);
  copia.nomeAssessor = String(copia.nomeAssessor || 'Assessor').trim().substring(0, 150);
  
  // Sanitização de valores numéricos principais
  copia.totalPatrimonio = sanitizarNumero(copia.totalPatrimonio, 0);
  copia.prejuizoTributario = sanitizarNumero(copia.prejuizoTributario, 0);

  // Validações básicas de consistência
  if (copia.totalPatrimonio < 0) {
    copia.totalPatrimonio = 0;
    erros.push("Total de patrimônio negativo foi ajustado para 0.");
  }
  if (copia.prejuizoTributario < 0) {
    copia.prejuizoTributario = 0;
    erros.push("Prejuízo tributário negativo foi ajustado para 0.");
  }

  // Sanitiza dados de sessão acoplados se existirem
  if (copia.dadosSessao && typeof copia.dadosSessao === 'object') {
    if (copia.dadosSessao.total_patrimonio) {
      copia.dadosSessao.total_patrimonio = sanitizarNumero(copia.dadosSessao.total_patrimonio, copia.totalPatrimonio);
    }
  }

  return {
    relatorioSanitizado: copia,
    valido: erros.length === 0,
    erros
  };
}

// Mapeia linha do Supabase para objeto padronizado
function _mapearLinhaSupabase(item) {
  // dados_completos é JSONB no Supabase, mas pode vir como string se houver double-encoding
  let dadosCompletos = item.dados_completos;
  if (typeof dadosCompletos === "string" && dadosCompletos.length > 0) {
    try {
      dadosCompletos = JSON.parse(dadosCompletos);
      console.log("[_mapearLinhaSupabase] dados_completos era string, convertido para objeto.");
    } catch(e) {
      console.warn("[_mapearLinhaSupabase] Falha ao parsear dados_completos como string:", e);
      dadosCompletos = null;
    }
  }
  return {
    id: item.id,
    nomeCliente: item.nome_cliente,
    nomeAssessor: item.nome_assessor,
    totalPatrimonio: Number(item.total_patrimonio),
    prejuizoTributario: Number(item.prejuizo_tributario),
    dataCriacao: item.data_criacao,
    dataReuniao: dadosCompletos?.data_reuniao || new Date(item.data_criacao).toLocaleDateString("pt-BR"),
    dadosSessao: dadosCompletos
  };
}

// Grava evento de auditoria no Supabase
async function dbRegistrarAuditLog(acao, relatorioId = null, detalhes = {}) {
  if (window.supabaseClient) {
    try {
      const session = await aguardarSessao();
      const userId = session?.user?.id || null;
      await window.supabaseClient.from('audit_logs').insert([{
        user_id: userId,
        relatorio_id: relatorioId ? String(relatorioId) : null,
        acao,
        detalhes
      }]);
    } catch (e) {
      console.warn("[dbRegistrarAuditLog] Não foi possível gravar log de auditoria:", e);
    }
  }
}

// Funções auxiliares para backup local em LocalStorage (Offline / Fallback)
function _obterBackupLocal(userId) {
  if (!userId) return [];
  try {
    const key = `relatorios_backup_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("[_obterBackupLocal] Erro ao carregar backup local:", e);
    return [];
  }
}

function _salvarBackupLocal(userId, relatorios) {
  if (!userId) return;
  try {
    const key = `relatorios_backup_${userId}`;
    localStorage.setItem(key, JSON.stringify(relatorios));
  } catch (e) {
    console.error("[_salvarBackupLocal] Erro ao salvar backup local:", e);
  }
}

function _salvarOuAtualizarItemBackup(userId, relatorio) {
  if (!userId) return;
  const list = _obterBackupLocal(userId);
  const index = list.findIndex(item => item.id === relatorio.id);
  if (index !== -1) {
    list[index] = relatorio;
  } else {
    list.unshift(relatorio);
  }
  _salvarBackupLocal(userId, list);
}

function _removerItemBackup(userId, id) {
  if (!userId) return;
  const list = _obterBackupLocal(userId);
  const filtrados = list.filter(item => item.id !== id);
  _salvarBackupLocal(userId, filtrados);
}

// ─── CRUD Principal ──────────────────────────────────────────────────────────

// Carregar todos os relatórios do Supabase (com fallback para LocalStorage)
async function dbObterRelatorios() {
  if (window.supabaseClient) {
    try {
      const session = await aguardarSessao();
      if (session) {
        const { data, error } = await window.supabaseClient
          .from('relatorios')
          .select('*')
          .eq('user_id', session.user.id)
          .order('data_criacao', { ascending: false });

        if (error) throw error;

        const mapeados = data.map(_mapearLinhaSupabase);
        // Atualiza o backup local com os dados mais recentes do servidor
        _salvarBackupLocal(session.user.id, mapeados);
        return mapeados;
      } else {
        console.warn("[dbObterRelatorios] Sessão não disponível.");
      }
    } catch (e) {
      console.error("[dbObterRelatorios] Erro ao obter relatórios do Supabase:", e);
      // Fallback para backup local
      const session = await aguardarSessao();
      const userId = session?.user?.id;
      if (userId) {
        console.warn("[dbObterRelatorios] Carregando relatórios do backup local (offline).");
        return _obterBackupLocal(userId);
      }
    }
  }

  return [];
}

// Salvar/Atualizar um relatório no Supabase (com sincronização local)
async function dbSalvarRelatorio(relatorioEntrada) {
  const { relatorioSanitizado: relatorio } = sanitizarEValidarSimulacao(relatorioEntrada);
  let idFinal = relatorio.id;

  if (window.supabaseClient) {
    try {
      const session = await aguardarSessao();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("Usuário não autenticado.");
      }

      const payload = {
        nome_cliente: relatorio.nomeCliente,
        nome_assessor: relatorio.nomeAssessor,
        total_patrimonio: relatorio.totalPatrimonio,
        prejuizo_tributario: relatorio.prejuizoTributario,
        dados_completos: relatorio.dadosSessao,
        user_id: userId
      };

      if (isUUID(relatorio.id)) {
        // Atualiza registro existente no Supabase
        payload.id = relatorio.id;
        const { error } = await window.supabaseClient
          .from('relatorios')
          .upsert(payload);
        if (error) throw error;
        idFinal = relatorio.id;
        console.log("[dbSalvarRelatorio] Relatório atualizado no Supabase:", idFinal);
      } else {
        // Novo registro: insere e obtém o UUID gerado pelo banco
        const { data, error } = await window.supabaseClient
          .from('relatorios')
          .insert([payload])
          .select();
        if (error) throw error;
        if (data && data[0]) {
          idFinal = data[0].id;
          // Atualiza o ID da sessão com o UUID real do Supabase
          sessionStorage.setItem("current_report_id", idFinal);
          console.log("[dbSalvarRelatorio] Novo relatório inserido no Supabase:", idFinal);
        }
      }

      // Atualiza localmente no backup
      const relatorioAtualizado = { ...relatorio, id: idFinal };
      _salvarOuAtualizarItemBackup(userId, relatorioAtualizado);

    } catch (e) {
      console.error("[dbSalvarRelatorio] Erro no Supabase:", e);
      // Se falhou no Supabase, salva no backup local com o ID atual (pode ser temporário)
      const session = await aguardarSessao();
      const userId = session?.user?.id;
      if (userId) {
        console.warn("[dbSalvarRelatorio] Salvando no backup local devido a falha no Supabase.");
        _salvarOuAtualizarItemBackup(userId, relatorio);
      }
      throw e;
    }
  } else {
    console.error("[dbSalvarRelatorio] Cliente Supabase não configurado.");
  }

  return idFinal;
}

// Excluir um relatório do Supabase (e do cache local)
async function dbExcluirRelatorio(id) {
  if (window.supabaseClient) {
    try {
      const session = await aguardarSessao();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("Usuário não autenticado.");
      }

      // Remove do backup local
      _removerItemBackup(userId, id);

      if (isUUID(id)) {
        const { error } = await window.supabaseClient
          .from('relatorios')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw error;
        console.log("[dbExcluirRelatorio] Relatório excluído do Supabase:", id);
      }
    } catch (e) {
      console.error("[dbExcluirRelatorio] Erro ao excluir do Supabase:", e);
      throw e;
    }
  }
}

// ─── Auto-Save com Debounce ──────────────────────────────────────────────────
// Chamado pelas páginas do simulador a cada alteração relevante.
// Usa debounce de 1,5s para não sobrecarregar o banco com requisições durante digitação.

let _autoSaveTimer = null;

function dbAutoSalvar() {
  // Não salva se não houver dados mínimos (evita salvar relatórios vazios)
  const familiaStr = sessionStorage.getItem("familia");
  const totalPat = Number(sessionStorage.getItem("total_patrimonio")) || 0;
  if (!familiaStr && totalPat === 0) return;

  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(async () => {
    await dbAutoSalvarExecutar();
  }, 1500);
}

// Executa o salvamento imediatamente (sem debounce). Usado antes de gerar o PDF.
async function dbAutoSalvarExecutar() {
  const familiaStr = sessionStorage.getItem("familia");
  if (!familiaStr) {
    console.warn("[dbAutoSalvar] Nenhum dado de família — relatório não será salvo.");
    return;
  }

  const familia = JSON.parse(familiaStr);
  const nomeCliente = familia.nome || "Cliente";
  const nomeAssessor = sessionStorage.getItem("nome_assessor") || "Assessor";
  const dataReuniao = sessionStorage.getItem("data_reuniao") || new Date().toLocaleDateString("pt-BR");
  const totalPatrimonio = Number(sessionStorage.getItem("total_patrimonio")) || 0;

  let prejuizoTributario = 0;
  const prejuizoFinalStr = sessionStorage.getItem("prejuizo_final");
  if (prejuizoFinalStr) {
    try {
      const finalObj = JSON.parse(prejuizoFinalStr);
      prejuizoTributario = finalObj.prejuizoAtual || 0;
    } catch (e) { /* ignora */ }
  }

  // Identificador da simulação (reutiliza ou cria)
  let reportId = sessionStorage.getItem("current_report_id");
  if (!reportId) {
    reportId = "tmp_" + Date.now(); // ID temporário até salvar no Supabase
    sessionStorage.setItem("current_report_id", reportId);
  }

  // Consolida todos os dados da sessão (usando AppState se disponível)
  let sessionData = {};
  if (window.AppState && typeof window.AppState.exportSnapshot === "function") {
    sessionData = window.AppState.exportSnapshot();

    // ── GARANTIA: Corrige patrimonio.dados lendo diretamente do sessionStorage raw ──
    // O AppState pode ter convertido strings PT-BR ("100.000,00") para NaN→0.
    // Aqui relemos os valores raw e usamos sanitizarNumero() para garantir precisão.
    const rawPatrimonioDados = sessionStorage.getItem("patrimonio_dados");
    if (rawPatrimonioDados) {
      try {
        const rawParsed = JSON.parse(rawPatrimonioDados);
        const campos = ["rf", "rv", "inter", "prev", "offshore", "apt", "casa", "terr", "galp", "bens", "bens_particulares"];
        const dadosCorrigidos = {};
        campos.forEach(c => { dadosCorrigidos[c] = sanitizarNumero(rawParsed[c], 0); });
        dadosCorrigidos.empresas = Array.isArray(rawParsed.empresas) ? rawParsed.empresas : [];
        dadosCorrigidos.offshore_modo = rawParsed.offshore_modo || "brl";

        if (sessionData.patrimonio) {
          sessionData.patrimonio.dados = dadosCorrigidos;
          // Também atualiza o total com o valor direto do sessionStorage (já é número)
          const totalRaw = Number(sessionStorage.getItem("total_patrimonio")) || 0;
          sessionData.patrimonio.total = totalRaw;
        }
      } catch (e) {
        console.warn("[dbAutoSalvarExecutar] Não foi possível corrigir patrimônio_dados:", e);
      }
    }
  } else {
    const keysToSave = [
      "patrimonio_dados", "total_patrimonio", "nome_assessor", "data_reuniao",
      "familia", "evolucao_dados", "evolucao_inputs", "mercado_premissas",
      "tributario_inputs", "prejuizo_final", "partilha_dados", "segunda_morte_dados",
      "current_report_id"
    ];
    keysToSave.forEach(key => {
      const val = sessionStorage.getItem(key);
      if (val) {
        try { sessionData[key] = JSON.parse(val); }
        catch (e) { sessionData[key] = val; }
      }
    });
  }


  const relatorio = {
    id: reportId,
    nomeCliente,
    nomeAssessor,
    dataReuniao,
    totalPatrimonio,
    prejuizoTributario,
    dataCriacao: new Date().toISOString(),
    dadosSessao: sessionData
  };

  try {
    if (typeof window.notificarAutoSave === "function") window.notificarAutoSave("salvando");
    const novoId = await dbSalvarRelatorio(relatorio);
    // Atualiza o ID na sessão caso tenha sido promovido a UUID pelo Supabase
    if (novoId && novoId !== reportId) {
      sessionStorage.setItem("current_report_id", novoId);
    }
    if (typeof window.notificarAutoSave === "function") window.notificarAutoSave("salvo");
  } catch (e) {
    console.error("[dbAutoSalvar] Falha ao salvar relatório:", e);
    if (typeof window.notificarAutoSave === "function") window.notificarAutoSave("offline");
  }
}
