import { type State, StateSchema } from "./types/env.ts";

/**
 * Resolve effective configuration for a request.
 *
 * Priority: deco Studio connection state (`env.MESH_REQUEST_CONTEXT.state`)
 * first, then `process.env` as a fallback. The fallback makes local development
 * and real integration tests possible without a running Studio — drop the keys
 * in a `.env` file and every tool works the same way it does in production.
 */
export function getConfig(env: unknown): State {
	const state =
		(env as { MESH_REQUEST_CONTEXT?: { state?: Partial<State> } })
			?.MESH_REQUEST_CONTEXT?.state ?? {};

	const fromEnv: Partial<State> = {};
	for (const key of Object.keys(StateSchema.shape) as (keyof State)[]) {
		const stateVal = state[key];
		const envVal = process.env[key as string];
		const value = stateVal ?? envVal;
		if (value !== undefined && value !== "") {
			// biome-ignore lint/suspicious/noExplicitAny: dynamic assignment across a mixed schema
			(fromEnv as any)[key] = value;
		}
	}

	const parsed = StateSchema.safeParse(fromEnv);
	return parsed.success ? parsed.data : (fromEnv as State);
}

export const defaults = {
	geo: (c: State) => c.GEO || "BR",
	lang: (c: State) => c.LANG || "pt-BR",
	anthropicModel: (c: State) => c.ANTHROPIC_MODEL || "claude-sonnet-5",
	imageProvider: (c: State) => c.IMAGE_PROVIDER || "gemini",
	vtexEnv: (c: State) => c.VTEX_ENVIRONMENT || "vtexcommercestable",
};

/** Thrown by clients when a required credential is missing. */
export class MissingCredentialError extends Error {
	constructor(public readonly provider: string) {
		super(`Missing credentials for ${provider}`);
		this.name = "MissingCredentialError";
	}
}
