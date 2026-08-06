import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { replyToFor, sendEmail } from "../clients/email.ts";
import { buildRfqEmail, parseQuote } from "../lib/rfq.ts";
import { newRfqId, rfqStore } from "../lib/rfq-store.ts";
import { RfqRecordSchema, SupplierQuoteSchema } from "../lib/types.ts";
import type { Env } from "../types/env.ts";

/**
 * RFQ Agent — Pilar 2 (fornecedor real). Sends a structured request-for-quote
 * e-mail to a supplier via Resend and tracks the thread for inbound replies.
 */
export const rfqSend = (env: Env) =>
	createTool({
		id: "RFQ_SEND",
		description:
			"Send a structured request-for-quote (RFQ) e-mail to a supplier via Resend and track the thread. Use dryRun:true to compose without sending. Requires RESEND_API_KEY + RFQ_FROM_EMAIL to actually send.",
		inputSchema: z.object({
			supplierEmail: z.string().describe("Supplier e-mail address"),
			supplierName: z.string().optional(),
			product: z.string().describe("Product name to quote"),
			keyword: z.string().optional(),
			specs: z.array(z.string()).optional(),
			quantities: z
				.array(z.number())
				.optional()
				.describe("Quantity tiers (default 100/500/1000)"),
			costHint: z.number().nullable().optional(),
			dryRun: z
				.boolean()
				.optional()
				.describe("Compose only, do not send. Default false"),
		}),
		outputSchema: z.object({
			rfqId: z.string(),
			subject: z.string(),
			body: z.string(),
			messageId: z.string().nullable(),
			status: z.enum(["draft", "sent", "answered"]),
			degraded: z.boolean(),
		}),
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
		execute: async ({ context }) => {
			const rfqId = newRfqId();
			const { subject, body } = buildRfqEmail({
				product: context.product,
				specs: context.specs,
				costHint: context.costHint ?? null,
				quantities: context.quantities,
				rfqId,
			});

			let messageId: string | null = null;
			let status: "draft" | "sent" | "answered" = "draft";
			let degraded = false;

			if (!context.dryRun) {
				try {
					const res = await sendEmail(env, {
						to: context.supplierEmail,
						subject,
						text: body,
						replyTo: replyToFor(env, rfqId),
					});
					messageId = res.id;
					status = "sent";
				} catch {
					degraded = true; // missing credentials or send failure → stays draft
				}
			}

			await rfqStore.save({
				rfqId,
				keyword: context.keyword ?? null,
				product: context.product,
				supplierEmail: context.supplierEmail,
				supplierName: context.supplierName ?? null,
				subject,
				body,
				sentAt: status === "sent" ? new Date().toISOString() : null,
				messageId,
				status,
				quotes: [],
			});

			return { rfqId, subject, body, messageId, status, degraded };
		},
	});

/**
 * RFQ Agent — parse a supplier's reply into a structured quote (Claude, with a
 * deterministic heuristic fallback). Attaches it to the RFQ thread if rfqId given.
 */
export const rfqParse = (env: Env) =>
	createTool({
		id: "RFQ_PARSE",
		description:
			"Extract a structured supplier quote (price tiers, MOQ, lead time, payment terms) from a raw e-mail reply. Optionally attach it to an RFQ thread. Uses Claude if available, else a heuristic parser.",
		inputSchema: z.object({
			replyText: z.string().describe("Raw supplier reply text"),
			rfqId: z
				.string()
				.optional()
				.describe("RFQ thread id to attach the quote to"),
		}),
		outputSchema: z.object({
			quote: SupplierQuoteSchema,
			attached: z.boolean(),
		}),
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
		execute: async ({ context }) => {
			const quote = await parseQuote(env, context.replyText);
			let attached = false;
			if (context.rfqId) {
				const updated = await rfqStore.addQuote(context.rfqId, quote);
				attached = updated != null;
			}
			return { quote, attached };
		},
	});

/** RFQ Agent — list tracked RFQ threads and their received quotes (for the UI). */
export const rfqList = (_env: Env) =>
	createTool({
		id: "RFQ_LIST",
		description:
			"List all tracked RFQ threads and their received supplier quotes.",
		inputSchema: z.object({}),
		outputSchema: z.object({ rfqs: z.array(RfqRecordSchema) }),
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
		execute: async () => ({ rfqs: await rfqStore.list() }),
	});
