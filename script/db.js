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

// ─── Utilitários de Criptografia de Dados Sensíveis (AES-GCM Web Crypto) ───────
const APP_PEPPER = "pace_whealth_kdf_v2_9a8f4c2e";

async function _gerarChaveCriptografia(userId = 'pace_default', versao = 1) {
  const enc = new TextEncoder();
  // v1: legado retrocompatível | v2+: derivação enriquecida com pepper
  const rawKeyData = (versao === 1)
    ? enc.encode(`pace_whealth_sec_${userId}`)
    : enc.encode(`${APP_PEPPER}_${userId}_sec`);

  const hash = await crypto.subtle.digest('SHA-256', rawKeyData);
  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

async function _criptografarPayload(payload, userId) {
  if (!payload || typeof payload !== 'object') return payload;
  try {
    const key = await _gerarChaveCriptografia(userId, 2);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const jsonStr = JSON.stringify(payload);
    const encData = new TextEncoder().encode(jsonStr);
    const encryptedBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encData
    );

    const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encryptedBuf)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return {
      _encrypted: true,
      v: 2,
      iv: ivBase64,
      ciphertext: ciphertext
    };
  } catch (e) {
    console.warn("[_criptografarPayload] Mantendo formato legível de fallback:", e);
    return payload;
  }
}

async function _descriptografarPayload(payload, userId) {
  if (!payload || typeof payload !== 'object' || !payload._encrypted || !payload.ciphertext) {
    return payload; // Retrocompatibilidade: dados antigos não criptografados retornam intactos!
  }

  const tentarDescriptografar = async (versaoKey) => {
    const key = await _gerarChaveCriptografia(userId, versaoKey);
    const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
    const ciphertextBuf = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));

    const decryptedBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertextBuf
    );

    const jsonStr = new TextDecoder().decode(decryptedBuf);
    return JSON.parse(jsonStr);
  };

  try {
    const v = Number(payload.v) || 1;
    return await tentarDescriptografar(v);
  } catch (e) {
    // Tentativa de fallback com versão 1 legado caso v seja diferente
    try {
      return await tentarDescriptografar(1);
    } catch (e2) {
      console.warn("[_descriptografarPayload] Falha ao descriptografar payload (retornando payload bruto):", e2);
      return payload;
    }
  }
}

// Mapeia linha do Supabase para objeto padronizado (com descriptografia se necessário)
async function _mapearLinhaSupabaseAsync(item, fallbackUserId) {
  const ownerId = item.user_id || fallbackUserId;
  let dadosCompletos = item.dados_completos;
  if (typeof dadosCompletos === "string" && dadosCompletos.length > 0) {
    try {
      dadosCompletos = JSON.parse(dadosCompletos);
    } catch(e) {
      console.warn("[_mapearLinhaSupabase] Falha ao parsear dados_completos como string:", e);
      dadosCompletos = null;
    }
  }

  if (dadosCompletos && typeof dadosCompletos === "object" && dadosCompletos._encrypted) {
    dadosCompletos = await _descriptografarPayload(dadosCompletos, ownerId);
  }

  return {
    id: item.id,
    userId: ownerId,
    nomeCliente: item.nome_cliente,
    nomeAssessor: item.nome_assessor,
    totalPatrimonio: Number(item.total_patrimonio),
    prejuizoTributario: Number(item.prejuizo_tributario),
    dataCriacao: item.data_criacao,
    dataReuniao: dadosCompletos?.data_reuniao || new Date(item.data_criacao).toLocaleDateString("pt-BR"),
    dadosSessao: dadosCompletos
  };
}

