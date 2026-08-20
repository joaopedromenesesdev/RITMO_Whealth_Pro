// state.js - Gerenciador de Estado Centralizado (Whealth Planner Pro)
// Abstrai o acesso a sessionStorage garantindo validação de schema, defaults seguros e sanitização.

(function (window) {
  'use strict';

  const AppState = {
    // ── GESTÃO DE PATRIMÔNIO ────────────────────────────────────────────────
    getPatrimonioDados() {
      try {
        const raw = sessionStorage.getItem("patrimonio_dados");
        if (!raw) return this.getDefaultPatrimonioDados();
        const parsed = JSON.parse(raw);

        // Converte valores salvos pelo patrimônio.js que estão em formato PT-BR
        // Ex: "100.000,00" → 100000  |  Já número: 100000 → 100000
        const parseVal = (v) => {
          if (!v && v !== 0) return 0;
          if (typeof v === 'number') return isNaN(v) ? 0 : v;
          // Remove R$, espaços, pontos de milhar e converte vírgula para ponto
          const clean = String(v).replace(/R\$\s?/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
          return parseFloat(clean) || 0;
        };

        return {
          rf: parseVal(parsed.rf),
          rv: parseVal(parsed.rv),
          inter: parseVal(parsed.inter),
          prev: parseVal(parsed.prev),
          offshore: parseVal(parsed.offshore),
          apt: parseVal(parsed.apt),
          casa: parseVal(parsed.casa),
          terr: parseVal(parsed.terr),
          galp: parseVal(parsed.galp),
          bens: parseVal(parsed.bens),
          bens_particulares: parseVal(parsed.bens_particulares),
          empresas: Array.isArray(parsed.empresas) ? parsed.empresas : []
        };
      } catch (e) {
        console.error("[AppState] Erro ao ler patrimonio_dados:", e);
        return this.getDefaultPatrimonioDados();
      }
    },

    setPatrimonioDados(dados) {
      if (!dados || typeof dados !== "object") return;
      sessionStorage.setItem("patrimonio_dados", JSON.stringify(dados));
    },

    getDefaultPatrimonioDados() {
      return {
        rf: 0, rv: 0, inter: 0, prev: 0, offshore: 0,
        apt: 0, casa: 0, terr: 0, galp: 0, bens: 0,
        bens_particulares: 0, empresas: []
      };
    },

    getTotalPatrimonio() {
      return Number(sessionStorage.getItem("total_patrimonio")) || 0;
    },

    setTotalPatrimonio(total) {
      const val = Math.max(0, Number(total) || 0);
      sessionStorage.setItem("total_patrimonio", val);
    },

    // ── GESTÃO FAMILIAR ──────────────────────────────────────────────────────
    getFamilia() {
      try {
        const raw = sessionStorage.getItem("familia");
        if (!raw) return this.getDefaultFamilia();
        const parsed = JSON.parse(raw);
        return {
          nome: parsed.nome || "Cliente",
          estadoCivil: parsed.estadoCivil || "solteiro",
          conjuge: parsed.conjuge || "",
          regime: parsed.regime || "comunhao_parcial",
          temFilhos: parsed.temFilhos || "nao",
          qtdFilhos: Number(parsed.qtdFilhos) || 0,
          idadesFilhos: Array.isArray(parsed.idadesFilhos) ? parsed.idadesFilhos : []
        };
      } catch (e) {
        console.error("[AppState] Erro ao ler familia:", e);
        return this.getDefaultFamilia();
      }
    },

    setFamilia(familia) {
      if (!familia || typeof familia !== "object") return;
      sessionStorage.setItem("familia", JSON.stringify(familia));
    },

    getDefaultFamilia() {
      return {
        nome: "Cliente",
        estadoCivil: "solteiro",
        conjuge: "",
        regime: "comunhao_parcial",
        temFilhos: "nao",
        qtdFilhos: 0,
        idadesFilhos: []
      };
    },

    // ── PROJEÇÃO DE EVOLUÇÃO ────────────────────────────────────────────────
    getEvolucaoInputs() {
      try {
        const raw = sessionStorage.getItem("evolucao_inputs");
        if (!raw) return { taxa: 10, aporte: 0, anos: 10 };
        const parsed = JSON.parse(raw);
        return {
          taxa: Number(parsed.taxa) || 10,
          aporte: Number(parsed.aporte) || 0,
          anos: Number(parsed.anos) || 10
        };
      } catch (e) {
        return { taxa: 10, aporte: 0, anos: 10 };
      }
    },

    setEvolucaoInputs(inputs) {
      sessionStorage.setItem("evolucao_inputs", JSON.stringify(inputs));
    },

    getEvolucaoDados() {
      try {
        const raw = sessionStorage.getItem("evolucao_dados");
        if (!raw) return { resultados: [], resultadosPrev: [] };
        return JSON.parse(raw);
      } catch (e) {
        return { resultados: [], resultadosPrev: [] };
      }
    },

    setEvolucaoDados(dados) {
      sessionStorage.setItem("evolucao_dados", JSON.stringify(dados));
    },

    // ── TRIBUTÁRIO & INVENTÁRIO ──────────────────────────────────────────────
    getTributarioInputs() {
      try {
        const raw = sessionStorage.getItem("tributario_inputs");
        if (!raw) return this.getDefaultTributarioInputs();
        return { ...this.getDefaultTributarioInputs(), ...JSON.parse(raw) };
      } catch (e) {
        return this.getDefaultTributarioInputs();
      }
    },

    setTributarioInputs(inputs) {
      sessionStorage.setItem("tributario_inputs", JSON.stringify(inputs));
    },

    getDefaultTributarioInputs() {
      return {
        uf: "SP",
        itcmd: 4,
        honorarios: 5,
        custas: 1.5,
        doacao: 0,
        doacao_avista: 0,
        previdencia: 0,
        seguro_idade: 40,
        seguro_capital: 0
      };
    },

    getPrejuizoFinal() {
      try {
        const raw = sessionStorage.getItem("prejuizo_final");
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    setPrejuizoFinal(dados) {
      sessionStorage.setItem("prejuizo_final", JSON.stringify(dados));
    },

    // ── META SESSÃO ────────────────────────────────────────────────────────
    getCurrentReportId() {
      return sessionStorage.getItem("current_report_id");
    },

    setCurrentReportId(id) {
      if (id) sessionStorage.setItem("current_report_id", id);
    },

    getDataReuniao() {
      return sessionStorage.getItem("data_reuniao") || new Date().toLocaleDateString("pt-BR");
    },

    setDataReuniao(data) {
      if (data) sessionStorage.setItem("data_reuniao", data);
    },

    getNomeAssessor() {
      return sessionStorage.getItem("nome_assessor") || "Assessor";
    },

    setNomeAssessor(nome) {
      if (nome) sessionStorage.setItem("nome_assessor", nome);
    },

    // ── PUB/SUB & REATIVIDADE ───────────────────────────────────────────────
    _listeners: [],

    subscribe(callback) {
      if (typeof callback === 'function') {
        this._listeners.push(callback);
      }
      return () => {
        this._listeners = this._listeners.filter(cb => cb !== callback);
      };
    },

    notify(event = 'change', payload = null) {
      this._listeners.forEach(cb => {
        try { cb(event, payload); } catch (e) { console.error("[AppState] Erro em listener:", e); }
      });
    },

    // ── GESTÃO DE CARTEIRA DE INVESTIMENTOS ──────────────────────────────────
    getCarteiraAtivos() {
      try {
        const raw = sessionStorage.getItem("carteira_ativos");
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("[AppState] Erro ao ler carteira_ativos:", e);
        return [];
      }
    },

    setCarteiraAtivos(ativos) {
      if (!Array.isArray(ativos)) return;
      sessionStorage.setItem("carteira_ativos", JSON.stringify(ativos));
    },

    getCarteiraMovimentacoes() {
      try {
        const raw = sessionStorage.getItem("carteira_movimentacoes");
        if (!raw) return { saldoInicial: 0, aportes: 0, resgates: 0, rendimentos: 0 };
        return JSON.parse(raw);
      } catch (e) {
        return { saldoInicial: 0, aportes: 0, resgates: 0, rendimentos: 0 };
      }
    },

    setCarteiraMovimentacoes(mov) {
      sessionStorage.setItem("carteira_movimentacoes", JSON.stringify(mov));
    },

    // ── GESTÃO DE RENDA PASSIVA ───────────────────────────────────────────────
    getRendaPassivaInputs() {
      try {
        const raw = sessionStorage.getItem("renda_passiva_inputs");
        if (!raw) return this.getDefaultRendaPassivaInputs();
        return { ...this.getDefaultRendaPassivaInputs(), ...JSON.parse(raw) };
      } catch (e) {
        return this.getDefaultRendaPassivaInputs();
      }
    },

    setRendaPassivaInputs(inputs) {
      sessionStorage.setItem("renda_passiva_inputs", JSON.stringify(inputs));
    },

    getDefaultRendaPassivaInputs() {
      return {
        idadeAtual: 50,
        idadeAposentadoria: 60,
        idadeFinal: 95,
        rendaDesejada: 50000,
        aporteMensal: 0,
        rentabilidadeAnual: 10,
        inflacaoAnual: 5
      };
    },

    getRendaPassivaResultados() {
      try {
        const raw = sessionStorage.getItem("renda_passiva_resultados");
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    setRendaPassivaResultados(dados) {
      sessionStorage.setItem("renda_passiva_resultados", JSON.stringify(dados));
    },

    // ── PREMISSAS MACROECONÔMICAS GLOBAIS ──────────────────────────────────────
    getPremissasMacro() {
      try {
        const raw = sessionStorage.getItem("premissas_macro");
        if (!raw) return this.getDefaultPremissasMacro();
        return { ...this.getDefaultPremissasMacro(), ...JSON.parse(raw) };
      } catch (e) {
        return this.getDefaultPremissasMacro();
      }
    },

    setPremissasMacro(premissas) {
      sessionStorage.setItem("premissas_macro", JSON.stringify(premissas));
    },

    getDefaultPremissasMacro() {
      return {
        selic: 10,
        cdi: 10,
        ipca: 5,
        rentabilidadeCarteira: 10,
        rentabilidadeInternacional: 8,
        valorizacaoCambial: 3
      };
    },

    // ── SNAPSHOT UNIFICADO (SIMULATION STORE) ────────────────────────────────
    exportSnapshot() {
      const patrimonioDados = this.getPatrimonioDados();
      const totalPatrimonio = this.getTotalPatrimonio();
      const familia = this.getFamilia();
      const evolucaoInputs = this.getEvolucaoInputs();
      const evolucaoDados = this.getEvolucaoDados();
      const tributarioInputs = this.getTributarioInputs();
      const prejuizoFinal = this.getPrejuizoFinal();
      const carteiraAtivos = this.getCarteiraAtivos();
      const carteiraMovimentacoes = this.getCarteiraMovimentacoes();
      const rendaPassivaInputs = this.getRendaPassivaInputs();
      const rendaPassivaResultados = this.getRendaPassivaResultados();
      const premissasMacro = this.getPremissasMacro();

      return {
        meta: {
          currentReportId: this.getCurrentReportId(),
          nomeCliente: familia.nome || "Cliente",
          nomeAssessor: this.getNomeAssessor(),
          dataReuniao: this.getDataReuniao(),
          dataSnapshot: new Date().toISOString()
        },
        patrimonio: {
          dados: patrimonioDados,
          total: totalPatrimonio
        },
        familia,
        evolucao: {
          inputs: evolucaoInputs,
          dados: evolucaoDados
        },
        tributario: {
          inputs: tributarioInputs,
          prejuizoFinal
        },
        carteira: {
          ativos: carteiraAtivos,
          movimentacoes: carteiraMovimentacoes
        },
        rendaPassiva: {
          inputs: rendaPassivaInputs,
          resultados: rendaPassivaResultados
        },
        premissasMacro
      };
    },

    importSnapshot(snapshot) {
      if (!snapshot || typeof snapshot !== 'object') return false;

      try {
        if (snapshot.meta) {
          if (snapshot.meta.currentReportId) this.setCurrentReportId(snapshot.meta.currentReportId);
          if (snapshot.meta.nomeAssessor) this.setNomeAssessor(snapshot.meta.nomeAssessor);
          if (snapshot.meta.dataReuniao) this.setDataReuniao(snapshot.meta.dataReuniao);
        }

        if (snapshot.patrimonio) {
          if (snapshot.patrimonio.dados) this.setPatrimonioDados(snapshot.patrimonio.dados);
          if (typeof snapshot.patrimonio.total !== 'undefined') this.setTotalPatrimonio(snapshot.patrimonio.total);
        }

        if (snapshot.familia) {
          this.setFamilia(snapshot.familia);
        }

        if (snapshot.evolucao) {
          if (snapshot.evolucao.inputs) this.setEvolucaoInputs(snapshot.evolucao.inputs);
          if (snapshot.evolucao.dados) this.setEvolucaoDados(snapshot.evolucao.dados);
        }

        if (snapshot.tributario) {
          if (snapshot.tributario.inputs) this.setTributarioInputs(snapshot.tributario.inputs);
          if (snapshot.tributario.prejuizoFinal) this.setPrejuizoFinal(snapshot.tributario.prejuizoFinal);
        }

        if (snapshot.carteira) {
          if (snapshot.carteira.ativos) this.setCarteiraAtivos(snapshot.carteira.ativos);
          if (snapshot.carteira.movimentacoes) this.setCarteiraMovimentacoes(snapshot.carteira.movimentacoes);
        }

        if (snapshot.rendaPassiva) {
          if (snapshot.rendaPassiva.inputs) this.setRendaPassivaInputs(snapshot.rendaPassiva.inputs);
          if (snapshot.rendaPassiva.resultados) this.setRendaPassivaResultados(snapshot.rendaPassiva.resultados);
        }

        if (snapshot.premissasMacro) {
          this.setPremissasMacro(snapshot.premissasMacro);
        }

        this.notify('import', snapshot);
        return true;
      } catch (e) {
        console.error("[AppState] Erro ao importar snapshot:", e);
        return false;
      }
    },

    // ── RESET ───────────────────────────────────────────────────────────────
    clearSession() {
      sessionStorage.clear();
      this.notify('clear');
    }
  };

  window.AppState = AppState;
})(window);
