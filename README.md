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

### Requisitos

- [Bun](https://bun.sh) para a API MCP e o runner CLI
- Node.js 20+ e `npm` para o storefront em `storefront/`
- comando `deco` disponivel no shell se voce quiser abrir o tunnel do Studio com `bun start`

Setup inicial:

```bash
bun install
cp .env.example .env
```

Todas as integracoes externas sao opcionais. Mesmo sem chaves o projeto sobe e a pipeline roda, mas o
report marca as fontes indisponiveis em `degraded`.

### Fluxo 1: rodar a pesquisa pelo terminal

```bash
bun run research "garrafa termica"
bun run research "kit cafe especial" --top 3 --candidates 8
```

Esse fluxo imprime o ranking no terminal e salva o report completo em `dist/report.json`.

### Fluxo 2: subir so a Research API local

```bash
bun run dev:api
```

Com a API no ar:

- health check: `http://127.0.0.1:3001/api/research/health`
- jobs, reports e launches: `http://127.0.0.1:3001/api/research/*`
- reports persistidos: `dist/reports/`
- jobs persistidos: `dist/jobs/`
- produtos lancados: `dist/launched-products.json`

### Fluxo 3: rodar a experiencia Rocket ponta a ponta

O storefront vive em `storefront/` dentro deste repo e consome a API local acima.

1. Na raiz deste repo, suba a API:

   ```bash
   bun run dev:api
   ```

2. Em outro terminal, entre em `storefront/`, instale as dependencias e gere o build:

   ```bash
   cd storefront
   npm install
   npm run build
   ```

3. Ainda em `storefront/`, publique o preview local:

   ```bash
   npx vite preview --host 127.0.0.1 --port 4173
   ```

4. Abra `http://127.0.0.1:4173/rocket`.

5. Entre com o login demo do Rocket:

   ```text
   e-mail: lojista@rocket.local
   senha:  rocket2026
   ```

Observacoes:

- se `DECO_RESEARCH_URL` nao estiver definido no storefront, a UI usa `http://127.0.0.1:3001`
  como backend padrao
- a autenticacao do Rocket e local/demo; os sinais de catalogo e loja dependem das credenciais VTEX
- para smoke test do fluxo inteiro, o caminho mais estavel hoje e `npm run build` + `vite preview`

### Fluxo 4: rodar como MCP App no Studio

```bash
bun run dev
bun start
```

`bun run dev` sobe a API local e recompila a UI. `bun start` chama `deco link -p 3001 -- bun run dev`
e abre o tunnel para conectar `https://<id>.deco.host/api/mcp` no Studio.

No Studio, instale o app, preencha as credenciais no _connection_ e chame a tool
**`RESEARCH_RUN`** ou o prompt `research_product` para abrir o report na UI interativa.

### Variaveis de ambiente

O arquivo `.env.example` ja lista as variaveis esperadas pelo estado atual do projeto:

| Area | Variaveis | Usado por |
|---|---|---|
| Trends e Shopping | `SERPAPI_KEY` | Google Trends e Google Shopping |
| Keyword volume | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | volume, CPC e competicao |
| LLM de texto | `LLM_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | conceito, copy, resumo e parse de RFQ |
| Imagens | `IMAGE_PROVIDER`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL` | criativos e imagem hero |
| Assets locais | `RESEARCH_PUBLIC_URL` | URL publica usada pelos reports para carregar imagens persistidas |
| Catalogo VTEX | `VTEX_ACCOUNT`, `VTEX_APP_KEY`, `VTEX_APP_TOKEN`, `VTEX_ENVIRONMENT` | whitespace e enriquecimento com catalogo |
| RFQ Agent | `RESEND_API_KEY`, `RFQ_FROM_EMAIL`, `RFQ_FROM_NAME`, `RFQ_INBOUND_DOMAIN`, `RFQ_WEBHOOK_SECRET` | envio e correlacao de cotacoes |
| Localizacao | `GEO`, `LANG` | defaults da pesquisa e da apresentacao |

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
