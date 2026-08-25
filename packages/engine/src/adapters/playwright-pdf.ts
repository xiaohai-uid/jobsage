/**
 * PlaywrightPdfRenderer — HTML/CSS → A4 PDF adapter.
 * Constitution decision (research.md R2): HTML print-to-PDF replaces LaTeX for
 * consumer distribution. Offline CI uses NullPdfAdapter; real rendering is
 * exercised only when JOBSAGE_TEST_RENDER=1 and a Chromium binary is present.
 */
import { chromium } from "playwright";
import type { PdfRendererPort } from "../ports/index.js";
import { RendererUnavailableError } from "../ports/index.js";

export class PlaywrightPdfAdapter implements PdfRendererPort {
  async render(req: { html: string; css: string; pageFormat: "a4" }): Promise<Uint8Array> {
    let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
    try {
      browser = await chromium.launch();
      const page = await browser.newPage();
      await page.setContent(`<style>${req.css}</style>${req.html}`, {
        waitUntil: "networkidle",
      });
      const pdf = await page.pdf({ format: req.pageFormat, printBackground: true });
      return new Uint8Array(pdf);
    } catch (err) {
      throw new RendererUnavailableError(
        `Playwright PDF render failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      await browser?.close().catch(() => {});
    }
  }
}