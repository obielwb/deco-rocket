import type { RfqRecord, SupplierQuote } from "./types.ts";

/**
 * RFQ persistence. Default implementation is an in-memory Map singleton — fine
 * for local dev, the demo, and a single-instance Bun deploy. For multi-instance
 * / edge production, swap this module's body for Cloudflare KV/D1 or the Deco DB
 * (the interface below is the seam: save / get / list / addQuote).
 */
export interface RfqStore {
	save(record: RfqRecord): Promise<void>;
	get(rfqId: string): Promise<RfqRecord | null>;
	list(): Promise<RfqRecord[]>;
	addQuote(rfqId: string, quote: SupplierQuote): Promise<RfqRecord | null>;
}

class MemoryRfqStore implements RfqStore {
	private records = new Map<string, RfqRecord>();

	async save(record: RfqRecord): Promise<void> {
		this.records.set(record.rfqId, record);
	}

	async get(rfqId: string): Promise<RfqRecord | null> {
		return this.records.get(rfqId) ?? null;
	}

	async list(): Promise<RfqRecord[]> {
		return [...this.records.values()].sort((a, b) =>
			(b.sentAt ?? "").localeCompare(a.sentAt ?? ""),
		);
	}

	async addQuote(
		rfqId: string,
		quote: SupplierQuote,
	): Promise<RfqRecord | null> {
		const record = this.records.get(rfqId);
		if (!record) return null;
		record.quotes.push(quote);
		record.status = "answered";
		this.records.set(rfqId, record);
		return record;
	}
}

/** Process-wide singleton store. */
export const rfqStore: RfqStore = new MemoryRfqStore();

/** Short, URL/subject-safe correlation id for an RFQ thread. */
export function newRfqId(): string {
	return crypto.randomUUID().split("-")[0];
}
