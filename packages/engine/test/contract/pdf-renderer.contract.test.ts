import { describe, expect, it } from "vitest";
import { PlaywrightPdfAdapter } from "../../src/adapters/playwright-pdf.js";

/**
 * PdfRendererPort contract — exercised only when JOBSAGE_TEST_RENDER=1 and a
 * Chromium binary is installed. Offline CI skips this suite (constitution
 * Principle V: offline deterministic).
 */
const gated = process.env.JOBSAGE_TEST_RENDER === "1" ? describe : describe.skip;

gated("PdfRendererPort contract (Playwright)", () => {
  it("renders an A4 PDF with PDF magic bytes", async () => {
    const adapter = new PlaywrightPdfAdapter();
    const pdf = await adapter.render({
      html: "<h1>Ada Lovelace</h1><p>ada@example.com</p>",
      css: "body { font-family: sans-serif; }",
      pageFormat: "a4",
    });
    expect(pdf.length).toBeGreaterThan(100);
    expect(new TextDecoder().decode(pdf.subarray(0, 5))).toBe("%PDF-");
  });
});