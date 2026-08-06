import { describe, expect, test } from "bun:test";
import { buildRfqEmail, heuristicParse } from "../api/lib/rfq.ts";
import { rfqStore } from "../api/lib/rfq-store.ts";
import { rfqSend } from "../api/tools/rfq.ts";
import type { Env } from "../api/types/env.ts";
import { extractRfqId, handleRfqInbound } from "../api/webhooks/rfq-inbound.ts";

function makeEnv(state: Record<string, string> = {}): Env {
	return { MESH_REQUEST_CONTEXT: { state }, IS_LOCAL: true } as unknown as Env;
}
function runtimeContext(env: Env) {
	return { env, ctx: { waitUntil: () => {} } };
}

describe("buildRfqEmail", () => {
	test("subject carries the correlation tag and body has product/specs/qtys", () => {
		const { subject, body } = buildRfqEmail({
			product: "Garrafa térmica 1L",
			specs: ["inox 304", "24h quente"],
			costHint: 30,
			quantities: [100, 500],
			rfqId: "ab12cd",
		});
		expect(subject).toContain("[RFQ-ab12cd]");
		expect(body).toContain("Garrafa térmica 1L");
		expect(body).toContain("inox 304");
		expect(body).toContain("100 / 500");
	});
});

describe("heuristicParse", () => {
	test("extracts price tiers, MOQ and lead time from a PT reply", () => {
		const reply = `Olá, segue nossa cotação:
100 unidades: R$ 32,50 cada
500 unidades: R$ 28,00 cada
MOQ mínimo de 100 peças.
Prazo de produção: 20 dias.
Pagamento: 50% antecipado, 50% na entrega.`;
		const q = heuristicParse(reply);
		expect(q.tiers.length).toBeGreaterThanOrEqual(1);
		expect(q.tiers[0].unitPrice).toBeGreaterThan(0);
		expect(q.moq).toBe(100);
		expect(q.leadTimeDays).toBe(20);
	});
});

describe("RFQ_SEND dryRun", () => {
	test("composes without sending and stores a draft record", async () => {
		const env = makeEnv();
		const tool = rfqSend(env);
		const res = (await tool.execute({
			context: {
				supplierEmail: "fornecedor@teste.com",
				product: "Caneca térmica",
				specs: ["cerâmica"],
				dryRun: true,
			},
			runtimeContext: runtimeContext(env),
		})) as {
			rfqId: string;
			status: string;
			subject: string;
			messageId: string | null;
		};

		expect(res.status).toBe("draft");
		expect(res.messageId).toBeNull();
		expect(res.subject).toContain(`[RFQ-${res.rfqId}]`);

		const stored = await rfqStore.get(res.rfqId);
		expect(stored?.supplierEmail).toBe("fornecedor@teste.com");
		expect(stored?.status).toBe("draft");
	});
});

describe("inbound webhook", () => {
	test("extractRfqId reads plus-address and subject tag", () => {
		expect(extractRfqId({ to: "rfq+xy99zz@rfq.loja.com" })).toBe("xy99zz");
		expect(extractRfqId({ subject: "Re: cotação [RFQ-abc123]" })).toBe(
			"abc123",
		);
		expect(extractRfqId({ subject: "sem tag" })).toBeNull();
	});

	test("attaches a parsed quote to the RFQ thread and marks it answered", async () => {
		const env = makeEnv();
		// First create an RFQ thread (dryRun) to get a real rfqId.
		const send = (await rfqSend(env).execute({
			context: { supplierEmail: "s@t.com", product: "Kit café", dryRun: true },
			runtimeContext: runtimeContext(env),
		})) as { rfqId: string };

		const req = new Request("http://localhost/webhooks/rfq-inbound", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				to: "compras@loja.com",
				from: "fornecedor@empresa.com",
				subject: `Re: cotação [RFQ-${send.rfqId}]`,
				text: "100 unidades: R$ 40,00. MOQ 100. Prazo 15 dias.",
			}),
		});

		const res = await handleRfqInbound(env, req);
		expect(res.status).toBe(200);
		const json = (await res.json()) as { ok: boolean; matched: boolean };
		expect(json.matched).toBe(true);

		const record = await rfqStore.get(send.rfqId);
		expect(record?.status).toBe("answered");
		expect(record?.quotes.length).toBe(1);
	});

	test("rejects when webhook secret does not match", async () => {
		const env = makeEnv({ RFQ_WEBHOOK_SECRET: "topsecret" });
		const req = new Request("http://localhost/webhooks/rfq-inbound", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ subject: "[RFQ-x]" }),
		});
		const res = await handleRfqInbound(env, req);
		expect(res.status).toBe(401);
	});
});
