/**
 * Dependency wiring for the CLI shell.
 * Provider selection: `--provider <id>` overrides JOBSAGE_PROVIDER env, which
 * overrides the default claude-agent-sdk. Offline CI always uses mock.
 * Domestic providers (deepseek/qwen/glm) use the OpenAI-compatible adapter.
 */
import {
  ClaudeAgentSdkLlmAdapter,
  MockLlmAdapter,
  NullPdfAdapter,
  OpenAiCompatibleLlmAdapter,
  SystemClock,
  UlidLikeIdGenerator,
  resolveProvider as resolveDomesticProvider,
  type EngineDeps,
} from "@jobsage/engine";

export type ProviderFlag =
  | "auto"
  | "mock"
  | "claude-agent-sdk"
  | "deepseek"
  | "qwen"
  | "glm";

export function resolveProvider(flag?: string): Exclude<ProviderFlag, "auto"> {
  const chosen = (flag && flag !== "auto" ? flag : process.env.JOBSAGE_PROVIDER) ?? "claude-agent-sdk";
  return chosen as Exclude<ProviderFlag, "auto">;
}

/** Env var that must hold this provider's key; null for mock (no key needed). */
export function providerApiKeyEnvVar(provider: string): string | null {
  switch (provider) {
    case "mock":
      return null;
    case "claude-agent-sdk":
      return "ANTHROPIC_API_KEY";
    case "deepseek":
    case "qwen":
    case "glm":
      return resolveDomesticProvider(provider).apiKeyEnvVar;
    default:
      return null;
  }
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

function readMockIsolatedScript(): string[] | undefined {
  const raw = process.env.JOBSAGE_MOCK_ISOLATED_RESPONSES;
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [String(parsed)];
  } catch {
    return undefined;
  }
}

export function buildDeps(provider?: string, opts?: { pdfRenderer?: import("@jobsage/engine").PdfRendererPort }): EngineDeps {
  const name = resolveProvider(provider);
  const pdfRenderer = opts?.pdfRenderer ?? new NullPdfAdapter();
  const common = { pdfRenderer, ids: new UlidLikeIdGenerator(), clock: new SystemClock() };

  if (name === "mock") {
    const isolated = readMockIsolatedScript();
    return {
      llm: new MockLlmAdapter(readMockScript(), {
        ...(isolated ? { isolatedScript: isolated } : {}),
      }),
      ...common,
    };
  }
  if (name === "claude-agent-sdk") {
    return { llm: new ClaudeAgentSdkLlmAdapter(), ...common };
  }
  // deepseek / qwen / glm
  return {
    llm: new OpenAiCompatibleLlmAdapter({ meta: resolveDomesticProvider(name) }),
    ...common,
  };
}