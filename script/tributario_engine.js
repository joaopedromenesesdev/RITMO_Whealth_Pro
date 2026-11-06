// tributario_engine.js - Motor de Cálculo Tributário e Sucessório (Whealth Planner Pro)
// Contém todas as regras de alíquotas estaduais (ITCMD), partilha de regimes de bens e estratégias de liquidez.

(function (global) {
  'use strict';

  // Tabela de Alíquotas Médias / Progressivas do ITCMD por Estado
  const ALIQUOTAS_ITCMD_ESTADOS = {
    SP: 4.0,   // São Paulo (fixo 4% - simulação de reforma pode ir até 8%)
    RJ: 8.0,   // Rio de Janeiro (progressivo 4% a 8%)
    MG: 5.0,   // Minas Gerais (progressivo até 5%)
    RS: 6.0,   // Rio Grande do Sul (progressivo até 6%)
    SC: 8.0,   // Santa Catarina (progressivo até 8%)
    PR: 4.0,   // Paraná (fixo 4%)
    BA: 8.0,   // Bahia (progressivo até 8%)
    DF: 6.0,   // Distrito Federal (progressivo 4% a 6%)
    GO: 8.0,   // Goiás (progressivo até 8%)
    CE: 8.0,   // Ceará (progressivo até 8%)
    PE: 8.0,   // Pernambuco (progressivo até 8%)
    ES: 4.0    // Espírito Santo (fixo 4%)
  };

  const TributarioEngine = {
    // Limite de isenção anual legal do ITCMD (2.500 UFESPs / SP como padrão de referência nacional)
    LIMITE_ISENCAO_ANUAL: 96050,

    // Tipos de Conta no Exterior & Regras Sucessórias (Páginas 4 e 5 BTG Pactual)
    TIPOS_CONTA_EXTERIOR: {
      individual: {
        id: "individual",
        nome: "Conta Individual",
        nomeCurto: "Conta Individual",
        sujeitoInventario: true,
        congelamentoInventario: "Conta é congelada e está sujeita a inventário nos EUA (Probate judicial)",
        inventario: "Sujeita a inventário nos EUA (Probate judicial)",
        congelamento: "Conta é congelada e somente liberada com inventário e forms do IRS",
        estateTax: "Sujeita ao US Estate Tax (18% a 40% sobre o excedente a USD 60k em US Situs Assets)",
        forms: "Form 706-NA (apuração de estate tax para não-residentes) e Form 5173 (Transfer Certificate perante o IRS)",
        formsNecessarios: "Form 706-NA (apuração de estate tax) e Form 5173 (certificado de liberação do IRS)"
      },
      tod: {
        id: "tod",
        nome: "Transfer on Death (TOD)",
        nomeCurto: "Transfer on Death",
        sujeitoInventario: false,
        congelamentoInventario: "Conta é congelada temporariamente e NÃO está sujeita a inventário (dispensa probate nos EUA)",
        inventario: "Não está sujeita a inventário judicial (dispensa Probate)",
        congelamento: "Conta é congelada e liberada após envio de forms do IRS",
        estateTax: "Sujeita ao US Estate Tax (18% a 40% sobre o excedente a USD 60k em US Situs Assets)",
        forms: "Form 706-NA (apuração de estate tax para não-residentes) e Form 5173 (Transfer Certificate perante o IRS)",
        formsNecessarios: "Form 706-NA (apuração de estate tax) e Form 5173 (certificado de liberação do IRS)"
      },
      tic: {
        id: "tic",
        nome: "Joint Tenants in Common (TIC)",
        nomeCurto: "Joint Tenants in Common",
        sujeitoInventario: true,
        congelamentoInventario: "Conta é congelada na proporção da cota do falecido (fração do cotitular é liberada)",
        inventario: "Sujeita a inventário na proporção da participação do titular falecido",
        congelamento: "Conta é congelada na proporção da participação do falecido, sendo liberada a outra parcela",
        estateTax: "Sujeita ao US Estate Tax sobre a cota-parte do falecido (> USD 60k em US Situs Assets)",
        forms: "Form 706-NA (apuração de estate tax para não-residentes) e Form 5173 (Transfer Certificate perante o IRS)",
        formsNecessarios: "Form 706-NA (apuração de estate tax) e Form 5173 (certificado de liberação do IRS)"
      },
      jtwrs: {
        id: "jtwrs",
        nome: "JTWRS (Joint Tenants with Rights of Survivorship)",
        nomeCurto: "JTWRS",
        sujeitoInventario: false,
        congelamentoInventario: "Conta é congelada temporariamente e NÃO está sujeita a inventário (transmissão ao titular sobrevivente)",
        inventario: "Não está sujeita a inventário judicial (dispensa Probate)",
        congelamento: "Conta é congelada temporariamente para apuração fiscal",
        estateTax: "Sujeita ao US Estate Tax (18% a 40% sobre o excedente a USD 60k em US Situs Assets)",
        forms: "Form 706-NA (apuração de estate tax para não-residentes) e Form 5173 (Transfer Certificate perante o IRS)",
        formsNecessarios: "Form 706-NA (apuração de estate tax) e Form 5173 (certificado de liberação do IRS)"
      },
      pic: {
        id: "pic",
        nome: "Empresa Offshore / PIC (BVI, Cayman, Bahamas)",
        nomeCurto: "Pessoa Jurídica (PIC)",
        sujeitoInventario: false,
        congelamentoInventario: "Ativos não sofrem inventário nos EUA; ações da PIC seguem as leis societárias da jurisdição sede",
        inventario: "Dispensa inventário nos EUA (Probate); sucessão das ações ocorre na jurisdição da PIC",
        congelamento: "Sem bloqueio pelo IRS americano. Requer instrumento sucessório local para transmissão das ações",
        estateTax: "Isento de US Estate Tax (Ações de empresa estrangeira são ativos Non-US Situs perante o IRS)",
        forms: "Dispensa Form 706-NA perante o IRS americano para ativos subjacentes",
        formsNecessarios: "Dispensa formulários do IRS para ativos subjacentes",
        alertaSucessorio: "Recomendável formalizar Testamento Local (Foreign Will) na jurisdição da PIC para liberação em 3 a 6 meses"
      }
    },

    // Ativos NÃO sujeitos ao US Estate Tax (Página 4 BTG Pactual)
    ATIVOS_ISENTOS_ESTATE_TAX: [
      { id: "tbills", nome: "T-Bills (Treasury Bills)", categoria: "Renda Fixa Pública" },
      { id: "bonds_federais", nome: "Bonds federais (US Treasuries)", categoria: "Renda Fixa Pública" },
      { id: "bonds_corpo_us", nome: "Bonds emitidos por companhias americanas", categoria: "Renda Fixa Corporativa" },
      { id: "bonds_corpo_non_us", nome: "Bonds emitidos por companhias fora dos Estados Unidos", categoria: "Renda Fixa Internacional" },
      { id: "fundos_non_us", nome: "Fundos de investimentos registrados fora dos Estados Unidos (ex: ETFs UCITS)", categoria: "Fundos / ETFs" },
      { id: "acoes_non_us", nome: "Ações emitidas fora dos Estados Unidos", categoria: "Renda Variável Internacional" },
      { id: "conta_banco_us", nome: "Conta em banco americano (depósito bancário)", categoria: "Caixa / Disponibilidade" },
      { id: "seguro_vida", nome: "Life insurance death benefit (Seguro de Vida)", categoria: "Seguros" },
      { id: "imovel_non_us", nome: "Imóvel localizado fora dos Estados Unidos", categoria: "Imóveis" }
    ],

    // Tabela progressiva oficial de US Estate Tax para não-residentes (Página 3 BTG Pactual)
    // Aplicada estritamente sobre a base que exceder a isenção geral de USD 60.000,00
    FAIXAS_ESTATE_TAX: [
      { faixa: 1, de: 0, ate: 10000, aliquota: 0.18, aliquotaPercentual: 18, baseMaxima: 10000, impostoAcumuladoAnterior: 0 },
      { faixa: 2, de: 10000, ate: 20000, aliquota: 0.20, aliquotaPercentual: 20, baseMaxima: 10000, impostoAcumuladoAnterior: 1800 },
      { faixa: 3, de: 20000, ate: 40000, aliquota: 0.22, aliquotaPercentual: 22, baseMaxima: 20000, impostoAcumuladoAnterior: 3800 },
      { faixa: 4, de: 40000, ate: 60000, aliquota: 0.24, aliquotaPercentual: 24, baseMaxima: 20000, impostoAcumuladoAnterior: 8200 },
      { faixa: 5, de: 60000, ate: 80000, aliquota: 0.26, aliquotaPercentual: 26, baseMaxima: 20000, impostoAcumuladoAnterior: 13000 },
      { faixa: 6, de: 80000, ate: 100000, aliquota: 0.28, aliquotaPercentual: 28, baseMaxima: 20000, impostoAcumuladoAnterior: 18200 },
      { faixa: 7, de: 100000, ate: 150000, aliquota: 0.30, aliquotaPercentual: 30, baseMaxima: 50000, impostoAcumuladoAnterior: 23800 },
      { faixa: 8, de: 150000, ate: 250000, aliquota: 0.32, aliquotaPercentual: 32, baseMaxima: 100000, impostoAcumuladoAnterior: 38800 },
      { faixa: 9, de: 250000, ate: 500000, aliquota: 0.34, aliquotaPercentual: 34, baseMaxima: 250000, impostoAcumuladoAnterior: 70800 },
      { faixa: 10, de: 500000, ate: 750000, aliquota: 0.37, aliquotaPercentual: 37, baseMaxima: 250000, impostoAcumuladoAnterior: 155800 },
      { faixa: 11, de: 750000, ate: 1000000, aliquota: 0.39, aliquotaPercentual: 39, baseMaxima: 250000, impostoAcumuladoAnterior: 248300 },
      { faixa: 12, de: 1000000, ate: Infinity, aliquota: 0.40, aliquotaPercentual: 40, baseMaxima: Infinity, impostoAcumuladoAnterior: 345800 }
    ],

    // Calcula o US Estate Tax de forma progressiva
    // Regra mandatória: O imposto incide exclusivamente sobre o valor excedente aos USD 60.000,00 e não sobre o total.
    calcularEstateTaxProgressivo(valorTotalUSD) {
      const totalUSD = Math.max(0, Number(valorTotalUSD) || 0);
      const isencaoUSD = 60000;
      const excedenteUSD = Math.max(0, totalUSD - isencaoUSD);
      const fraseExplicativa = "O imposto é cobrado exclusivamente sobre o valor excedente aos 60 mil dólares e não sobre o valor total.";

      if (excedenteUSD === 0) {
        return {
          totalUSD,
          isencaoUSD,
          excedenteUSD: 0,
          impostoTotalUSD: 0,
          aliquotaEfetivaExcedente: 0,
          aliquotaEfetivaTotal: 0,
          aliquotaMarginal: 0,
          fraseExplicativa,
          isento: true,
          detalhamento: []
        };
      }

      let impostoTotalUSD = 0;
      let aliquotaMarginal = 0;
      const detalhamento = [];

      for (let i = 0; i < this.FAIXAS_ESTATE_TAX.length; i++) {
        const faixa = this.FAIXAS_ESTATE_TAX[i];
        if (excedenteUSD > faixa.de) {
          const baseNaFaixa = Math.min(excedenteUSD - faixa.de, faixa.ate - faixa.de);
          const impostoFaixa = baseNaFaixa * faixa.aliquota;
          impostoTotalUSD += impostoFaixa;
          aliquotaMarginal = faixa.aliquotaPercentual;

          detalhamento.push({
            faixaNumero: faixa.faixa,
            de: faixa.de,
            ate: faixa.ate === Infinity ? null : faixa.ate,
            baseTributada: Math.round(baseNaFaixa * 100) / 100,
            aliquota: faixa.aliquotaPercentual,
            impostoFaixa: Math.round(impostoFaixa * 100) / 100
          });
        }
      }

      impostoTotalUSD = Math.round(impostoTotalUSD * 100) / 100;
      const aliquotaEfetivaExcedente = excedenteUSD > 0
        ? Math.round((impostoTotalUSD / excedenteUSD) * 10000) / 100
        : 0;
      const aliquotaEfetivaTotal = totalUSD > 0
        ? Math.round((impostoTotalUSD / totalUSD) * 10000) / 100
        : 0;

      return {
        totalUSD,
        isencaoUSD,
        excedenteUSD: Math.round(excedenteUSD * 100) / 100,
        impostoTotalUSD,
        aliquotaEfetivaExcedente,
        aliquotaEfetivaTotal,
        aliquotaMarginal,
        fraseExplicativa,
        isento: false,
        detalhamento
      };
    },

    // Analisa exposição a Estate Tax com suporte a tipos de conta, cota TIC, ativos isentos e proporção US Situs
    analisarExposicaoEstateTax(params = {}) {
      const valorUSD = Math.max(0, Number(params.valorOffshoreUSD) || 0);
      const tipoConta = String(params.tipoConta || "individual").toLowerCase().trim();
      const regrasConta = this.obterRegrasContaExterior(tipoConta);
      const ativosIsentos = Array.isArray(params.ativosIsentos) ? params.ativosIsentos : [];
      const qtdIsentos = ativosIsentos.length;
      const limiteIsencaoGeralUSD = 60000;
      const temOffshore = valorUSD > 0;
      const fraseExplicativa = "O imposto é cobrado exclusivamente sobre o valor excedente aos 60 mil dólares e não sobre o valor total.";

      if (!temOffshore) {
        return {
          status: "sem_offshore",
          mensagem: "Sem aplicações offshore cadastradas.",
          classeBadge: "neutral",
          exposicao: false,
          tipoConta,
          regrasConta,
          saldoTotalUSD: 0,
          saldoRelevanteUSD: 0,
          percUSSitus: 0,
          saldoExpostoUSD: 0,
          saldoIsentoUSD: 0,
          fraseExplicativa,
          calculoProgressivo: this.calcularEstateTaxProgressivo(0)
        };
      }

      // 1. ESTRUTURA DE PESSOA JURÍDICA (PIC - BVI, CAYMAN, BAHAMAS)
      // Ações de PIC são ativos Non-US Situs perante o IRS: Isenção total de US Estate Tax
      if (tipoConta === "pic") {
        const calcZero = {
          ...this.calcularEstateTaxProgressivo(0),
          totalUSD: valorUSD,
          isencaoUSD: limiteIsencaoGeralUSD,
          excedenteUSD: 0,
          impostoTotalUSD: 0,
          aliquotaEfetivaExcedente: 0,
          aliquotaMarginal: 0,
          isentoPorEstruturaPJ: true
        };
        return {
          status: "estrutura_pic_isenta",
          mensagem: "Estrutura Pessoa Jurídica (Empresa Offshore / PIC) blindada contra US Estate Tax nos EUA (ações de offshore estrangeira são ativos Non-US Situs). Recomendável formalizar Testamento Local (Foreign Will) na jurisdição sede para liberação ágil das cotas.",
          classeBadge: "protegido",
          exposicao: false,
          tipoConta,
          regrasConta,
          saldoTotalUSD: valorUSD,
          saldoRelevanteUSD: valorUSD,
          percUSSitus: 0,
          saldoExpostoUSD: 0,
          saldoIsentoUSD: valorUSD,
          fraseExplicativa,
          calculoProgressivo: calcZero
        };
      }

      // 2. COTA-PARTE EM CONTA CONJUNTA (TIC - Joint Tenants in Common)
      let cotaFalecido = 100;
      let saldoRelevanteUSD = valorUSD;
      if (tipoConta === "tic") {
        cotaFalecido = params.cotaFalecidoPercentual !== undefined && params.cotaFalecidoPercentual !== null && params.cotaFalecidoPercentual !== ""
          ? Math.max(1, Math.min(100, Number(params.cotaFalecidoPercentual)))
          : 50;
        saldoRelevanteUSD = (valorUSD * cotaFalecido) / 100;
      }

      // 3. APURAÇÃO DA PROPORÇÃO EM ATIVOS US SITUS vs ISENTOS
      let percUSSitus = 100;
      if (params.percentualUSSitus !== undefined && params.percentualUSSitus !== null && params.percentualUSSitus !== "") {
        percUSSitus = Math.max(0, Math.min(100, Number(params.percentualUSSitus)));
      } else if (qtdIsentos > 0) {
        // Fallback compatível com chamadas legadas
        percUSSitus = 0;
      }

      const saldoExpostoUSD = Math.round(((saldoRelevanteUSD * percUSSitus) / 100) * 100) / 100;
      const saldoIsentoUSD = Math.round((saldoRelevanteUSD - saldoExpostoUSD) * 100) / 100;
      const calculoProgressivo = this.calcularEstateTaxProgressivo(saldoExpostoUSD);

      // CASO A: Compatibilidade com teste legado (ativosIsentos passados sem percentualUSSitus explícito)
      if (qtdIsentos > 0 && params.percentualUSSitus === undefined) {
        return {
          status: "ativos_isentos_selecionados",
          mensagem: `${qtdIsentos} ativo(s) sem incidência de Estate Tax selecionado(s). Ativos como T-Bills, Treasuries, Bonds e fundos UCITS possuem isenção fiscal nos EUA.`,
          classeBadge: "protegido",
          exposicao: false,
          qtdIsentos,
          tipoConta,
          regrasConta,
          saldoTotalUSD: valorUSD,
          saldoRelevanteUSD,
          percUSSitus: 0,
          saldoExpostoUSD: 0,
          saldoIsentoUSD: saldoRelevanteUSD,
          cotaFalecidoPercentual: cotaFalecido,
          fraseExplicativa,
          calculoProgressivo: {
            ...calculoProgressivo,
            totalUSD: valorUSD,
            impostoTotalUSD: 0,
            aliquotaEfetivaExcedente: 0,
            aliquotaEfetivaTotal: 0,
            isentoPorAtivo: true
          }
        };
      }

      // CASO B: Carteira 100% em ativos isentos (Non-US Situs)
      if (percUSSitus === 0) {
        return {
          status: "100_porcento_isento",
          mensagem: "100% da carteira alocada em ativos isentos de Estate Tax nos EUA (Non-US Situs, como T-Bills, US Treasuries, Bonds corporativos ou fundos/ETFs UCITS).",
          classeBadge: "protegido",
          exposicao: false,
          tipoConta,
          regrasConta,
          saldoTotalUSD: valorUSD,
          saldoRelevanteUSD,
          percUSSitus: 0,
          saldoExpostoUSD: 0,
          saldoIsentoUSD: saldoRelevanteUSD,
          cotaFalecidoPercentual: cotaFalecido,
          fraseExplicativa,
          calculoProgressivo: {
            ...calculoProgressivo,
            totalUSD: valorUSD,
            impostoTotalUSD: 0,
            aliquotaEfetivaExcedente: 0,
            aliquotaEfetivaTotal: 0,
            isentoPorAtivo: true
          }
        };
      }

      // CASO C: Saldo exposto acima de USD 60.000 (Tributável)
      if (saldoExpostoUSD > limiteIsencaoGeralUSD) {
        const complementoTIC = tipoConta === "tic" ? ` (apurado sobre a cota de ${cotaFalecido}% do falecido)` : "";
        return {
          status: "potencial_exposicao",
          mensagem: `Atenção: Saldo em ativos americanos tributáveis (USD ${saldoExpostoUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}${complementoTIC}) excede a isenção de USD 60.000. Haverá incidência de Estate Tax progressivo (18% a 40%) sobre o valor excedente.`,
          classeBadge: "alerta",
          exposicao: true,
          tipoConta,
          regrasConta,
          saldoTotalUSD: valorUSD,
          saldoRelevanteUSD,
          percUSSitus,
          saldoExpostoUSD,
          saldoIsentoUSD,
          cotaFalecidoPercentual: cotaFalecido,
          fraseExplicativa,
          calculoProgressivo: {
            ...calculoProgressivo,
            totalUSD: valorUSD,
            saldoExpostoUSD
          }
        };
      }

      // CASO D: Saldo exposto dentro da faixa de isenção geral de USD 60k
      return {
        status: "dentro_limite_isencao",
        mensagem: `Saldo exposto a ativos americanos (USD ${saldoExpostoUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}) dentro da faixa de isenção geral de USD 60.000 para não-residentes (NRA).`,
        classeBadge: "info",
        exposicao: false,
        tipoConta,
        regrasConta,
        saldoTotalUSD: valorUSD,
        saldoRelevanteUSD,
        percUSSitus,
        saldoExpostoUSD,
        saldoIsentoUSD,
        cotaFalecidoPercentual: cotaFalecido,
        fraseExplicativa,
        calculoProgressivo: {
          ...calculoProgressivo,
          totalUSD: valorUSD,
          saldoExpostoUSD
        }
      };
    },

    // Estimativa de IRPF Anual no exterior na Pessoa Física (Lei nº 14.754/2023 - 15% na DAA)
    calcularEstimativaLei14754(saldoUSD, rentabilidadeEstimada = 0.05, ptax = 5.5) {
      const saldo = Math.max(0, Number(saldoUSD) || 0);
      const taxaRent = Math.max(0, Number(rentabilidadeEstimada) || 0.05);
      const cotacao = Math.max(0.1, Number(ptax) || 5.5);
      const rendimentoAnualUSD = Math.round(saldo * taxaRent * 100) / 100;
      const aliquotaIRPF = 0.15;
      const impostoAnualUSD = Math.round(rendimentoAnualUSD * aliquotaIRPF * 100) / 100;
      const impostoAnualBRL = Math.round(impostoAnualUSD * cotacao * 100) / 100;

      return {
        saldoUSD: saldo,
        taxaRentabilidade: taxaRent,
        rendimentoAnualUSD,
        aliquotaPercentual: 15,
        impostoAnualUSD,
        impostoAnualBRL,
        ptax: cotacao,
        regra: "Alíquota fixa de 15% apurada anualmente na Declaração de Ajuste Anual (DAA), com regime de caixa e tributação integral da variação cambial."
      };
    },

    // Consulta de regras da conta exterior com fallback seguro para Conta Individual
    obterRegrasContaExterior(tipoId) {
      const chave = String(tipoId || "individual").toLowerCase().trim();
      return this.TIPOS_CONTA_EXTERIOR[chave] || this.TIPOS_CONTA_EXTERIOR.individual;
    },

    // Valida e aplica trava ao valor anual de doação isenta
    validarLimiteDoacaoIsenta(valor) {
      const num = Math.max(0, Number(valor) || 0);
      const excedeu = num > this.LIMITE_ISENCAO_ANUAL;
      return {
        valorValido: excedeu ? this.LIMITE_ISENCAO_ANUAL : num,
        excedeuLimite: excedeu,
        limiteMaximo: this.LIMITE_ISENCAO_ANUAL
      };
    },

    // Obter alíquota estimada do ITCMD por Estado
    obterAliquotaITCMD(uf) {
      if (!uf) return 4.0;
      const ufUpper = String(uf).toUpperCase().trim();
      return ALIQUOTAS_ITCMD_ESTADOS[ufUpper] !== undefined ? ALIQUOTAS_ITCMD_ESTADOS[ufUpper] : 4.0;
    },

    // Calcular custo bruto do inventário (ITCMD + Honorários + Custas)
    calcularCustosInventario(totalPatrimonio, aliquotaITCMD, pctHonorarios, pctCustas) {
      const patrimonio = Math.max(0, Number(totalPatrimonio) || 0);
      const itcmdPct = Math.max(0, Number(aliquotaITCMD) || 0) / 100;
      const honorariosPct = Math.max(0, Number(pctHonorarios) || 0) / 100;
      const custasPct = Math.max(0, Number(pctCustas) || 0) / 100;

      const valorITCMD = patrimonio * itcmdPct;
      const valorHonorarios = patrimonio * honorariosPct;
      const valorCustas = patrimonio * custasPct;

      const totalPrejuizo = valorITCMD + valorHonorarios + valorCustas;
      const pctPrejuizoTotal = patrimonio > 0 ? (totalPrejuizo / patrimonio) * 100 : 0;

      return {
        patrimonio,
        valorITCMD,
        valorHonorarios,
        valorCustas,
        totalPrejuizo,
        pctPrejuizoTotal
      };
    },

    // Gera a memória de cálculo analítica e auditável do prejuízo tributário
    calcularMemoriaPrejuizo(params) {
      const p = params || {};
      const patrimonioBruto = Math.max(0, Number(p.totalPatrimonio) || 0);
      const valorPrevidencia = Math.max(0, Number(p.valorPrevidencia) || 0);
      const valorOffshore = Math.max(0, Number(p.valorOffshore) || 0);

      // Subtotal líquido excluindo ativos isentos de inventário e ativos offshore
      const subtotalLiquido = Math.max(0, patrimonioBruto - valorPrevidencia - valorOffshore);

      // Avaliação do regime matrimonial
      const regimeStr = String(p.regime || "").toLowerCase();
      const temMeacao = regimeStr.includes("comunhão") || regimeStr.includes("comunhao") ||
                        regimeStr.includes("participação final") || regimeStr.includes("participacao final") ||
                        regimeStr.includes("aquestos");
      const multiplicadorRegime = temMeacao ? 0.5 : 1.0;
      const regimeDescricao = temMeacao ? "50% (Meação do Cônjuge)" : "100% (Sem Meação)";

      // Base tributável final
      const baseTributavel = subtotalLiquido * multiplicadorRegime;

      // Taxas e encargos incidentes
      const taxaITCMD = Math.max(0, Number(p.itcmd) || 0);
      const taxaHonorarios = Math.max(0, Number(p.honorarios) || 0);
      const taxaCustas = Math.max(0, Number(p.custas) || 0);
      const taxaTotal = taxaITCMD + taxaHonorarios + taxaCustas;

      // Valores nominais de cada custo
      const valorITCMD = baseTributavel * (taxaITCMD / 100);
      const valorHonorarios = baseTributavel * (taxaHonorarios / 100);
      const valorCustas = baseTributavel * (taxaCustas / 100);
      const prejuizoTotal = baseTributavel * (taxaTotal / 100);

      const pctSobrePatrimonio = patrimonioBruto > 0 ? (prejuizoTotal / patrimonioBruto) * 100 : 0;

      return {
        patrimonioBruto,
        valorPrevidencia,
        valorOffshore,
        subtotalLiquido,
        multiplicadorRegime,
        temMeacao,
        regimeDescricao,
        baseTributavel,
        taxaITCMD,
        valorITCMD,
        taxaHonorarios,
        valorHonorarios,
        taxaCustas,
        valorCustas,
        taxaTotal,
        prejuizoTotal,
        pctSobrePatrimonio
      };
    },

    // Calcular partilha de bens (Meação vs. Herança)
    calcularPartilhaRegime(dadosPatrimonio, familia, totalPatrimonio = 0) {
      const dp = dadosPatrimonio || {};
      const fam = familia || {};
      const regime = fam.regime || "comunhao_parcial";
      const total = Number(totalPatrimonio) || Number(dp.totalPatrimonio) || 0;

      let meacaoConjuge = 0;
      let herancaTransmitida = 0;

      if (fam.estadoCivil !== "casado") {
        // Solteiro / Divorciado / Viúvo: 100% vira herança
        meacaoConjuge = 0;
        herancaTransmitida = total;
      } else {
        switch (regime) {
          case "comunhao_universal":
            // 50% meação, 50% herança
            meacaoConjuge = total * 0.5;
            herancaTransmitida = total * 0.5;
            break;

          case "separacao_total":
            // 0% meação, 100% herança (cônjuge concorre com filhos)
            meacaoConjuge = 0;
            herancaTransmitida = total;
            break;

          case "comunhao_parcial":
          default:
            // Bens adquiridos na constância do casamento (meação 50%) + bens particulares (herança)
            const bensParticulares = Number(dp.bens_particulares) || 0;
            const bensComuns = Math.max(0, total - bensParticulares);
            
            meacaoConjuge = bensComuns * 0.5;
            herancaTransmitida = (bensComuns * 0.5) + bensParticulares;
            break;
        }
      }

      return {
        totalPatrimonio: total,
        regime,
        meacaoConjuge,
        herancaTransmitida
      };
    },

    // Calcular partilha sucessória completa (Código Civil Brasileiro - Arts. 1.829 a 1.839)
    // Função pura: recebe parâmetros sem efeitos colaterais e sem dependência de DOM ou storage
    calcularPartilhaSucessoria(parametros) {
      const params = parametros || {};
      const fam = params.familia || {};

      const totalNum = Math.max(0, Number(params.totalPatrimonio) || 0);
      const prevNum = Math.max(0, Number(params.valorPrevidencia) || 0);
      const offshoreNum = Math.max(0, Number(params.valorOffshore) || 0);
      const bensParticularesNum = Math.max(0, Number(params.bensParticulares) || 0);

      // Previdência e Aplicações Offshore não entram no inventário estadual brasileiro
      const totalCalculo = Math.max(0, totalNum - prevNum - offshoreNum);

      const casado = String(fam.estadoCivil || "").toLowerCase() === "casado";
      const temFilhos = String(fam.temFilhos || "").toLowerCase() === "sim";
      const qtdFilhos = Number(fam.qtdFilhos) || 0;
      const possuiPais = String(fam.possuiPais || "").toLowerCase() === "sim";
      const qtdPais = Number(fam.qtdPais) || 0;
      const possuiColaterais = String(fam.possuiColaterais || "").toLowerCase() === "sim";
      const qtdColaterais = Number(fam.qtdColaterais) || 0;

      const regimeNorm = String(fam.regime || "comunhao_parcial")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/_/g, " ");

      const comunhaoUniversal = regimeNorm.includes("comunhao universal");
      const separacaoTotal = regimeNorm.includes("separacao total");
      const comunhaoParcial = regimeNorm.includes("comunhao parcial") || regimeNorm.includes("participacao final") || regimeNorm.includes("aquestos");
      const comunhao = comunhaoParcial || comunhaoUniversal;

      let bensComuns = 0;
      let bensParticularesCalculo = 0;

      if (casado) {
        if (comunhaoUniversal) {
          bensComuns = totalCalculo;
          bensParticularesCalculo = 0;
        } else if (comunhaoParcial) {
          bensParticularesCalculo = Math.min(totalCalculo, bensParticularesNum);
          bensComuns = Math.max(0, totalCalculo - bensParticularesCalculo);
        } else if (separacaoTotal) {
          bensComuns = 0;
          bensParticularesCalculo = totalCalculo;
        } else {
          bensComuns = totalCalculo;
          bensParticularesCalculo = 0;
        }
      } else {
        bensComuns = 0;
        bensParticularesCalculo = totalCalculo;
      }

      // Meação (somente sobre bens comuns)
      let meacao = 0;
      if (casado && comunhao) {
        meacao = bensComuns * 0.5;
      }

      // Divisão da Herança dos Bens Comuns
      const herancaComuns = bensComuns * (casado && comunhao ? 0.5 : 1);
      let cHerancaComuns = 0;
      let filhosComuns = 0;
      let paisComuns = 0;
      let colateraisComuns = 0;
      let uniaoComuns = 0;

      if (temFilhos && qtdFilhos > 0) {
        if (casado && comunhao) {
          cHerancaComuns = 0;
          filhosComuns = herancaComuns;
        } else if (casado && !separacaoTotal) {
          const quotaConjuge = qtdFilhos >= 3 ? herancaComuns * 0.25 : herancaComuns / (qtdFilhos + 1);
          cHerancaComuns = quotaConjuge;
          filhosComuns = herancaComuns - cHerancaComuns;
        } else {
          cHerancaComuns = 0;
          filhosComuns = herancaComuns;
        }
      } else if (possuiPais && qtdPais > 0) {
        if (casado) {
          cHerancaComuns = herancaComuns / (qtdPais + 1);
          paisComuns = herancaComuns - cHerancaComuns;
        } else {
          cHerancaComuns = 0;
          paisComuns = herancaComuns;
        }
      } else if (casado) {
        cHerancaComuns = herancaComuns;
      } else if (possuiColaterais && qtdColaterais > 0) {
        colateraisComuns = herancaComuns;
      } else {
        uniaoComuns = herancaComuns;
      }

      // Divisão da Herança dos Bens Particulares
      const herancaParticulares = bensParticularesCalculo;
      let cHerancaParticulares = 0;
      let filhosParticulares = 0;
      let paisParticulares = 0;
      let colateraisParticulares = 0;
      let uniaoParticulares = 0;

      if (temFilhos && qtdFilhos > 0) {
        if (casado && (comunhaoParcial || separacaoTotal)) {
          const quotaConjuge = herancaParticulares / (qtdFilhos + 1);
          cHerancaParticulares = quotaConjuge;
          filhosParticulares = herancaParticulares - cHerancaParticulares;
        } else {
          cHerancaParticulares = 0;
          filhosParticulares = herancaParticulares;
        }
      } else {
        if (casado && comunhaoParcial) {
          cHerancaParticulares = herancaParticulares;
          filhosParticulares = 0;
        } else if (possuiPais && qtdPais > 0) {
          if (casado) {
            cHerancaParticulares = herancaParticulares / (qtdPais + 1);
            paisParticulares = herancaParticulares - cHerancaParticulares;
          } else {
            cHerancaParticulares = 0;
            paisParticulares = herancaParticulares;
          }
        } else if (casado) {
          cHerancaParticulares = herancaParticulares;
        } else if (possuiColaterais && qtdColaterais > 0) {
          colateraisParticulares = herancaParticulares;
        } else {
          uniaoParticulares = herancaParticulares;
        }
      }

      // Montagem de quotas, fatias e labels estruturados
      const labels = [];
      const fatias = [];

      const totalHerancaConjuge = cHerancaComuns + cHerancaParticulares;
      const totalConjuge = meacao + totalHerancaConjuge;
      if (totalConjuge > 0) {
        labels.push("Cônjuge (Meação + Herança)");
        fatias.push(totalConjuge);
      }

      const totalFilhos = filhosComuns + filhosParticulares;
      if (totalFilhos > 0 && qtdFilhos > 0) {
        const quotaPorFilho = totalFilhos / qtdFilhos;
        for (let i = 1; i <= qtdFilhos; i++) {
          labels.push(`Filho ${i}`);
          fatias.push(quotaPorFilho);
        }
      }

      const totalPais = paisComuns + paisParticulares;
      if (totalPais > 0 && qtdPais > 0) {
        const quotaPorPai = totalPais / qtdPais;
        for (let i = 1; i <= qtdPais; i++) {
          labels.push(qtdPais === 2 ? (i === 1 ? "Pai" : "Mãe") : "Ascendente");
          fatias.push(quotaPorPai);
        }
      }

      const totalColaterais = colateraisComuns + colateraisParticulares;
      if (totalColaterais > 0 && qtdColaterais > 0) {
        const quotaPorColateral = totalColaterais / qtdColaterais;
        for (let i = 1; i <= qtdColaterais; i++) {
          labels.push(`Colateral ${i}`);
          fatias.push(quotaPorColateral);
        }
      }

      const totalUniao = uniaoComuns + uniaoParticulares;
      if (totalUniao > 0) {
        labels.push("Município / DF / União");
        fatias.push(totalUniao);
      }

      const heranca = totalCalculo - meacao;

      return {
        totalCalculo,
        meacao,
        heranca,
        fatiaConjugeTotal: totalConjuge,
        labels,
        fatias,
        detalhes: {
          bensComuns,
          bensParticulares: bensParticularesCalculo,
          cHerancaComuns,
          cHerancaParticulares,
          filhosComuns,
          filhosParticulares,
          paisComuns,
          paisParticulares,
          colateraisComuns,
          colateraisParticulares,
          uniaoComuns,
          uniaoParticulares
        }
      };
    },

    // Calcular as 4 Estratégias de Preservação e Liquidez Sucessória
    calcularEstrategias(totalPatrimonio, prejuizoBruto, inputs) {
      const patrimonio = Math.max(0, Number(totalPatrimonio) || 0);
      const prejuizo = Math.max(0, Number(prejuizoBruto) || 0);
      const inp = inputs || {};

      // 1. Doação Gradual em Vida (Aproveita isenção de ITCMD até limite anual)
      const pctDoacaoGradual = Math.min(100, Math.max(0, Number(inp.doacao) || 0));
      const valorDoadoGradual = patrimonio * (pctDoacaoGradual / 100);
      const economiaITCMDGradual = valorDoadoGradual * ((Number(inp.itcmd) || 4) / 100);
      const prejuizoAjustadoGradual = Math.max(0, prejuizo - economiaITCMDGradual);

      // 2. Doação à Vista com Reserva de Usufruto
      const pctDoacaoAVista = Math.min(100, Math.max(0, Number(inp.doacao_avista) || 0));
      const valorDoadoAVista = patrimonio * (pctDoacaoAVista / 100);
      // Na doação à vista paga-se ITCMD antecipado (geralmente com desconto de usufruto de 1/3 em alguns estados)
      const itcmdAntecipado = valorDoadoAVista * ((Number(inp.itcmd) || 4) / 100) * 0.67;

      // 3. Previdência Privada (VGBL/PGBL sem inventário)
      const valorPrevidencia = Math.max(0, Number(inp.previdencia) || 0);
      // Previdência transmite direto aos beneficiários sem custas judiciais e sem honorários
      const economiaInventarioPrev = valorPrevidencia * (((Number(inp.honorarios) || 5) + (Number(inp.custas) || 1.5)) / 100);

      // 4. Seguro Sucessão (Alavancagem de Liquidez em 120 parcelas)
      const capitalSeguro = Math.max(0, Number(inp.seguro_capital) || prejuizo);
      const idadeSegurado = Number(inp.seguro_idade) || 40;
      
      // Estimativa aproximada de taxa de seguro de vida resgatável/sucessório (~0.8% a 1.8% a.a. dependendo da idade)
      const taxaAnualSeguro = 0.008 + Math.max(0, (idadeSegurado - 30) * 0.0003);
      const premioAnual = capitalSeguro * taxaAnualSeguro;
      const premioMensal = premioAnual / 12;

      return {
        gradual: {
          pct: pctDoacaoGradual,
          valorDoado: valorDoadoGradual,
          economiaITCMD: economiaITCMDGradual,
          prejuizoAjustado: prejuizoAjustadoGradual
        },
        aVista: {
          pct: pctDoacaoAVista,
          valorDoado: valorDoadoAVista,
          itcmdAntecipado
        },
        previdencia: {
          valor: valorPrevidencia,
          economiaInventario: economiaInventarioPrev
        },
        seguro: {
          capitalSeguro,
          idadeSegurado,
          premioAnual,
          premioMensal
        }
      };
    },

    /**
     * 9. Consolida métricas de usabilidade por usuário (acessos e relatórios gerados) para o Painel Master
     */
    consolidarUsabilidadeMaster(perfis = [], relatorios = []) {
      const mapa = new Map();
      const masterUid = "130e3598-89b9-4702-a4cc-2c5923fa3a66";

      (Array.isArray(perfis) ? perfis : []).forEach(p => {
        if (!p || !p.id) return;
        const roleFinal = (p.id === masterUid || String(p.role || "").toLowerCase() === "master")
          ? "master"
          : (p.role || "assessor").toLowerCase();
        mapa.set(p.id, {
          id: p.id,
          email: p.email || "",
          full_name: p.full_name || "Assessor",
          role: roleFinal,
          ultimo_acesso: p.ultimo_acesso || p.last_sign_in_at || null,
          total_relatorios: 0,
          total_patrimonio: 0
        });
      });

      (Array.isArray(relatorios) ? relatorios : []).forEach(r => {
        if (!r || !r.userId) return;
        const u = mapa.get(r.userId);
        if (u) {
          u.total_relatorios += 1;
          u.total_patrimonio += Number(r.totalPatrimonio) || 0;
          if (!u.ultimo_acesso || (r.dataCriacao && new Date(r.dataCriacao) > new Date(u.ultimo_acesso))) {
            u.ultimo_acesso = r.dataCriacao;
          }
        }
      });

      return Array.from(mapa.values());
    },

    /**
     * 10. Filtra relatórios conforme perfil do usuário (Master tem acesso completo a todos os relatórios)
     */
    filtrarRelatoriosPorPermissao(relatorios = [], usuario = null) {
      if (!usuario || !Array.isArray(relatorios)) return [];
      const masterUid = "130e3598-89b9-4702-a4cc-2c5923fa3a66";
      const isMaster = usuario.role === "master" ||
        usuario.profile_role === "master" ||
        usuario.id === masterUid;
      if (isMaster) return [...relatorios];
      return relatorios.filter(r => r.userId === usuario.id);
    }
  };

  // Exposição Universal (Compatível com Navegador e Node.js / Test Runners)
  global.TributarioEngine = TributarioEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TributarioEngine;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
