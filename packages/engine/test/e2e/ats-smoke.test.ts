import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { PlaywrightPdfAdapter } from "../../src/adapters/playwright-pdf.js";

const execFileAsync = promisify(execFile);

/**
 * T038 ATS smoke — a rendered PDF's text layer must contain contact literal
 * text (recruiter/ATS side). Runs only when JOBSAGE_TEST_RENDER=1 (browser
 * available) AND pdftotext is installed; otherwise skipped offline.
 */
const renderEnabled = process.env.JOBSAGE_TEST_RENDER === "1";
let hasPdfToText = false;

async function checkPdfToText(): Promise<boolean> {
  try {
    await execFileAsync("pdftotext", ["-v"]);
    return true;
  } catch {
    return false;
  }
}

const gated =
  renderEnabled && (await checkPdfToText()) ? describe : describe.skip;

gated("ATS text-layer smoke (render gated)", () => {
  it("exposes name and email as literal text in the PDF text layer", async () => {
    const adapter = new PlaywrightPdfAdapter();
    const pdf = await adapter.render({
      html: "<h1>Ada Lovelace</h1><p>ada@example.com</p><p>+1 555 0100</p>",
      css: "body{font-family:sans-serif}",
      pageFormat: "a4",
    });
    const tmp = "/tmp/jobsage-ats-smoke.pdf";
    const { writeFile } = await import("node:fs/promises");
    await writeFile(tmp, pdf);
    const { stdout } = await execFileAsync("pdftotext", [tmp, "-"]);
    expect(stdout).toContain("Ada Lovelace");
    expect(stdout).toContain("ada@example.com");
    expect(stdout).toContain("+1 555 0100");
  });
});