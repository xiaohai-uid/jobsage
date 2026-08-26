import { describe, expect, it } from "vitest";
import { ProviderConfigSchema } from "../../src/domain/schemas.js";
import { resolveProvider } from "../../src/adapters/providers.js";

describe("resolveProvider registry (R3)", () => {
  it("resolves deepseek defaults", () => {
    const p = resolveProvider("deepseek");
    expect(p.baseUrl).toBe("https://api.deepseek.com");
    expect(p.model).toBe("deepseek-chat");
    expect(p.apiKeyEnvVar).toBe("DEEPSEEK_API_KEY");
  });

  it("resolves qwen and glm", () => {
    expect(resolveProvider("qwen").apiKeyEnvVar).toBe("DASHSCOPE_API_KEY");
    expect(resolveProvider("glm").apiKeyEnvVar).toBe("ZHIPU_API_KEY");
  });

  it("throws on unknown provider", () => {
    expect(() => resolveProvider("bogus")).toThrow(/unknown provider/);
  });
});

describe("ProviderConfigSchema providerId enum", () => {
  it("accepts domestic + existing providers", () => {
    for (const id of ["deepseek", "qwen", "glm", "claude-agent-sdk", "mock"]) {
      const r = ProviderConfigSchema.safeParse({
        providerId: id,
        model: "m",
        apiKeyEnvVar: "X",
      });
      expect(r.success).toBe(true);
    }
  });

  it("rejects unknown provider id", () => {
    const r = ProviderConfigSchema.safeParse({
      providerId: "bogus",
      model: "m",
      apiKeyEnvVar: "X",
    });
    expect(r.success).toBe(false);
  });
});