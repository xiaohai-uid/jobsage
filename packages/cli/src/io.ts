/**
 * CLI I/O conventions — JSON envelope and exit codes.
 * Contract: specs/001-engine-core/contracts/cli-schema.md
 */

export const SCHEMA_VERSION = 1 as const;

export const ExitCode = {
  OK: 0,
  USAGE: 1,
  WORKSPACE: 2,
  CONFIG: 3,
  ENGINE: 4,
  UNEXPECTED: 5,
} as const;

export type EnvelopeOk<T> = {
  schemaVersion: typeof SCHEMA_VERSION;
  ok: true;
  data: T;
  error: null;
};

export type EnvelopeFail = {
  schemaVersion: typeof SCHEMA_VERSION;
  ok: false;
  data: null;
  error: { code: string; message: string; hint?: string };
};

export type Envelope<T> = EnvelopeOk<T> | EnvelopeFail;

export function ok<T>(data: T): EnvelopeOk<T> {
  return { schemaVersion: SCHEMA_VERSION, ok: true, data, error: null };
}

export function fail(code: number, message: string, hint?: string): EnvelopeFail {
  return {
    schemaVersion: SCHEMA_VERSION,
    ok: false,
    data: null,
    error: { code: `E${code}`, message, ...(hint ? { hint } : {}) },
  };
}

export function serializeEnvelope(env: Envelope<unknown>): string {
  return JSON.stringify(env, null, 2);
}

export function printEnvelope(env: Envelope<unknown>): void {
  console.log(serializeEnvelope(env));
}
