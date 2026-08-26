import { describe, expect, it, vi } from "vitest";
import { OpenAiCompatibleLlmAdapter } from "../../src/adapters/openai-compatible.js";
import { resolveProvider } from "../../src/adapters/providers.js";

/**
 * LlmPort contract for the OpenAI-compatible adapter, exercised with a mock
 * fetch so CI stays offline (constitution V).
 */
describe("OpenAiCompatibleLlmAdapter contract", () => {
  it("sends response_format json_object and Bearer auth, parses content", async () => {
    const fetchMock = vi.fn(async (_url: unknown, init: { body: string; headers: Record<string, string> }) => {
      const body = JSON.parse(init.body);
      expect(init.headers.Authorization).toBe("Bearer sk-test");
      expect(body.response_format).toEqual({ type: "json_object" });
      expect(body.messages).toHaveLength(2);
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    process.env.DEEPSEEK_API_KEY = "sk-test";
    try {
      const adapter = new OpenAiCompatibleLlmAdapter({
        meta: resolveProvider("deepseek"),
        fetchImpl: fetchMock,
      });
      const { text } = await adapter.generate({
        system: "s",
        user: "u",
        jsonSchema: {},
      });
      expect(text).toBe('{"ok":true}');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env.DEEPSEEK_API_KEY;
    }
  });

  it("throws a clear error when the API key env var is missing", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const adapter = new OpenAiCompatibleLlmAdapter({
      meta: resolveProvider("deepseek"),
      fetchImpl: (async () => new Response("{}", { status: 200 })) as unknown as typeof fetch,
    });
    await expect(adapter.generate({ system: "s", user: "u" })).rejects.toThrow(
      /Missing DEEPSEEK_API_KEY/,
    );
  });

  it("maps non-2xx to a readable error", async () => {
    process.env.ZHIPU_API_KEY = "sk";
    try {
      const adapter = new OpenAiCompatibleLlmAdapter({
        meta: resolveProvider("glm"),
        fetchImpl: (async () => new Response("{}", { status: 429 })) as unknown as typeof fetch,
      });
      await expect(adapter.generate({ system: "s", user: "u" })).rejects.toThrow(/HTTP 429/);
    } finally {
      delete process.env.ZHIPU_API_KEY;
    }
  });
});