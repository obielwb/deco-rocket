# Deco Research 🔎

> Ache seu próximo produto **com dados**, não com achismo.

**Deco Research** é um sistema agêntico de pesquisa de produto para e-commerce, construído como um
**MCP App nativo da [Deco](https://www.decocms.com/)**. A partir de um nicho (ex.: _"garrafa térmica"_),
ele minera tendências de mercado em múltiplas fontes, cruza com o **catálogo real da loja (VTEX)** para
achar _whitespace_, pontua as oportunidades com um score transparente e gera **conceito de produto,
custo de fornecedor, imagem hero e copy** — entregando um **Relatório de Oportunidades de Produto**
acionável.

Feito para o hackathon **Agents for Commerce** (trilha _Search & Discovery / Catalog & Content_).

---

## O problema

Decidir _qual produto novo lançar_ é uma das decisões de maior alavancagem — e maior fricção — de uma
operação de e-commerce. Hoje é manual: alguém garimpa Google Trends, espia concorrente, chuta preço,
pede imagem pro designer e negocia com fornecedor. São semanas de trabalho, sem dado concreto e com viés.
É exatamente o tipo de tarefa repetitiva de alto valor que um agente faz melhor.

## A solução — 3 pilares, 1 relatório

1. **Trend Intelligence** — Google Trends (interesse + _breakout queries_), Google Shopping (faixa de preço /
   concorrência / reviews) e volume de busca (DataForSEO). Cruza com o **catálogo VTEX** da loja para achar
   demanda que a loja **ainda não captura** (_whitespace_).
2. **Concept & Sourcing** — score de oportunidade transparente → **conceito de produto** concreto (specs, público,
   preço-alvo) via Claude → **custo de fornecedor** e margem estimada + **rascunho de RFQ** (e-mail de cotação).
3. **Creative** — **imagem hero** do produto (Gemini _nano-banana_ / OpenAI gpt-image) + **copy** (título, SEO,
   descrição de PDP, variações de anúncio).

Cada pilar é uma ou mais **MCP tools** reutilizáveis; a tool `RESEARCH_RUN` orquestra tudo ponta-a-ponta e
renderiza o relatório numa **UI interativa (MCP App)**.

---

## Arquitetura

Construído sobre o template oficial [`decocms/mcp-app`](https://github.com/decocms/mcp-app):

- **`api/`** — MCP server (`@decocms/runtime`) rodando em Bun / qualquer runtime Web Standard.
- **`web/`** — UI React 19 + Tailwind v4 (MCP App) que renderiza o resultado de `RESEARCH_RUN`.
- **Config/secrets** — declarados em `StateSchema` (`api/types/env.ts`); cada instalação preenche no
  connection do deco Studio. Em dev, caem via `.env` (fallback em `getConfig`).
- **Degradação graciosa** — cada tool funciona isolada e sem depender de todas as credenciais; o relatório
  sempre é válido e lista as fontes indisponíveis.

```
api/
  app.ts              # withRuntime() — registra tools, prompts, resource
  config.ts           # getConfig(): state do Studio + fallback process.env
  clients/            # SerpApi · DataForSEO · Anthropic · imagem · VTEX · Mercado Livre
  lib/                # types (zod) + scoring puro (testável)
  tools/              # as 11 MCP tools + RESEARCH_RUN (orquestrador)
  resources/report.ts # serve a UI do relatório como MCP App
web/tools/report/     # a UI do Relatório de Oportunidades
scripts/research.ts   # runner CLI para rodar tudo pelo terminal
tests/                # scoring (unit) + pipeline (E2E com degradação real)
```

### MCP Tools

| Tool | Pilar | O que faz |
|------|-------|-----------|
| `RESEARCH_RUN` | orquestrador | pesquisa ponta-a-ponta → Relatório de Oportunidades |
| `TREND_GOOGLE_FETCH` | 1 | Google Trends: interesse no tempo + breakout queries |
| `KEYWORD_VOLUME` | 1 | volume de busca / competição / CPC (DataForSEO) |
| `SHOPPING_SCAN` | 1 | Google Shopping: preço min/mediana/max, concorrência, reviews |
| `SOCIAL_VIRAL_SCAN` | 1 | sinal de demanda emergente (breakout) |
| `CATALOG_GAP_ANALYSIS` | 1 | whitespace contra o catálogo VTEX da loja |
| `OPPORTUNITY_SCORE` | 2 | score 0-100 com breakdown auditável |
| `PRODUCT_CONCEPT_GEN` | 2 | conceito concreto de produto (Claude) |
| `SUPPLIER_SOURCE` | 2 | custo/fornecedor (Mercado Livre + fallback) + rascunho de RFQ |
| `RFQ_SEND` | 2 | envia RFQ ao fornecedor por e-mail (Resend) e rastreia a thread |
| `RFQ_PARSE` | 2 | extrai cotação estruturada da resposta (Claude + fallback heurístico) |
| `RFQ_LIST` | 2 | lista threads de RFQ e cotações recebidas |
| `COPY_GEN` | 3 | título, SEO, PDP e copies de anúncio |
| `IMAGE_CONCEPT_GEN` | 3 | imagem hero do produto |

### Score de oportunidade (transparente)

`score = 0.30·demanda + 0.25·momentum + 0.20·(1/concorrência) + 0.15·margem + 0.10·fit`

Pesos explícitos em `api/lib/scoring.ts` — cada oportunidade traz o breakdown por dimensão e um _rationale_.

---

## Rodando

Requisitos: [Bun](https://bun.sh).

```bash
bun install
cp .env.example .env          # preencha as chaves que você tiver (todas opcionais)

# 1) Rodar a pesquisa pelo terminal (real, ponta-a-ponta)
bun run research "garrafa térmica"
bun run research "kit café especial" --top 3 --candidates 8
#   → imprime o ranking e salva o relatório completo em dist/report.json

# 2) Servir como MCP App e conectar ao deco Studio
bun run dev                   # api (3001) + build da UI
bun start                     # túnel → conecte https://<id>.deco.host/api/mcp no Studio
```

No Studio, instale o app, preencha as credenciais no _connection_ e chame a tool **`RESEARCH_RUN`** (ou o
prompt `research_product`) — o relatório aparece na UI interativa.

### Credenciais (todas opcionais)

| Provider | Variáveis | Usado por |
|----------|-----------|-----------|
| SerpApi | `SERPAPI_KEY` | Google Trends + Shopping |
| DataForSEO | `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` | volume de busca |
| Anthropic | `ANTHROPIC_API_KEY` (`ANTHROPIC_MODEL`) | conceito + copy |
| Imagem | `GEMINI_API_KEY` **ou** `OPENAI_API_KEY` (`IMAGE_PROVIDER`) | imagem hero |
| VTEX | `VTEX_ACCOUNT` / `VTEX_APP_KEY` / `VTEX_APP_TOKEN` | catálogo / whitespace |
| Resend | `RESEND_API_KEY` / `RFQ_FROM_EMAIL` (`RFQ_WEBHOOK_SECRET`) | RFQ Agent (envio + inbound) |

---

## Testes

```bash
bun test          # scoring (unit) + pipeline E2E (degradação graciosa; integração real se houver SERPAPI_KEY)
bun run check     # tipos (tsc)
bun run ci:check  # lint + format (Biome)
```

O teste de pipeline roda o `RESEARCH_RUN` de verdade e valida que o **Report sempre respeita o schema**,
mesmo sem nenhuma credencial. Com `SERPAPI_KEY` no ambiente, o teste de integração exige ≥1 oportunidade real.

---

## Conector de fornecedores — RFQ Agent (implementado)

Fecha o loop "achei o produto → **cotei com fornecedor de verdade**". A Deco não tem conector nativo de
_sourcing_, então implementamos um **RFQ Agent** próprio:

1. **`RFQ_SEND`** — compõe um pedido de cotação estruturado (`[RFQ-<id>]` no assunto p/ correlação) e **envia
   por e-mail via [Resend](https://resend.com)**; rastreia a thread. Use `dryRun:true` para compor sem enviar.
2. **Webhook de inbound** (`POST /webhooks/rfq-inbound`) — recebe a resposta do fornecedor, casa pelo `[RFQ-<id>]`
   (ou plus-address `rfq+<id>@…`), extrai a **cotação estruturada** (preço por faixa, MOQ, prazo, pagamento) e
   anexa à thread. Autenticado por `RFQ_WEBHOOK_SECRET`.
3. **`RFQ_PARSE` / `RFQ_LIST`** — parse manual de uma resposta colada e listagem das cotações recebidas.

O parse usa **Claude** quando `ANTHROPIC_API_KEY` está setado e **cai para um parser heurístico (regex)** caso
contrário — então webhook e testes funcionam offline. Custo/margem continuam vindo do Mercado Livre (com
fallback para Google Shopping) no `SUPPLIER_SOURCE`.

**Setup do Resend:** verifique um domínio no Resend, defina `RFQ_FROM_EMAIL` (remetente verificado) e
`RESEND_API_KEY`. Para inbound automático, configure o **Resend Inbound** (MX + webhook) apontando para
`https://<seu-deploy>/webhooks/rfq-inbound?secret=<RFQ_WEBHOOK_SECRET>`. Sem inbound configurado, use `RFQ_PARSE`
colando a resposta.

> Persistência: as threads ficam num store **em memória** (`api/lib/rfq-store.ts`) — ótimo p/ demo e deploy
> single-instance. O módulo expõe o _seam_ (`save/get/list/addQuote`) para trocar por Cloudflare KV/D1 ou a Deco DB.

### Outros caminhos de fornecedor (roadmap)
- **VTEX Sellers/Marketplace API** — cotação dos fornecedores já cadastrados na loja.
- **1688 / Alibaba API** — sourcing de fornecedor novo com MOQ e custo.
- **MCP Mesh Bridge** ([`decocms/bridge`](https://github.com/decocms/bridge)) — opera portais de fornecedor
  **sem API** (extensão Chrome vira conector do agente): navega e extrai cotação/MOQ.

## Roadmap

- Persistência durável de runs/relatórios/RFQs (Cloudflare KV/D1 ou Deco DB) — histórico e comparação temporal.
- TikTok Creative Center / Meta Ad Library nativos no `SOCIAL_VIRAL_SCAN`.
- Deploy Cloudflare Workers (entrypoint `api/main.cloudflare.ts` + `wrangler.toml`).
- Push automático do produto aprovado para o catálogo VTEX (draft de SKU).

---

Construído com Claude Code + Deco. Licença MIT.
