import { describe, expect, it } from "vitest";
import { mdToSimpleHtml, renderDocument } from "../../src/render/templates.js";

describe("render templates", () => {
  it("renders contact information as literal text (ATS invariant)", () => {
    const { html } = renderDocument({
      kind: "resume",
      title: "Ada Lovelace",
      contactLine: "ada@example.com · +1 555 0100",
      bodyMd: "# Summary\nProven mathematician.",
      disclosureText: "AI-assisted draft",
    });
    expect(html).toContain("ada@example.com");
    expect(html).toContain("+1 555 0100");
    // No icon/image dependency
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toContain("&#x");
  });

  it("includes disclosure text when provided", () => {
    const { html } = renderDocument({
      kind: "cover-letter",
      title: "Cover Letter",
      contactLine: "ada@example.com",
      bodyMd: "Dear team,",
      disclosureText: "This material was prepared with AI assistance.",
    });
    expect(html).toContain("This material was prepared with AI assistance.");
  });

  it("converts markdown bullets to list items", () => {
    const html = mdToSimpleHtml("- Alpha\n- Beta\n\nPara");
    expect(html).toContain("<ul><li>Alpha</li><li>Beta</li></ul>");
    expect(html).toContain("<p>Para</p>");
  });

  it("escapes HTML in user content", () => {
    const html = mdToSimpleHtml("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
