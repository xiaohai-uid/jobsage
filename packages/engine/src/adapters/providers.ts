/**
 * Domestic (China) LLM provider registry — all OpenAI-compatible endpoints.
 * Contract: specs/003-llm-inference/research.md R3
 */
export interface ProviderMeta {
  id: "deepseek" | "qwen" | "glm";
  baseUrl: string;
  model: string;
  apiKeyEnvVar: string;
}

const REGISTRY: Record<string, ProviderMeta> = {
  deepseek: {
    id: "deepseek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    apiKeyEnvVar: "DEEPSEEK_API_KEY",
  },
  qwen: {
    id: "qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    apiKeyEnvVar: "DASHSCOPE_API_KEY",
  },
  glm: {
    id: "glm",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-plus",
    apiKeyEnvVar: "ZHIPU_API_KEY",
  },
};

export const PROVIDER_IDS = Object.keys(REGISTRY) as Array<ProviderMeta["id"]>;

export function resolveProvider(id: string): ProviderMeta {
  const meta = REGISTRY[id];
  if (!meta) throw new Error(`unknown provider: ${id}`);
  return meta;
}