import { describe, expect, test } from "bun:test";
import { decodeImageDataUri } from "../api/creative-assets.ts";

describe("creative asset persistence", () => {
	test("decodes generated image data URIs before they reach the storefront", () => {
		const decoded = decodeImageDataUri(
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
		);

		expect(decoded?.mimeType).toBe("image/png");
		expect(decoded?.extension).toBe("png");
		expect(decoded?.bytes.length).toBeGreaterThan(0);
	});

	test("rejects non-image and malformed data URIs", () => {
		expect(decodeImageDataUri("https://example.com/image.png")).toBeNull();
		expect(decodeImageDataUri("data:text/plain;base64,dGVzdA==")).toBeNull();
		expect(decodeImageDataUri("data:image/png;base64,not-valid***")).toBeNull();
	});
});
