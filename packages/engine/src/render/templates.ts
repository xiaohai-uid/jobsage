/**
 * HTML/CSS document templates for A4 print-to-PDF rendering.
 * P0 scope: simple, dependency-free Markdown→HTML fragment conversion.
 * ATS-friendliness invariant: contact information must appear as literal text
 * nodes (no images, no icon fonts) — tested in render.test.ts.
 */

export interface RenderInput {
  kind: "resume" | "cover-letter";
  title: string;
  contactLine: string;
  bodyMd: string;
  disclosureText: string;
}

export interface RenderOutput {
  html: string;
  css: string;
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Minimal Markdown subset: blank-line paragraphs and "- " bullet lists. */
export function mdToSimpleHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let list: string[] | null = null;

  const closeList = () => {
    if (list) {
      out.push(`<ul>${list.map((li) => `<li>${li}</li>`).join("")}</ul>`);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      closeList();
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      list ??= [];
      list.push(escapeHtml(bullet[1] ?? ""));
      continue;
    }
    closeList();
    out.push(`<p>${escapeHtml(line)}</p>`);
  }
  closeList();
  return out.join("\n");
}

const PAGE_CSS = `
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.45; margin: 0; }
h1 { font-size: 18pt; margin: 0 0 2pt; }
.contact { font-size: 9.5pt; color: #444; margin-bottom: 10pt; }
h2 { font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 2pt; margin: 10pt 0 5pt; }
p { margin: 4pt 0; }
ul { margin: 4pt 0 4pt 14pt; padding: 0; }
li { margin: 2pt 0; }
.disclosure { margin-top: 14pt; font-size: 8pt; color: #666; border-top: 1px solid #eee; padding-top: 4pt; }
`;

export function renderDocument(input: RenderInput): RenderOutput {
  const bodyHtml = mdToSimpleHtml(input.bodyMd);
  const disclosureHtml = input.disclosureText
    ? `<div class="disclosure">${escapeHtml(input.disclosureText)}</div>`
    : "";
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(input.title)}</title></head>
<body>
<h1>${escapeHtml(input.title)}</h1>
<div class="contact">${escapeHtml(input.contactLine)}</div>
${bodyHtml}
${disclosureHtml}
</body></html>`;
  return { html, css: PAGE_CSS };
}
