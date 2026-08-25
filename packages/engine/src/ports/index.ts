/**
 * Ports — explicit hexagonal seams between the pure domain and the outside.
 * Contract: specs/001-engine-core/contracts/engine-api.md
 *
 * Constitution Principle IV: domain logic must stay offline-testable; every
 * outside capability (LLM, PDF, ids, clock) enters through these ports.
 */

/** Optional JSON Schema hint for providers that support structured output.
 *  Workflow-level zod validation remains the source of truth; this is an
 *  optimization hint, not a correctness boundary. */
export interface LlmRequest {
  system: string;
  user: string;
  jsonSchema?: unknown;
  maxTokens?: number;
}

export interface LlmPort {
  generate(req: LlmRequest): Promise<{ text: string }>;
  /** Fresh-context generation: implementations MUST NOT carry caller state. */
  generateIsolated(req: LlmRequest): Promise<{ text: string }>;
}

export interface PdfRendererPort {
  render(req: { html: string; css: string; pageFormat: "a4" }): Promise<Uint8Array>;
}

export interface IdGeneratorPort {
  next(): string;
}

export interface ClockPort {
  now(): Date;
}

export interface EngineDeps {
  llm: LlmPort;
  pdfRenderer: PdfRendererPort;
  ids: IdGeneratorPort;
  clock: ClockPort;
}

export class SchemaViolationError extends Error {
  override name = "SchemaViolationError";
  constructor(message: string) {
    super(message);
  }
}

export class RendererUnavailableError extends Error {
  override name = "RendererUnavailableError";
  constructor(message: string) {
    super(message);
  }
}

export class ProfileVersionMismatchError extends Error {
  override name = "ProfileVersionMismatchError";
  constructor(message: string) {
    super(message);
  }
}
