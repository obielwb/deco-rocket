export interface FetchOptions extends RequestInit {
	timeoutMs?: number;
}

/**
 * A provider call that reached us but did not produce usable data.
 *
 * Providers like SerpApi and DataForSEO answer `200 OK` and put the failure in
 * the body (an `error` string, a non-`20000` task status). Wrapping both cases
 * in one error type is what lets the pipeline mark a source as degraded instead
 * of silently reporting fabricated zeros as if they had been collected.
 */
export class ProviderError extends Error {
	constructor(
		public readonly provider: string,
		message: string,
		public readonly status?: number,
	) {
		super(`[${provider}] ${message}`);
		this.name = "ProviderError";
	}
}

/** fetch with a timeout and a helpful error message on non-2xx responses. */
export async function httpFetch(
	url: string,
	opts: FetchOptions = {},
): Promise<Response> {
	const { timeoutMs = 30000, ...init } = opts;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, { ...init, signal: controller.signal });
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(
				`HTTP ${res.status} ${res.statusText} for ${new URL(url).host}: ${body.slice(0, 300)}`,
			);
		}
		return res;
	} finally {
		clearTimeout(timer);
	}
}

export async function httpJson<T = unknown>(
	url: string,
	opts: FetchOptions = {},
): Promise<T> {
	const res = await httpFetch(url, {
		...opts,
		headers: { accept: "application/json", ...(opts.headers ?? {}) },
	});
	return (await res.json()) as T;
}
