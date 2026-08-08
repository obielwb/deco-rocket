import type { Opportunity, ResearchSource, SourcePreview } from "./types.ts";

const brl = (value: number | null | undefined) =>
	value == null
		? "Sem dado"
		: new Intl.NumberFormat("pt-BR", {
				style: "currency",
				currency: "BRL",
				maximumFractionDigits: 0,
			}).format(value);

/** Build report-ready evidence cards without inventing native provider data. */
export function buildSourcePreviews(
	opportunity: Opportunity,
	sources: ResearchSource[],
): SourcePreview[] {
	const enabled = new Set(sources);
	const previews: SourcePreview[] = [];

	if (enabled.has("google_trends")) {
		const trend = opportunity.trend;
		previews.push({
			source: "google_trends",
			label: "Google Trends",
			provider: "SerpApi",
			status: trend ? "collected" : "unavailable",
			summary: trend
				? "Interesse ao longo do tempo e consultas que estão acelerando."
				: "A fonte estava habilitada, mas não retornou uma série utilizável.",
			metrics: trend
				? [
						{ label: "Interesse médio", value: `${trend.avgInterest}/100` },
						{
							label: "Momentum",
							value: `${trend.momentum >= 0 ? "+" : ""}${trend.momentum}%`,
						},
						{ label: "Janela", value: `${trend.timeline.length} pontos` },
					]
				: [],
			items: (trend?.risingQueries ?? []).slice(0, 4).map((query) => ({
				title: query.query,
				subtitle: `Crescimento ${query.growth}`,
			})),
		});
	}

	if (enabled.has("social_viral")) {
		const trend = opportunity.trend;
		const visualOffers = (opportunity.market?.offers ?? [])
			.filter((offer) => offer.thumbnail)
			.slice(0, 3);
		previews.push({
			source: "social_viral",
			label: "TikTok Shop radar (estimado)",
			provider: "Preview social",
			status: trend ? "estimated" : "unavailable",
			summary: trend
				? "Preview de produtos, termos e hooks com potencial social, estimado a partir dos breakouts e do mercado."
				: "Não houve sinal suficiente para montar o preview social.",
			metrics: trend
				? [
						{
							label: "Sinal viral",
							value: trend.isBreakout ? "Breakout" : "Em alta",
						},
						{
							label: "Força",
							value: `${Math.min(100, Math.max(0, 50 + trend.momentum))}/100`,
						},
					]
				: [],
			items: visualOffers.length
				? visualOffers.map((offer) => ({
						title: offer.title,
						subtitle: `${brl(offer.price)} · inspiração de formato`,
						image: offer.thumbnail,
						link: offer.link,
					}))
				: (trend?.risingQueries ?? []).slice(0, 3).map((query) => ({
						title: `#${query.query.replace(/\s+/g, "")}`,
						subtitle: `Hook sugerido · ${query.growth}`,
					})),
			note: "Estimativa para compreensão da fonte. Este ambiente ainda não consulta dados nativos do TikTok Shop.",
		});
	}

	if (enabled.has("google_shopping")) {
		const market = opportunity.market;
		previews.push({
			source: "google_shopping",
			label: "Google Shopping",
			provider: "SerpApi",
			status: market ? "collected" : "unavailable",
			summary: market
				? "Amostra dos produtos concorrentes usada para preço e saturação."
				: "A fonte não retornou ofertas para esta oportunidade.",
			metrics: market
				? [
						{ label: "Ofertas", value: `${market.competitorCount}` },
						{ label: "Preço mediano", value: brl(market.priceMedian) },
						{
							label: "Reviews",
							value: market.totalReviews.toLocaleString("pt-BR"),
						},
					]
				: [],
			items: (market?.offers ?? []).slice(0, 4).map((offer) => ({
				title: offer.title,
				subtitle: `${brl(offer.price)}${offer.source ? ` · ${offer.source}` : ""}`,
				image: offer.thumbnail,
				link: offer.link,
			})),
		});
	}

	if (enabled.has("keyword_volume")) {
		const volume = opportunity.volume;
		previews.push({
			source: "keyword_volume",
			label: "Volume de busca",
			provider: "DataForSEO",
			status: volume ? "collected" : "unavailable",
			summary: volume
				? "Demanda mensal, custo de mídia e competição para a palavra-chave."
				: "Não foi possível obter volume para esta palavra-chave.",
			metrics: volume
				? [
						{
							label: "Buscas/mês",
							value: volume.searchVolume?.toLocaleString("pt-BR") ?? "Sem dado",
						},
						{
							label: "Competição",
							value:
								volume.competition == null
									? "Sem dado"
									: `${Math.round(volume.competition * 100)}%`,
						},
						{ label: "CPC", value: brl(volume.cpc) },
					]
				: [],
			items: [],
		});
	}

	if (enabled.has("catalog")) {
		const gap = opportunity.gap;
		previews.push({
			source: "catalog",
			label: "Catálogo da loja",
			provider: "Store catalog",
			status: gap ? "collected" : "unavailable",
			summary: gap
				? gap.inCatalog
					? "Há produtos próximos no catálogo; o lançamento precisa se diferenciar."
					: "Whitespace confirmado: não há produto equivalente na coleção analisada."
				: "O catálogo não estava conectado nesta execução.",
			metrics: gap
				? [
						{ label: "Resultado", value: gap.inCatalog ? "Presente" : "Gap" },
						{ label: "Matches", value: `${gap.catalogMatches}` },
						{ label: "Fit", value: `${opportunity.breakdown.fit}/100` },
					]
				: [],
			items: gap?.sampleMatch
				? [
						{
							title: gap.sampleMatch,
							subtitle: "Produto ou coleção mais próxima",
						},
					]
				: [],
		});
	}

	return previews;
}
