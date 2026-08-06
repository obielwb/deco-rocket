import { getConfig } from "../config.ts";
import { parseQuote } from "../lib/rfq.ts";
import { rfqStore } from "../lib/rfq-store.ts";

/** Extract the RFQ id from a plus-address (rfq+<id>@…) or a `[RFQ-<id>]` tag. */
export function extractRfqId(payload: {
	to?: string;
	subject?: string;
}): string | null {
	const plus = payload.to?.match(/rfq\+([a-z0-9]+)@/i);
	if (plus) return plus[1];
	const tag = payload.subject?.match(/\[RFQ-([a-z0-9]+)\]/i);
	if (tag) return tag[1];
	return null;
}

interface ResendInboundPayload {
	// Resend inbound / generic shape — we read defensively.
	to?: string | { email?: string }[];
	from?: string;
	subject?: string;
	text?: string;
	html?: string;
	// Some providers nest under `data`.
	data?: Partial<ResendInboundPayload>;
}

function normalizeTo(to: ResendInboundPayload["to"]): string {
	if (!to) return "";
	if (typeof to === "string") return to;
	return to.map((t) => t.email ?? "").join(",");
}

/**
 * Inbound webhook for supplier replies. Validates the shared secret, correlates
 * the reply to an RFQ thread, parses the quote and attaches it. Returns 200 on
 * success (and on unmatched replies, to avoid provider retries).
 */
export async function handleRfqInbound(
	env: unknown,
	req: Request,
): Promise<Response> {
	const c = getConfig(env);

	// Auth: shared secret via header or ?secret= query.
	if (c.RFQ_WEBHOOK_SECRET) {
		const url = new URL(req.url);
		const provided =
			req.headers.get("x-webhook-secret") ?? url.searchParams.get("secret");
		if (provided !== c.RFQ_WEBHOOK_SECRET) {
			return new Response("Unauthorized", { status: 401 });
		}
	}

	let payload: ResendInboundPayload;
	try {
		payload = (await req.json()) as ResendInboundPayload;
	} catch {
		return new Response("Bad Request", { status: 400 });
	}
	const p = payload.data ?? payload;

	const rfqId = extractRfqId({
		to: normalizeTo(p.to),
		subject: p.subject,
	});
	if (!rfqId) {
		return Response.json({ ok: false, reason: "no rfqId matched" });
	}

	const text = p.text || p.html || p.subject || "";
	const quote = await parseQuote(env, text);
	const updated = await rfqStore.addQuote(rfqId, quote);

	return Response.json({
		ok: updated != null,
		rfqId,
		matched: updated != null,
	});
}
