/**
 * Offline/test adapters for every port.
 * MockLlmAdapter is deterministic and counts generate vs generateIsolated
 * calls separately so isolation semantics are testable (US3 contract).
 */
import type {
  ClockPort,
  IdGeneratorPort,
  LlmPort,
  LlmRequest,
  PdfRendererPort,
} from "../ports/index.js";
import { RendererUnavailableError } from "../ports/index.js";

export class MockLlmAdapter implements LlmPort {
  private generateCalls = 0;
  private isolatedCalls = 0;
  private readonly script: readonly string[];

  constructor(script: readonly string[] = []) {
    this.script = script;
  }

  async generate(_req: LlmRequest): Promise<{ text: string }> {
    const idx = this.generateCalls++;
    return { text: this.script[idx] ?? `mock generate #${idx}` };
  }

  async generateIsolated(_req: LlmRequest): Promise<{ text: string }> {
    const idx = this.isolatedCalls++;
    return { text: this.script[idx] ?? `mock isolated #${idx}` };
  }

  get generateCount(): number {
    return this.generateCalls;
  }

  get isolatedCount(): number {
    return this.isolatedCalls;
  }
}

export class NullPdfAdapter implements PdfRendererPort {
  async render(): Promise<Uint8Array> {
    throw new RendererUnavailableError(
      "PDF rendering is unavailable in this environment; use --format html instead.",
    );
  }
}

export class SequentialIdGenerator implements IdGeneratorPort {
  private nextId = 0;
  constructor(private readonly prefix = "id") {}

  next(): string {
    return `${this.prefix}-${(this.nextId++).toString().padStart(6, "0")}`;
  }
}

export class FixedClock implements ClockPort {
  constructor(private readonly nowValue: Date) {}
  now(): Date {
    return this.nowValue;
  }
}
