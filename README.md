# Deco Research

> Ache seu proximo produto com dados, nao com achismo.

**Deco Research** e um sistema agentico de pesquisa de produto para e-commerce, construido como um
**MCP App nativo da [Deco](https://www.decocms.com/)**. A partir de um nicho, ele minera sinais de mercado,
cruza com o catalogo real da loja para achar whitespace, pontua oportunidades com um score transparente e gera
conceito, custo estimado, imagem hero e copy para o produto.

Feito para o hackathon **Agents for Commerce**.

---

## O problema

Decidir qual produto novo lancar ainda costuma ser um processo manual: alguem olha tendencias, compara
concorrentes, estima preco, pede criativo e tenta descobrir fornecedor. Isso toma tempo, espalha contexto
em varias ferramentas e costuma acontecer com pouca rastreabilidade.

## A solucao

O projeto junta tres pilares em um unico report:

1. **Trend intelligence**: sinais de demanda, preco, concorrencia e lacunas no catalogo.
2. **Concept and sourcing**: score auditavel, conceito de produto e custo estimado de fornecedor.
3. **Creative**: imagem hero e copy inicial para o produto.

A tool `RESEARCH_RUN` orquestra o fluxo ponta a ponta e renderiza o resultado em uma UI interativa.

---

## Arquitetura

Construido sobre o template oficial [`decocms/mcp-app`](https://github.com/decocms/mcp-app):

- `api/`: MCP server (`@decocms/runtime`) rodando em Bun.
- `web/`: UI React 19 + Tailwind v4 que renderiza o report.
- `scripts/research.ts`: runner CLI para executar a pesquisa pelo terminal.
- `tests/`: testes de score e pipeline.

```text
api/
  app.ts              # registra tools, prompts e resource
  config.ts           # state do Studio + fallback process.env
  clients/            # integracoes externas
  lib/                # tipos e logica de scoring
  tools/              # MCP tools e RESEARCH_RUN
  resources/report.ts # serve a UI do report como MCP App
web/tools/report/     # UI do relatorio
scripts/research.ts   # runner CLI
tests/                # testes unitarios e de pipeline
```

### MCP tools

| Tool | Pilar | O que faz |
|---|---|---|
| `RESEARCH_RUN` | orquestrador | pesquisa ponta a ponta e gera o report |
| `TREND_GOOGLE_FETCH` | 1 | interesse no tempo e breakout queries |
| `KEYWORD_VOLUME` | 1 | volume de busca, competicao e CPC |
| `SHOPPING_SCAN` | 1 | faixa de preco, concorrencia e reviews |
| `SOCIAL_VIRAL_SCAN` | 1 | sinal de demanda emergente |
| `CATALOG_GAP_ANALYSIS` | 1 | whitespace contra o catalogo da loja |
| `OPPORTUNITY_SCORE` | 2 | score 0-100 com breakdown auditavel |
| `PRODUCT_CONCEPT_GEN` | 2 | conceito concreto de produto |
| `SUPPLIER_SOURCE` | 2 | custo estimado e rascunho de RFQ |
| `RFQ_SEND` | 2 | envia RFQ por email |
| `RFQ_PARSE` | 2 | extrai cotacao estruturada da resposta |
| `RFQ_LIST` | 2 | lista threads de RFQ e cotacoes |
| `COPY_GEN` | 3 | titulo, SEO, PDP e copy de anuncio |
| `IMAGE_CONCEPT_GEN` | 3 | imagem hero do produto |

### Score de oportunidade

`score = 0.30*demand + 0.25*momentum + 0.20*(1/competition) + 0.15*margin + 0.10*fit`

Os pesos ficam explicitos em `api/lib/scoring.ts`, com breakdown por dimensao no resultado final.

---

## Rodando

Requisitos: [Bun](https://bun.sh).

```bash
bun install
cp .env.example .env
```

### Fluxo 1: rodar a pesquisa pelo terminal

```bash
bun run research "garrafa termica"
bun run research "kit cafe especial" --top 3 --candidates 8
```

Isso imprime o ranking no terminal e salva o report completo em `dist/report.json`.

### Fluxo 2: subir a API local usada pela interface Rocket

```bash
bun run dev:api
```

Com a API no ar, os endpoints locais ficam disponiveis em `http://127.0.0.1:3001/api/research/*`.
Os reports persistidos ficam em `dist/reports/` e os produtos lancados ficam em
`dist/launched-products.json`.

### Fluxo 3: rodar junto com o storefront demo

1. Neste repo, suba a API:

   ```bash
   bun run dev:api
   ```

2. No repo `demo-storefront-reference`, instale as dependencias e gere o build:

   ```bash
   npm install
   npm run build
   ```

3. Ainda no repo do storefront, publique o preview local:

   ```bash
   npx vite preview --host 127.0.0.1 --port 4173
   ```

4. Abra `http://127.0.0.1:4173/rocket`.

Se `DECO_RESEARCH_URL` nao estiver definido no storefront, a UI usa `http://127.0.0.1:3001`
como backend padrao.

### Fluxo 4: app MCP e tunnel para o Studio

```bash
bun run dev
bun start
```

`bun run dev` sobe a API local e recompila a UI. `bun start` abre o tunnel para conectar
`https://<id>.deco.host/api/mcp` no Studio.

No Studio, instale o app, preencha as credenciais no _connection_ e chame a tool
**`RESEARCH_RUN`** ou o prompt `research_product` para abrir o report na UI interativa.

### Credenciais

Todas as credenciais sao opcionais. O projeto degrada com graca quando alguma fonte nao esta disponivel.

| Provider | Variaveis | Usado por |
|---|---|---|
| SerpApi | `SERPAPI_KEY` | Google Trends e Shopping |
| DataForSEO | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | volume de busca |
| Anthropic | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | conceito e copy |
| Imagem | `GEMINI_API_KEY` ou `OPENAI_API_KEY` | criativos com referencias visuais |
| VTEX | `VTEX_ACCOUNT`, `VTEX_APP_KEY`, `VTEX_APP_TOKEN` | catalogo e whitespace |
| Resend | `RESEND_API_KEY`, `RFQ_FROM_EMAIL`, `RFQ_WEBHOOK_SECRET` | RFQ Agent |

---

## Testes

```bash
bun test
bun run check
bun run ci:check
```

O teste de pipeline roda `RESEARCH_RUN` de verdade e valida que o report sempre respeita o schema,
mesmo sem credenciais. Com `SERPAPI_KEY` no ambiente, o teste de integracao exige ao menos uma
oportunidade real.

---

## Conector de fornecedores - RFQ Agent

O RFQ Agent fecha o loop entre achar o produto e cotar com fornecedor de verdade:

1. `RFQ_SEND`: compoe um pedido de cotacao estruturado e envia por email via Resend.
2. `POST /webhooks/rfq-inbound`: recebe a resposta do fornecedor, correlaciona a thread e extrai a cotacao.
3. `RFQ_PARSE` e `RFQ_LIST`: parse manual de respostas coladas e listagem das cotacoes recebidas.

O parse usa Claude quando `ANTHROPIC_API_KEY` esta configurado e cai para um parser heuristico quando nao
esta, entao o webhook e os testes continuam funcionando offline.

Persistencia atual:

- threads de RFQ ficam em memoria em `api/lib/rfq-store.ts`
- reports ficam em `dist/reports/`
- produtos lancados ficam em `dist/launched-products.json`

### Outros caminhos de fornecedor

- VTEX Sellers or Marketplace API
- 1688 ou Alibaba API
- [`decocms/bridge`](https://github.com/decocms/bridge) para portais sem API

## Roadmap

- Persistencia duravel de runs, reports e RFQs
- TikTok Creative Center e Meta Ad Library no `SOCIAL_VIRAL_SCAN`
- Deploy em Cloudflare Workers
- Push automatico do produto aprovado para o catalogo VTEX

---

Construido com Claude Code + Deco. Licenca MIT.
