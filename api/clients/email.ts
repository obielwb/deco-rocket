import { defaults, getConfig, MissingCredentialError } from "../config.ts";
import { httpJson } from "../lib/http.ts";

export interface SendEmailArgs {
	to: string | string[];
	subject: string;
	text: string;
	html?: string;
	replyTo?: string;
}

/**
 * Send an e-mail via Resend (https://resend.com). Requires RESEND_API_KEY and a
 * verified RFQ_FROM_EMAIL. Returns the provider message id.
 */
export async function sendEmail(
	env: unknown,
	args: SendEmailArgs,
): Promise<{ id: string }> {
	const c = getConfig(env);
	if (!c.RESEND_API_KEY) throw new MissingCredentialError("resend");
	if (!c.RFQ_FROM_EMAIL) throw new MissingCredentialError("rfq_from_email");

	const from = `${defaults.rfqFromName(c)} <${c.RFQ_FROM_EMAIL}>`;
	const data = await httpJson<{ id?: string }>(
		"https://api.resend.com/emails",
		{
			method: "POST",
			headers: {
				authorization: `Bearer ${c.RESEND_API_KEY}`,
				"content-type": "application/json",
			},
			timeoutMs: 30000,
			body: JSON.stringify({
				from,
				to: Array.isArray(args.to) ? args.to : [args.to],
				subject: args.subject,
				text: args.text,
				...(args.html ? { html: args.html } : {}),
				...(args.replyTo ? { reply_to: args.replyTo } : {}),
			}),
		},
	);

	return { id: data.id ?? "" };
}

/**
 * Compute the reply-to address used to correlate inbound supplier replies to an
 * RFQ thread via plus-addressing (e.g. rfq+ab12cd@rfq.loja.com). Falls back to
 * the sender address when no inbound domain is configured.
 */
export function replyToFor(env: unknown, rfqId: string): string | undefined {
	const c = getConfig(env);
	if (c.RFQ_INBOUND_DOMAIN) return `rfq+${rfqId}@${c.RFQ_INBOUND_DOMAIN}`;
	return c.RFQ_FROM_EMAIL ? `${c.RFQ_FROM_EMAIL}` : undefined;
}
