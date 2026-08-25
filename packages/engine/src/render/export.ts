/**
 * renderPdf — assemble a draft document to HTML and ask the PdfRendererPort
 * to produce PDF bytes. This is the ONLY export path; it never sends anything
 * (constitution Principle II).
 */
import type {
  ApplicationDraftSet,
  CandidateProfile,
} from "../domain/schemas.js";
import type { EngineDeps } from "../ports/index.js";
import { renderDocument } from "./templates.js";

export interface RenderPdfInput {
  draftSet: ApplicationDraftSet;
  profile: CandidateProfile;
  document: "resume" | "cover-letter";
}

export async function renderPdf(
  input: RenderPdfInput,
  deps: EngineDeps,
): Promise<Uint8Array> {
  const { draftSet, profile, document } = input;
  const title = document === "resume" ? profile.name : "Cover Letter";
  const contactLine = [
    profile.name,
    profile.contact.email,
    profile.contact.phone,
    profile.contact.location,
  ]
    .filter(Boolean)
    .join(" · ");
  const bodyMd =
    document === "resume" ? draftSet.resume.contentMd : draftSet.coverLetter.contentMd;
  const rendered = renderDocument({
    kind: document,
    title,
    contactLine,
    bodyMd,
    disclosureText: draftSet.disclosure.enabled ? draftSet.disclosure.text : "",
  });
  return deps.pdfRenderer.render({
    html: rendered.html,
    css: rendered.css,
    pageFormat: "a4",
  });
}