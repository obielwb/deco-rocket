export interface FetchOptions extends RequestInit {
	timeoutMs?: number;
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