// Verifica de forma segura se a sessão pertence a um usuário Master
async function _verificarUsuarioMasterAsync(session) {
  if (!session || !session.user) return false;
  if (typeof window.authIsMaster === "function" && window.authIsMaster(session.user)) return true;
  const uid = String(session.user.id || "").toLowerCase().trim();
  if (Array.isArray(window.MASTER_UIDS_AUTORIZADOS) && window.MASTER_UIDS_AUTORIZADOS.includes(uid)) return true;
  if (session.user.role === "master" || session.user.profile_role === "master") return true;
  try {
    const cached = JSON.parse(localStorage.getItem("pace_user_cache") || "{}");
    if (cached && cached.email === session.user.email && cached.role === "master") {
      return true;
    }
  } catch (e) { }
  if (window.supabaseClient) {
    try {
      const { data: profile } = await window.supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profile && profile.role === "master") {
        session.user.role = "master";
        return true;
      }
    } catch (e) { }
  }
  return false;
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

// ─── Resiliência de Rede: Retry Automático com Backoff Exponencial ──────────
async function executarComRetry(operacaoAsync, maxTentativas = 3, atrasoBaseMs = 300) {
  let tentativa = 0;
  while (tentativa < maxTentativas) {
    try {
      return await operacaoAsync();
    } catch (erro) {
      tentativa++;
      if (tentativa >= maxTentativas) {
        throw erro;
      }
      const delay = atrasoBaseMs * Math.pow(2, tentativa - 1);
      console.warn(`[Rede/Supabase] Tentativa ${tentativa} falhou. Repetindo em ${delay}ms...`, erro);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ─── CRUD Principal ──────────────────────────────────────────────────────────

// Carregar relatórios do Supabase (com retry automático e fallback para LocalStorage)
// Por padrão (incluirTodosEquipe = false), retorna estritamente os relatórios do próprio usuário autenticado,
// mantendo o Dashboard pessoal e a exportação LGPD isolados mesmo para contas Master.
async function dbObterRelatorios(incluirTodosEquipe = false) {
  if (window.supabaseClient) {
    try {
      const session = await aguardarSessao();
      if (session) {
        const isMaster = incluirTodosEquipe ? await _verificarUsuarioMasterAsync(session) : false;
        const fetchRemote = async () => {
          let query = window.supabaseClient
            .from('relatorios')
            .select('*')
            .order('data_criacao', { ascending: false });
          if (!isMaster || !incluirTodosEquipe) {
            query = query.eq('user_id', session.user.id);
          }
          const { data, error } = await query;
          if (error) throw error;
          return data;
        };

        const data = await executarComRetry(fetchRemote, 3, 300);
        const mapeados = await Promise.all((data || []).map(item => _mapearLinhaSupabaseAsync(item, session.user.id)));
        // Atualiza o backup local exclusivamente com os relatórios pertencentes ao próprio usuário
        const apenasProprios = incluirTodosEquipe
          ? mapeados.filter(r => String(r.userId || "") === String(session.user.id))
          : mapeados;
        _salvarBackupLocal(session.user.id, apenasProprios);
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

// Função dedicada para o Painel de Usabilidade Master consultar todos os relatórios da equipe
async function dbObterTodosRelatoriosEquipe() {
  return await dbObterRelatorios(true);
}
window.dbObterTodosRelatoriosEquipe = dbObterTodosRelatoriosEquipe;

// Salvar/Atualizar um relatório no Supabase (com sincronização local)
async function dbSalvarRelatorio(relatorioEntrada) {
  if (sessionStorage.getItem("modo_auditoria_master") === "true") {
    console.log("[dbSalvarRelatorio] Modo de auditoria Master ativo — salvamento cancelado para preservar os dados originais do assessor.");
    return relatorioEntrada?.id || "audit_readonly";
  }

  const { relatorioSanitizado: relatorio } = sanitizarEValidarSimulacao(relatorioEntrada);
  let idFinal = relatorio.id;

  if (window.supabaseClient) {
    try {
      const session = await aguardarSessao();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("Usuário não autenticado.");
      }

      // Se um Master estiver atualizando o relatório de um assessor, preserva o user_id original do assessor
      const ownerId = (isUUID(relatorio.id) && relatorioEntrada.userId)
        ? relatorioEntrada.userId
        : (sessionStorage.getItem("current_report_owner_id") || userId);

      const payload = {
        nome_cliente: relatorio.nomeCliente,
        nome_assessor: relatorio.nomeAssessor,
        total_patrimonio: relatorio.totalPatrimonio,
        prejuizo_tributario: relatorio.prejuizoTributario,
        dados_completos: await _criptografarPayload(relatorio.dadosSessao, ownerId),
        user_id: ownerId
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
      const relatorioAtualizado = { ...relatorio, id: idFinal, userId: ownerId };
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

      const isMaster = await _verificarUsuarioMasterAsync(session);

      // Remove do backup local
      _removerItemBackup(userId, id);

      if (isUUID(id)) {
        let query = window.supabaseClient
          .from('relatorios')
          .delete()
          .eq('id', id);

        if (!isMaster) {
          query = query.eq('user_id', userId);
        }

        const { error } = await query;

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
  if (sessionStorage.getItem("modo_auditoria_master") === "true") {
    console.log("[dbAutoSalvar] Modo de auditoria Master ativo — salvamento automático desativado para preservar os dados originais do assessor.");
    return;
  }

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
      "current_report_id",
      "carteira_ativos", "carteira_movimentacoes",
      "renda_passiva_inputs", "renda_passiva_resultados",
      "premissas_macro"
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

// ─── Ferramentas LGPD: Portabilidade e Exclusão de Dados (Art. 18 LGPD) ───────

// Exporta todos os dados do titular em JSON estruturado legível por máquina (Portabilidade)
async function dbExportarDadosCompletos() {
  const relatorios = await dbObterRelatorios();
  const session = await aguardarSessao();
  const userId = session?.user?.id || "anonimo";
  const userEmail = session?.user?.email || "desconhecido";

  return {
    conformidade: "Lei Geral de Proteção de Dados (Lei 13.709/2018 - LGPD)",
    data_geracao: new Date().toISOString(),
    titular: {
      user_id: userId,
      email: userEmail,
      role: session?.user?.role || "assessor"
    },
    total_relatorios_mapeados: relatorios.length,
    relatorios: relatorios
  };
}

// Exclui todos os dados do usuário autenticado no sistema (Direito ao Esquecimento)
async function dbSolicitarExclusaoConta() {
  if (!window.supabaseClient) return false;
  try {
    const session = await aguardarSessao();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Usuário não autenticado.");

    // Tenta via RPC seguro do Supabase
    const { error: rpcErr } = await window.supabaseClient.rpc("solicitar_exclusao_meus_dados");
    if (rpcErr) {
      // Fallback: remove relatórios diretamente via RLS
      await window.supabaseClient.from("relatorios").delete().eq("user_id", userId);
    }

    // Limpa backups locais e sessões do navegador
    localStorage.removeItem(`relatorios_backup_${userId}`);
    sessionStorage.clear();
    return true;
  } catch (e) {
    console.error("[dbSolicitarExclusaoConta] Erro ao expurgar dados:", e);
    throw e;
  }
}

// Registra um novo chamado de suporte na tabela suporte_chamados (Supabase) e despacha por e-mail
async function dbRegistrarChamadoSuporte(dados) {
  if (!dados || typeof dados !== "object") throw new Error("Dados do chamado inválidos.");

  let safePrint = null;
  if (dados.print_imagem && typeof dados.print_imagem === "string") {
    const rawPrint = dados.print_imagem.trim();
    const isImageFormat = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(rawPrint);
    if (isImageFormat && rawPrint.length <= 3500000) {
      safePrint = rawPrint;
    } else {
      console.warn("[dbRegistrarChamadoSuporte] Imagem anexada descartada: formato não permitido ou tamanho superior a 3.5MB.");
    }
  }

  const payload = {
    assessor_nome: String(dados.assessor_nome || "").trim().slice(0, 150),
    assessor_email: String(dados.assessor_email || "").trim().slice(0, 150),
    tipo: String(dados.tipo || "duvida").trim().slice(0, 80),
    assunto: String(dados.assunto || "").trim().slice(0, 200),
    mensagem: String(dados.mensagem || "").trim().slice(0, 3000),
    pagina_origem: String(dados.pagina_origem || (typeof window !== "undefined" ? window.location.pathname : "")).trim().slice(0, 200),
    print_imagem: safePrint,
    status: "aberto"
  };

  if (!payload.assunto || !payload.mensagem) {
    throw new Error("Por favor, preencha o assunto e a descrição do chamado.");
  }

  const client = window.supabaseClient;
  if (client) {
    try {
      const session = await aguardarSessao(1500);
      if (session?.user?.id) {
        payload.user_id = session.user.id;
      }
      const { data, error } = await client.from("suporte_chamados").insert([payload]).select().maybeSingle();
      if (error) {
        console.warn("[dbRegistrarChamadoSuporte] Aviso ao gravar no Supabase:", error.message);
      }

      // Dispara envio do e-mail em background via Edge Function
      if (client.functions) {
        client.functions.invoke("suporte-email", {
          body: {
            ...payload,
            destinatario: "suporte@pacecapital.com.br",
            chamado_id: data?.id || null,
            enviado_em: new Date().toISOString()
          }
        }).then(({ data: funcData, error: funcErr }) => {
          if (funcErr) {
            console.warn("[dbRegistrarChamadoSuporte] Aviso da Edge Function de e-mail:", funcErr.message || funcErr);
          } else {
            console.log("[dbRegistrarChamadoSuporte] E-mail despachado com sucesso.");
          }
        }).catch(e => {
          console.warn("[dbRegistrarChamadoSuporte] Falha na rede da Edge Function:", e.message || e);
        });
      }

      return { success: true, id: data?.id || "chamado-" + Date.now() };
    } catch (err) {
      console.warn("[dbRegistrarChamadoSuporte] Falha na rede do Supabase:", err.message || err);
      return { success: true, id: "offline-" + Date.now() };
    }
  }

  return { success: true, id: "local-" + Date.now() };
}

window.dbRegistrarChamadoSuporte = dbRegistrarChamadoSuporte;

// ─── Sistema de Usuários Master: Consolidação de Usabilidade & Relatórios ─────

// Diretório carregado dinamicamente via Supabase RPC (Zero-Leakage: nenhum e-mail ou nome real fica hardcoded no código)
const DIRETORIO_USUARIOS_SISTEMA = [];

function _formatarNomePorEmail(email, nomeAtual) {
  const limpo = String(nomeAtual || "").trim();
  if (limpo && limpo !== "-" && limpo !== "Assessor") {
    return limpo;
  }
  if (!email || !email.includes("@")) return limpo || "Assessor";
  const alias = email.split("@")[0];
  return alias
    .split(/[._-]/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function _normalizarRoleUsuarioMaster(id, roleOriginal) {
  const idStr = String(id || "").trim();
  const listaMasterUids = Array.isArray(window.MASTER_UIDS_AUTORIZADOS)
    ? window.MASTER_UIDS_AUTORIZADOS
    : ["130e3598-89b9-4702-a4cc-2c5923fa3a66"];
  if (idStr && listaMasterUids.includes(idStr)) {
    return "master";
  }
  return String(roleOriginal || "assessor").toLowerCase();
}

// Função pura para consolidar métricas de usabilidade de usuários e relatórios
function calcularMetricasUsabilidadeEquipe(perfis = [], relatorios = [], acessosExtras = {}, incluirDiretorioPadrao = false) {
  const mapaUsuarios = new Map();
  const indicePorEmail = new Map();

  const escolherDataMaisRecente = (...datas) => {
    let maiorTs = 0;
    let melhorIso = null;
    datas.forEach(d => {
      if (!d) return;
      const ts = new Date(d).getTime();
      if (!isNaN(ts) && ts > maiorTs) {
        maiorTs = ts;
        melhorIso = d;
      }
    });
    return melhorIso;
  };

  const registrarOuMesclarPerfil = (p, ehDiretorioPadrao = false) => {
    if (!p || (!p.id && !p.email)) return;
    const emailNorm = String(p.email || "").toLowerCase().trim();
    const idOriginal = p.id || emailNorm;
    const extra = acessosExtras[idOriginal] || (emailNorm ? acessosExtras[emailNorm] : {}) || {};

    const chaveExistentePorEmail = emailNorm ? indicePorEmail.get(emailNorm) : null;
    const chaveAlvo = mapaUsuarios.has(idOriginal)
      ? idOriginal
      : (chaveExistentePorEmail || idOriginal);

    if (mapaUsuarios.has(chaveAlvo)) {
      const existente = mapaUsuarios.get(chaveAlvo);
      const idFinal = (!ehDiretorioPadrao && p.id) ? p.id : existente.id;
      const emailFinal = (p.email || existente.email || extra.email || "").trim();
      const nomeCandidato = (p.full_name || extra.full_name || "").trim();
      const nomeFinal = (nomeCandidato && nomeCandidato !== "Assessor" && nomeCandidato !== "-")
        ? nomeCandidato
        : _formatarNomePorEmail(emailFinal, existente.full_name);

      const atualizado = {
        ...existente,
        id: idFinal,
        email: emailFinal,
        full_name: nomeFinal,
        role: _normalizarRoleUsuarioMaster(idFinal, (!ehDiretorioPadrao && p.role) ? p.role : existente.role),
        created_at: existente.created_at || p.created_at || null,
        ultimo_acesso: escolherDataMaisRecente(
          existente.ultimo_acesso,
          p.ultimo_acesso,
          p.last_sign_in_at,
          extra.ultimo_acesso,
          p.updated_at
        ),
        total_relatorios: Math.max(existente.total_relatorios || 0, Number(p.total_relatorios) || 0),
        total_patrimonio: Math.max(existente.total_patrimonio || 0, Number(p.total_patrimonio) || 0),
        ultimo_relatorio_em: escolherDataMaisRecente(existente.ultimo_relatorio_em, p.ultimo_relatorio_em),
        _contabilizadoDaRpc: Boolean(existente._contabilizadoDaRpc || (!ehDiretorioPadrao && p.total_relatorios !== undefined && p.total_relatorios !== null))
      };

      if (idFinal !== chaveAlvo) {
        mapaUsuarios.delete(chaveAlvo);
      }
      mapaUsuarios.set(idFinal, atualizado);
      if (emailNorm) indicePorEmail.set(emailNorm, idFinal);
      return;
    }

    const emailFinal = (p.email || extra.email || "").trim();
    const nomeCru = (p.full_name || extra.full_name || "").trim();
    const nomeFinal = (nomeCru && nomeCru !== "Assessor" && nomeCru !== "-")
      ? nomeCru
      : _formatarNomePorEmail(emailFinal, "Assessor");

    const novoUsuario = {
      id: idOriginal,
      email: emailFinal,
      full_name: nomeFinal,
      role: _normalizarRoleUsuarioMaster(idOriginal, p.role || extra.role || "assessor"),
      created_at: p.created_at || null,
      ultimo_acesso: escolherDataMaisRecente(p.ultimo_acesso, p.last_sign_in_at, extra.ultimo_acesso, p.updated_at),
      total_relatorios: Number(p.total_relatorios) || 0,
      total_patrimonio: Number(p.total_patrimonio) || 0,
      ultimo_relatorio_em: p.ultimo_relatorio_em || null,
      _contabilizadoDaRpc: !ehDiretorioPadrao && p.total_relatorios !== undefined && p.total_relatorios !== null
    };

    mapaUsuarios.set(idOriginal, novoUsuario);
    if (emailNorm) indicePorEmail.set(emailNorm, idOriginal);
  };

  // 0. Se solicitado, pré-carrega o diretório oficial de usuários do sistema Pace Capital
  if (incluirDiretorioPadrao) {
    DIRETORIO_USUARIOS_SISTEMA.forEach(uPadrao => registrarOuMesclarPerfil(uPadrao, true));
  }

  // 1. Registra/mescla perfis vindos do Supabase (RPC ou tabela profiles)
  (Array.isArray(perfis) ? perfis : []).forEach(p => registrarOuMesclarPerfil(p, false));

  // 2. Mescla acessos extras locais que ainda não estejam na lista
  Object.keys(acessosExtras || {}).forEach(id => {
    const ex = acessosExtras[id];
    if (ex && (ex.email || ex.full_name)) {
      registrarOuMesclarPerfil({ id, ...ex }, false);
    }
  });

  // 3. Associa relatórios por user_id (ou nome/e-mail do assessor como fallback)
  (Array.isArray(relatorios) ? relatorios : []).forEach(rep => {
    if (!rep) return;
    let alvo = rep.userId ? mapaUsuarios.get(rep.userId) : null;

    if (!alvo && rep.nomeAssessor) {
      const nomeBusca = String(rep.nomeAssessor).toLowerCase().trim();
      for (const u of mapaUsuarios.values()) {
        if (
          (u.full_name || "").toLowerCase().trim() === nomeBusca ||
          (u.email || "").toLowerCase().trim() === nomeBusca ||
          (u.email || "").toLowerCase().split("@")[0] === nomeBusca
        ) {
          alvo = u;
          break;
        }
      }
    }

    if (!alvo && rep.userId) {
      alvo = {
        id: rep.userId,
        email: "",
        full_name: rep.nomeAssessor || "Assessor",
        role: "assessor",
        created_at: rep.dataCriacao || null,
        ultimo_acesso: rep.dataCriacao || null,
        total_relatorios: 0,
        total_patrimonio: 0,
        ultimo_relatorio_em: null,
        _contabilizadoDaRpc: false
      };
      mapaUsuarios.set(rep.userId, alvo);
    }

    if (alvo) {
      if (!alvo._contabilizadoDaRpc) {
        alvo.total_relatorios += 1;
        alvo.total_patrimonio += Number(rep.totalPatrimonio) || 0;
      }
      alvo.ultimo_relatorio_em = escolherDataMaisRecente(alvo.ultimo_relatorio_em, rep.dataCriacao);
      alvo.ultimo_acesso = escolherDataMaisRecente(alvo.ultimo_acesso, rep.dataCriacao);
    }
  });

  const listaUsuarios = Array.from(mapaUsuarios.values()).map(u => {
    const copia = { ...u };
    delete copia._contabilizadoDaRpc;
    return copia;
  });

  listaUsuarios.sort((a, b) => {
    const tsA = a.ultimo_acesso ? new Date(a.ultimo_acesso).getTime() : 0;
    const tsB = b.ultimo_acesso ? new Date(b.ultimo_acesso).getTime() : 0;
    if (tsB !== tsA) return tsB - tsA;
    if ((b.total_relatorios || 0) !== (a.total_relatorios || 0)) {
      return (b.total_relatorios || 0) - (a.total_relatorios || 0);
    }
    return String(a.full_name || "").localeCompare(String(b.full_name || ""), "pt-BR");
  });

  return listaUsuarios;
}

// Consulta métricas de usabilidade de todos os usuários e todos os relatórios (Exclusivo Master)
async function dbObterUsabilidadeUsuarios() {
  let acessosLocais = {};
  try {
    const raw = localStorage.getItem("pace_usabilidade_acessos");
    if (raw) acessosLocais = JSON.parse(raw) || {};
  } catch (e) { }

  const relatorios = await dbObterTodosRelatoriosEquipe();
  const client = typeof getSupabase === "function" ? getSupabase() : window.supabaseClient;

  if (client) {
    try {
      // 1. Tenta via RPC segura obter_metricas_usabilidade_master()
      const { data: rpcData, error: rpcErr } = await client.rpc("obter_metricas_usabilidade_master");
      let listaRpc = rpcData;
      if (typeof listaRpc === "string") {
        try { listaRpc = JSON.parse(listaRpc); } catch (_) { listaRpc = null; }
      }
      if (!rpcErr && Array.isArray(listaRpc) && listaRpc.length > 0) {
        const usuarios = calcularMetricasUsabilidadeEquipe(listaRpc, relatorios, acessosLocais, true);
        return { usuarios, relatorios };
      }
      if (rpcErr) {
        console.warn("[dbObterUsabilidadeUsuarios] RPC obter_metricas_usabilidade_master indisponível ou pendente de execução no Supabase SQL Editor:", rpcErr.message || rpcErr);
      }

      // 2. Fallback automático: consulta direta às tabelas profiles, invites e audit_logs
      let profilesData = null;
      const { data: pDataOrder, error: pErrOrder } = await client
        .from("profiles")
        .select("*")
        .order("ultimo_acesso", { ascending: false });

      if (!pErrOrder && Array.isArray(pDataOrder)) {
        profilesData = pDataOrder;
      } else {
        const { data: pDataFallback } = await client
          .from("profiles")
          .select("*");
        if (Array.isArray(pDataFallback)) {
          profilesData = pDataFallback;
        }
      }

      const perfisCombinados = Array.isArray(profilesData) ? [...profilesData] : [];

      try {
        const { data: invitesData } = await client
          .from("invites")
          .select("email_restrito, used, used_at, used_by, created_at");

        if (Array.isArray(invitesData)) {
          invitesData.forEach(inv => {
            const emailConvite = (inv.used_by || inv.email_restrito || "").trim();
            if (emailConvite) {
              perfisCombinados.push({
                id: emailConvite.toLowerCase(),
                email: emailConvite,
                full_name: "Assessor",
                role: "assessor",
                created_at: inv.created_at || null,
                ultimo_acesso: inv.used_at || null
              });
            }
          });
        }
      } catch (invErr) { }

      try {
        const { data: logsData } = await client
          .from("audit_logs")
          .select("user_id, created_at")
          .order("created_at", { ascending: false })
          .limit(300);

        if (Array.isArray(logsData)) {
          logsData.forEach(log => {
            if (log.user_id && log.created_at) {
              const atual = acessosLocais[log.user_id]?.ultimo_acesso;
              if (!atual || new Date(log.created_at).getTime() > new Date(atual).getTime()) {
                acessosLocais[log.user_id] = {
                  ...(acessosLocais[log.user_id] || {}),
                  id: log.user_id,
                  ultimo_acesso: log.created_at
                };
              }
            }
          });
        }
      } catch (logErr) { }

      const usuarios = calcularMetricasUsabilidadeEquipe(perfisCombinados, relatorios, acessosLocais, true);
      return { usuarios, relatorios };
    } catch (err) {
      console.warn("[dbObterUsabilidadeUsuarios] Aviso ao consultar Supabase:", err);
    }
  }

  // 3. Fallback offline / cache local (inclui diretório oficial da equipe)
  const usuariosFallback = calcularMetricasUsabilidadeEquipe([], relatorios, acessosLocais, true);
  return { usuarios: usuariosFallback, relatorios };
}

window.DIRETORIO_USUARIOS_SISTEMA = DIRETORIO_USUARIOS_SISTEMA;
window.calcularMetricasUsabilidadeEquipe = calcularMetricasUsabilidadeEquipe;
window.dbObterUsabilidadeUsuarios = dbObterUsabilidadeUsuarios;
window.dbObterRelatorios = dbObterRelatorios;

// Captura global de exceções assíncronas para não travar a aplicação
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    console.warn("[Segurança/Resiliência] Exceção assíncrona interceptada:", event.reason);
  });

  // Expõe helpers de teste de segurança estritamente em ambiente de desenvolvimento local / runner de testes
  const isLocalHost = typeof window !== "undefined" && window.location && (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:"
  );

  const isTestEnvironment = isLocalHost && (
    window.__PACE_ENABLE_SECURITY_TESTS__ === true ||
    (typeof window.location !== "undefined" && window.location.pathname && window.location.pathname.includes("run_tests.html"))
  );

  if (isTestEnvironment) {
    window.__PACE_SECURITY_TEST__ = {
      _gerarChaveCriptografia,
      _criptografarPayload,
      _descriptografarPayload,
      sanitizarNumero,
      sanitizarEValidarSimulacao,
      executarComRetry
    };
  }
}

