/**
 * Dependency wiring for the CLI shell.
 * Provider selection: `--provider mock|claude-agent-sdk` overrides
 * JOBSAGE_PROVIDER env, which overrides the default claude-agent-sdk.
 * Offline CI always uses mock (constitution Principle V).
 */
import {
  ClaudeAgentSdkLlmAdapter,
  MockLlmAdapter,
  NullPdfAdapter,
  SystemClock,
  UlidLikeIdGenerator,
  type EngineDeps,
} from "@jobsage/engine";

export type ProviderFlag = "auto" | "mock" | "claude-agent-sdk";

export function resolveProvider(flag?: string): "mock" | "claude-agent-sdk" {
  const chosen = flag && flag !== "auto" ? flag : process.env.JOBSAGE_PROVIDER ?? "claude-agent-sdk";
  return chosen === "mock" ? "mock" : "claude-agent-sdk";
}

function readMockScript(): string[] {
  const raw = process.env.JOBSAGE_MOCK_RESPONSES;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [String(parsed)];
  } catch {
    return [];
  }
}

export function buildDeps(provider?: string): EngineDeps {
  const name = resolveProvider(provider);
  if (name === "mock") {
    return {
      llm: new MockLlmAdapter(readMockScript()),
      pdfRenderer: new NullPdfAdapter(),
      ids: new UlidLikeIdGenerator(),
      clock: new SystemClock(),
    };
  }
  return {
    llm: new ClaudeAgentSdkLlmAdapter(),
    pdfRenderer: new NullPdfAdapter(),
    ids: new UlidLikeIdGenerator(),
    clock: new SystemClock(),
  };
}
