import type { StoredReport } from "../../platform/rocket";

const IMAGE_HERO =
  "https://decoims.com/demo-storefront/2026/07/dcd77bbd-4969-4186-aaaa-d8bc9e4b84c1-chatgpt-image-jul-27-2026-06_54_44-pm.png";
const IMAGE_SOCIAL =
  "https://decoims.com/demo-storefront/2026/07/543e04d2-011d-4cc2-8875-46a1a08bef3d-accessories.png";
const IMAGE_BANNER =
  "https://decoims.com/demo-storefront/2026/07/161c9ecb-ceea-4562-bc55-01a2967dc4f2-banner4.png";

export const STORE_COLLECTIONS = [
  "Shirts",
  "Hoodies & Sweatshirts",
  "Jackets & Outerwear",
  "Bottoms",
  "Accessories",
  "Stickers",
];

export const DEMO_REPORTS: StoredReport[] = [
  {
    id: "auto-20260808-tech-accessories",
    mode: "automatic",
    status: "ready",
    report: {
      seed: "acessórios tech vestíveis",
      generatedAt: "2026-08-08T12:40:00.000Z",
      geo: "BR",
      store: "Demo Storefront",
      summary:
        "A busca por acessórios funcionais com estética street cresceu rápido entre consumidores de 16 a 24 anos. A melhor entrada é uma shoulder bag modular: aproveita a coleção Accessories, tem boa margem projetada e demanda conteúdo social nativo.",
      degraded: [],
      config: {
        profile: "Teen / social media",
        audience: "16 a 24 anos, urbano, mobile-first",
        sources: ["google_trends", "google_shopping", "keyword_volume", "social_viral", "catalog"],
        collections: ["Accessories", "Jackets & Outerwear"],
        creativeTypes: ["product_hero", "social_ad", "collection_banner"],
        storeStyle: "minimalista, urbano, preto e off-white, luz suave e fundo de concreto",
      },
      briefs: [
        {
          opportunity: {
            keyword: "shoulder bag modular",
            score: 86,
            rationale:
              "8,2 mil buscas/mês · demanda subindo 41% · baixa saturação no catálogo · margem potencial alta",
            breakdown: { demand: 91, momentum: 88, competition: 74, margin: 82, fit: 94 },
            trend: { momentum: 41, isBreakout: true },
            volume: { searchVolume: 8200 },
            gap: { inCatalog: false, catalogMatches: 0 },
          },
          concept: {
            name: "Shift Modular Bag",
            tagline: "Mude o formato. Mantenha o ritmo.",
            positioning:
              "Bolsa compacta modular para a rotina urbana, com módulos removíveis e acabamento resistente à água.",
            targetAudience:
              "Jovens de 16 a 24 anos que transitam entre estudo, shows e rolês urbanos.",
            keySpecs: [
              "Nylon reciclado 600D",
              "2 módulos removíveis",
              "Alça refletiva ajustável",
              "Bolso seguro para celular",
              "Resistente à água",
            ],
            differentiators: ["modularidade real", "estética da coleção atual", "produção simples"],
            suggestedPrice: 229,
          },
          copy: {
            productTitle: "Shift Modular Bag — Shoulder Bag 3 em 1",
            seoTitle: "Shoulder Bag Modular Shift | Demo Storefront",
            metaDescription:
              "Uma shoulder bag modular, resistente à água e pronta para acompanhar todos os seus modos.",
            pdpDescription:
              "A Shift muda com o seu dia. Use compacta, acople o bolso extra ou reorganize os módulos para levar só o essencial. Construída em nylon reciclado e resistente à água.",
            adCopies: [
              "Uma bag. Três jeitos de usar.",
              "Seu corre muda. A Shift também.",
              "Leve só o que importa — do seu jeito.",
            ],
          },
          sourcing: {
            estimatedUnitCost: 72,
            suggestedRetailPrice: 229,
            estimatedMarginPct: 69,
            rfqDraft:
              "Solicitamos cotação para shoulder bag modular em nylon 600D, com dois módulos removíveis, nas faixas de 100, 500 e 1.000 unidades.",
          },
          imageUrl: IMAGE_HERO,
          creatives: [
            {
              type: "product_hero",
              imageUrl: IMAGE_HERO,
              prompt: "Hero de produto no estilo da loja",
            },
            {
              type: "social_ad",
              imageUrl: IMAGE_SOCIAL,
              prompt: "Criativo social 4:5 no estilo da loja",
            },
            {
              type: "collection_banner",
              imageUrl: IMAGE_BANNER,
              prompt: "Banner editorial 16:9 no estilo da loja",
            },
          ],
          sourcePreviews: [
            {
              source: "google_trends",
              label: "Google Trends",
              provider: "SerpApi",
              status: "collected",
              summary:
                "Interesse sustentado nas últimas semanas, com aceleração em termos ligados a bolsas modulares.",
              metrics: [
                { label: "Interesse médio", value: "74/100" },
                { label: "Momentum", value: "+41%" },
                { label: "Janela", value: "12 semanas" },
              ],
              items: [
                { title: "shoulder bag modular", subtitle: "Breakout" },
                { title: "bolsa techwear", subtitle: "+180%" },
                { title: "bolsa transversal 3 em 1", subtitle: "+90%" },
              ],
            },
            {
              source: "social_viral",
              label: "TikTok Shop radar (estimado)",
              provider: "Preview social",
              status: "estimated",
              summary:
                "Preview de formatos e hooks com potencial para vídeos curtos e demonstrações de produto.",
              metrics: [
                { label: "Sinal viral", value: "Breakout" },
                { label: "Força", value: "91/100" },
                { label: "Hook", value: "3 usos" },
              ],
              items: [
                {
                  title: "Uma bolsa, três configurações",
                  subtitle: "Demonstração antes/depois · formato sugerido",
                  image: IMAGE_SOCIAL,
                },
                {
                  title: "O que cabe na minha Shift?",
                  subtitle: "UGC de rotina · formato sugerido",
                  image: IMAGE_HERO,
                },
                {
                  title: "Do campus ao show em 8 segundos",
                  subtitle: "Transição rápida · formato sugerido",
                  image: IMAGE_BANNER,
                },
              ],
              note: "Estimativa para compreensão da fonte. Este ambiente ainda não consulta dados nativos do TikTok Shop.",
            },
            {
              source: "google_shopping",
              label: "Google Shopping",
              provider: "SerpApi",
              status: "collected",
              summary: "Amostra de concorrentes usada para posicionar preço e diferenciação.",
              metrics: [
                { label: "Ofertas", value: "18" },
                { label: "Preço mediano", value: "R$ 219" },
                { label: "Reviews", value: "2.840" },
              ],
              items: [
                {
                  title: "Shoulder Bag Urbana Modular",
                  subtitle: "R$ 199 · marketplace nacional",
                  image: IMAGE_HERO,
                },
                {
                  title: "Tech Crossbody Utility",
                  subtitle: "R$ 249 · loja especializada",
                  image: IMAGE_SOCIAL,
                },
              ],
            },
            {
              source: "keyword_volume",
              label: "Volume de busca",
              provider: "DataForSEO",
              status: "collected",
              summary: "Demanda mensal e competição estimadas para o termo principal.",
              metrics: [
                { label: "Buscas/mês", value: "8.200" },
                { label: "Competição", value: "37%" },
                { label: "CPC", value: "R$ 1,84" },
              ],
              items: [],
            },
            {
              source: "catalog",
              label: "Catálogo da loja",
              provider: "Store catalog",
              status: "collected",
              summary: "Whitespace confirmado: não existe uma shoulder bag modular equivalente.",
              metrics: [
                { label: "Resultado", value: "Gap" },
                { label: "Matches", value: "0" },
                { label: "Fit", value: "94/100" },
              ],
              items: [{ title: "Accessories", subtitle: "Coleção recomendada" }],
            },
          ],
        },
      ],
    },
  },
  {
    id: "auto-20260806-lightweight-layers",
    mode: "automatic",
    status: "ready",
    report: {
      seed: "camadas leves meia-estação",
      generatedAt: "2026-08-06T15:10:00.000Z",
      geo: "BR",
      store: "Demo Storefront",
      summary:
        "Há demanda crescente por peças leves e utilitárias para transição de clima. O fit com Jackets & Outerwear é alto, mas a concorrência já está reagindo; a janela estimada é de quatro a seis semanas.",
      degraded: ["catalog"],
      config: {
        profile: "Fashion radar",
        audience: "18 a 34 anos, moda casual urbana",
        sources: ["google_trends", "google_shopping", "keyword_volume", "social_viral"],
        collections: ["Jackets & Outerwear", "Hoodies & Sweatshirts"],
        creativeTypes: ["product_hero", "collection_banner"],
        storeStyle: "editorial limpo, tons neutros e silhuetas amplas",
      },
      briefs: [
        {
          opportunity: {
            keyword: "overshirt leve unissex",
            score: 72,
            rationale: "4,9 mil buscas/mês · demanda subindo 19% · excelente aderência à coleção",
            breakdown: { demand: 73, momentum: 70, competition: 58, margin: 71, fit: 91 },
            trend: { momentum: 19, isBreakout: false },
            volume: { searchVolume: 4900 },
            gap: { inCatalog: true, catalogMatches: 3, sampleMatch: "Jackets & Outerwear" },
          },
          concept: {
            name: "Drift Overshirt",
            tagline: "A camada certa para qualquer virada.",
            positioning: "Overshirt unissex leve, ampla e versátil para meia-estação.",
            targetAudience: "Adultos jovens que preferem guarda-roupa compacto e sobreposições.",
            keySpecs: ["Sarja leve", "Modelagem ampla", "Bolsos utilitários", "Botões foscos"],
            differentiators: ["peso reduzido", "grade unissex"],
            suggestedPrice: 289,
          },
          copy: null,
          sourcing: {
            estimatedUnitCost: 104,
            suggestedRetailPrice: 289,
            estimatedMarginPct: 64,
          },
          imageUrl: IMAGE_BANNER,
          creatives: [
            { type: "product_hero", imageUrl: IMAGE_BANNER, prompt: "Hero editorial neutro" },
          ],
        },
      ],
    },
  },
];
