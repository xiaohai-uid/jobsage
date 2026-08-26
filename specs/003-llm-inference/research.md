# Research: 003-llm-inference

**Date**: 2026-08-26 | **Status**: unknowns resolved

## R1. 真实模型接入方式：OpenAI 兼容适配器

- **Decision**: 新增 `OpenAiCompatibleLlmAdapter`，用 Node 内置 `fetch` 调 `/chat/completions`，`response_format: {type:"json_object"}` 做结构化输出。境内三家（DeepSeek/Qwen/GLM）都是 OpenAI 兼容端点，一个适配器 + 注册表即可覆盖。
- **Rationale**: 统一接入成本最低；DeepSeek 官方即 OpenAI 兼容；DashScope 有 `compatible-mode` 端点；GLM 走 `/api/paas/v4`。保留 Claude Agent SDK 适配器作第二轨（海外/偏好）。
- **Alternatives excluded**: 每家写专用 SDK 适配器（多依赖、重复）；走 Anthropic Messages API 兼容层（境内模型多数不兼容，且偏离 BYOK 灵活度）。留痕：若未来某家不再兼容 OpenAI 协议再拆专用适配器。

## R2. 结构化输出与校验

- **Decision**: 适配器 `generate` 请求带 `response_format json_object`（境内兼容时）；workflow 层仍用 zod 校验 + 重试一次（沿用 P0 `evaluate.ts`/`draft.ts` 已有 retry 循环）。
- **Rationale**: 双层保障——请求层尽量让模型输出合法 JSON，解析层拦截坏输出并重试，杜绝半成品。
- **Note**: Claude Agent SDK 侧已有 SDK 原生能力 + workflow zod 兜底，双轨行为一致。

## R3. provider 注册表（境内）

| providerId | baseURL（默认） | model（默认） | apiKeyEnvVar |
|---|---|---|---|
| `deepseek` | `https://api.deepseek.com` | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| `qwen` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | `DASHSCOPE_API_KEY` |
| `glm` | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-plus` | `ZHIPU_API_KEY` |

- 允许用户经 ProviderConfig.baseUrl/model 覆盖（境内自建网关等）。

## R4. 密钥与合规

- 密钥只从 env 读；`ProviderConfig.apiKeyEnvVar` 存变量名非值。
- compliance `NETWORK_WHITELIST` 增加 `packages/engine/src/adapters/openai-compatible.ts`（fetch 仅存在于该白名单适配器内）。
- 中国版走境内端点，不触发 PIPL 数据出境。

## R5. 桌面端

- `ProviderId` 加 `deepseek|qwen|glm`；SettingsView 下拉与 ProviderDesc 文案说明所需 env 变量；无密钥输入框。
- 桌面 `commands.ts` 的 provider 透传已支持任意字符串（`--provider <...>`），仅需类型与文案扩展。