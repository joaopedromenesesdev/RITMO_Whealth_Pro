# 📐 DOCUMENTATION.md — Especificação Técnica e Regras de Negócio

## Pace Capital — Wealth Planner Pro

Este documento contém a especificação técnica detalhada, regras tributárias e sucessórias, modelos de dados e arquitetura de software da plataforma **Wealth Planner Pro**.

---

## 📑 Sumário

1. [Arquitetura Geral e Ciclo de Vida do Estado](#1-arquitetura-geral-e-ciclo-de-vida-do-estado)
2. [Modelo de Dados e Dicionário do Supabase/Storage](#2-modelo-de-dados-e-dicionário-do-supabasestorage)
3. [Regras Tributárias e Cálculo do ITCMD por Estado](#3-regras-tributárias-e-cálculo-do-itcmd-por-estado)
4. [Direito Sucessório e Regimes de Bens](#4-direito-sucessório-e-regimes-de-bens)
5. [Modelos Matemáticos das Estratégias de Preservação](#5-modelos-matemáticos-das-estratégias-de-preservação)
6. [Motor de Relatórios e Exportação em PDF](#6-motor-de-relatórios-e-exportação-em-pdf)
7. [Segurança, Autenticação e RLS](#7-segurança-autenticação-e-rls)

---

## 1. Arquitetura Geral e Ciclo de Vida do Estado

A plataforma opera em arquitetura **Single-Page Dynamic State** dividida em 5 visões lógicas acopladas via `sessionStorage` e sincronizadas via `db.js` com o Supabase:

```
[login.html] ➔ [index.html (Dashboard)]
                     │
                     ├─► [nova_simulacao.html]
                     │         │
                     │         ▼
                     ├─► [patrimonio.html] ──(sessionStorage)──► [patrimonio_dados]
                     │         │
                     │         ▼
                     ├─► [familiar.html]   ──(sessionStorage)──► [familia]
                     │         │
                     │         ▼
                     ├─► [evolucao.html]   ──(sessionStorage)──► [evolucao_dados]
                     │         │
                     │         ▼
                     └─► [tributario.html] ──(Sincroniza Nuvem)──► [Supabase DB]
                               │
                               ▼
                        [PDF Relatório (5 Páginas)]
```

### Abstração de Dados (`script/db.js`)
O modulo `db.js` atua como **Repository Pattern**, encapsulando chamadas assíncronas ao Supabase e garantindo fallback para `localStorage` em caso de falta de conectividade.

---

## 2. Modelo de Dados e Dicionário do Supabase/Storage

### 2.1 Tabela `simulacoes` (PostgreSQL / Supabase)

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador único gerado por `gen_random_uuid()` |
| `user_id` | `UUID` (FK) | ID do assessor autenticado (`auth.users.id`) |
| `nome_cliente` | `TEXT` | Nome completo do cliente |
| `nome_assessor` | `TEXT` | Nome do assessor responsável |
| `total_patrimonio` | `NUMERIC(15,2)` | Valor total bruto do patrimônio em R$ |
| `prejuizo_tributario` | `NUMERIC(15,2)` | Custo estimado de inventário e impostos em R$ |
| `dados_completos` | `JSONB` | Payload consolidado com todo o estado da simulação |
| `data_criacao` | `TIMESTAMPTZ` | Timestamp de criação da simulação |

### 2.2 Estrutura do Payload `dados_completos` (JSONB)
```json
{
  "nome_cliente": "João Silva",
  "nome_assessor": "Carlos Assessor",
  "data_reuniao": "23/07/2026",
  "patrimonio": {
    "rf": "1.000.000,00",
    "rv": "500.000,00",
    "inter": "200.000,00",
    "prev": "800.000,00",
    "offshore": "0,00",
    "apt": "1.500.000,00",
    "casa": "0,00",
    "terr": "0,00",
    "galp": "0,00",
    "bens": "150.000,00",
    "empresas": [
      { "nome": "Empresa X", "valor": "2.000.000,00", "pct": "50" }
    ]
  },
  "familia": {
    "nome": "João Silva",
    "estadoCivil": "casado",
    "conjuge": "Maria Silva",
    "regime": "Comunhão Parcial de Bens",
    "temFilhos": "sim",
    "qtdFilhos": "2",
    "idadesFilhos": ["15", "18"]
  },
  "evolucao": {
    "anos": 10,
    "taxaJuros": 6.5,
    "inflacao": 4.0,
    "aporteMensal": 5000
  },
  "tributario": {
    "uf": "SP",
    "itcmd": 4.0,
    "honorarios": 5.0,
    "custas": 2.0,
    "previdencia": 800000,
    "seguro_capital": 350000
  }
}
```

---

## 3. Regras Tributárias e Cálculo do ITCMD por Estado

### 3.1 Base de Cálculo do Inventário
O cálculo da base tributável exclui expressamente os valores em **Previdência Privada** (ex: VGBL/PGBL, conforme art. 794 do Código Civil) e a **Meação** do cônjuge/companheiro (quando aplicável pelo regime de bens):

$$\text{Base ITCMD} = \max\left(0, \text{Patrimônio Total} - \text{Previdência Privada} - \text{Meação}\right)$$

### 3.2 Tabela de ITCMD e Custo de Inventário
O sistema calcula três principais componentes de custo:
1. **ITCMD (Imposto sobre Transmissão Causa Mortis e Doação)**: Alíquota estadual progressiva ou fixa (variação de 2% a 8% dependendo da UF).
2. **Honorários Advocatícios**: Média parametrizável de 3% a 8% sobre a base do inventário.
3. **Custas Processuais e Cartorárias**: Tabela oficial de custas judiciais/escrituras públicas (média de 1.5% a 3%).

---

## 4. Direito Sucessório e Regimes de Bens

O módulo `script/script_familiar.js` implementa as regras da legislação civil brasileira (Código Civil / 2002):

### 4.1 Comunhão Parcial de Bens
- **Meação (50%)**: Incide apenas sobre os bens adquiridos a título oneroso durante a constância do casamento (Aquestos).
- **Herança**: O cônjuge concorre com os descendentes exclusivamente sobre os **bens particulares** (adquiridos antes do casamento ou por doação/herança).

### 4.2 Comunhão Universal de Bens
- **Meação (50%)**: Incide sobre a totalidade do patrimônio (bens passados e presentes).
- **Herança**: O cônjuge **não concorre** com os descendentes na herança, pois já possui 50% de meação sobre todo o acervo.

### 4.3 Separação Total de Bens
- **Meação (0%)**: Não há patrimônio comum.
- **Herança**: O cônjuge sobrevivente é herdeiro necessário e concorre em igualdade de condições com os descendentes sobre a totalidade dos bens deixados.

---

## 5. Modelos Matemáticos das Estratégias de Preservação

### Estratégia 1: Doação Gradual em Vida
Dedução anual respeitando a faixa de isenção de ITCMD do estado (exemplo: até 2.500 UFESPs em SP, equivalente a ~R$ 96.050,00 por ano).
- **Cenário Atual**: Anos necessários para transmitir sem imposto no ritmo atual.
- **Projeção Futura**: Tempo estimado considerando a evolução do patrimônio.

### Estratégia 2: Doação à Vista
Transmissão imediata dos bens em vida com recolhimento antecipado do ITCMD:
$$\text{Custo Total} = \text{Valor do Bem} + \text{ITCMD Incidente}$$

### Estratégia 3: Previdência Privada & Isenção de IOF
Aplicações de até **R$ 600.000,00 por ano** em previdência privada possuem isenção de IOF. Para valores superiores, incide a alíquota de 5% sobre o excedente:

$$\text{IOF Excedente} = \begin{cases} 0 & \text{se } V \le 600.000 \\ (V - 600.000) \times 0.05 & \text{se } V > 600.000 \end{cases}$$

- **⚠️ Alerta Comportamental**: Incluído para alertar que os beneficiários indicados no plano de previdência podem resgatar o valor diretamente e utilizá-lo para cobrir os custos de inventário dos demais bens, gerando assimetria entre os herdeiros e diminuição do patrimônio líquido recebido.

### Estratégia 4: Seguro Sucessão (Liquidez Imediata)
Calcula a liquidez necessária para cobrir 100% do prejuízo tributário via apólice de seguro de vida resgatável/permanente:
- **Capital Segurado**: Valor total do prejuízo tributário.
- **Prazo de Amortização**: 120 parcelas mensais.
- **Economia Estimada**: Diferença entre o custo total do inventário via recursos próprios versus o custo efetivo das parcelas do seguro.

---

## 6. Motor de Relatórios e Exportação em PDF

O relatório é montado dinamicamente dentro de `<div id="area-relatorio" class="pdf-container">` com 5 páginas rígidas:

- **Página 1 (Capa & Resumo Executivo)**: Apresentação com branding Pace Capital, cards com métricas principais (Patrimônio Total, Prejuízo Atual, Patrimônio Projetado, Prejuízo Projetado) e caixa de Narrativa com Análise Estratégica.
- **Página 2 (Evolução & Família)**: Gráfico de linha da evolução patrimonial e resumo da estrutura familiar e regime de casamento.
- **Página 3 (Detalhamento da Sucessão)**: Tabela com custos discriminados (ITCMD, honorários, cartório e meação).
- **Página 4 (Classes & Alocação de Ativos)**: Grid de 4 gráficos em canvas (Visão Geral, Liquidez/Aplicações, Imóveis, Participações Societárias).
- **Página 5 (Estratégias de Preservação Patrimonial)**: Apresentação comparativa das 4 estratégias de liquidez, incluindo a caixa de **Alerta Comportamental** no bloco de Previdência Privada.

---

## 7. Segurança, Autenticação e RLS

1. **Tokens JWT Supabase**: Gerenciados pelo SDK no cliente com renovação automática de refresh token.
2. **Guards de Navegação**: Executados pela função `protegerPagina()` em `script/auth.js`.
3. **Row Level Security (RLS)**: Impede que um assessor visualize ou altere registros de outro usuário no banco de dados através da regra `auth.uid() = user_id`.
