/**
 * OpenAI-compatible LlmPort adapter — covers DeepSeek/Qwen/GLM domestic models.
 * Uses Node's global fetch (zero new runtime deps). Structured output is
 * requested via response_format json_object; workflow-level zod + retry is the
 * correctness boundary (research.md R2).
 */
import type { LlmPort, LlmRequest } from "../ports/index.js";
import { ProviderMeta } from "./providers.js";

export interface OpenAiCompatibleConfig {
  meta: ProviderMeta;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class OpenAiCompatibleLlmAdapter implements LlmPort {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: OpenAiCompatibleConfig) {
    this.baseUrl = config.baseUrl ?? config.meta.baseUrl;
    this.model = config.model ?? config.meta.model;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async run(req: LlmRequest): Promise<{ text: string }> {
    const key = process.env[this.config.meta.apiKeyEnvVar];
    if (!key) {
      throw new Error(
        `Missing ${this.config.meta.apiKeyEnvVar}; set it to use the ${this.config.meta.id} provider.`,
      );
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    };
    if (req.jsonSchema !== undefined) {
      body.response_format = { type: "json_object" };
    }
    if (req.maxTokens !== undefined) {
      body.max_tokens = req.maxTokens;
    }

    const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`LLM HTTP ${res.status} from ${this.config.meta.id}`);
    }

    const data = (await res.json()) as ChatCompletionResponse;
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error(`No content in LLM response from ${this.config.meta.id}`);
    }
    return { text: text.trim() };
  }

  async generate(req: LlmRequest): Promise<{ text: string }> {
    return this.run(req);
  }

  async generateIsolated(req: LlmRequest): Promise<{ text: string }> {
    // Stateless adapter: a new call is a fresh context by construction.
    return this.run(req);
  }
}