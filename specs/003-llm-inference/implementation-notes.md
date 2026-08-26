# Implementation Notes — P2-① 真实 LLM 推理联调 (003-llm-inference)

**Date**: 2026-08-26 | **Status**: 离线实现完成；真实推理待 key

## 已实现

- `packages/engine/src/adapters/openai-compatible.ts`：`OpenAiCompatibleLlmAdapter`，Node 内置 fetch + `response_format json_object`，覆盖 DeepSeek/Qwen/GLM（零新依赖）。
- `packages/engine/src/adapters/providers.ts`：境内 provider 注册表（baseURL/model/envVar）。
- `ProviderConfigSchema.providerId` 扩展 `deepseek|qwen|glm`。
- CLI `deps.ts` + 三个命令：统一 `providerApiKeyEnvVar` 预检（缺哪个 env 提示哪个），exit 3。
- 桌面 Settings：provider 下拉 + 密钥说明（无输入框，不落盘）；`AppSettings.provider`/`ProviderId` 同步扩展。
- compliance 白名单加入 `openai-compatible.ts`。

## 测试

- root：**73 passed / 5 skipped**
- desktop：**15 passed**
- compliance：OK
- 新增离线：`domestic-workflow.test.ts`（经适配器 + MockFetch 跑通 evaluate→draft）；`providers.test.ts`；CLI deepseek 缺 key→exit3；桌面 provider 断言。
- 新增 env-gated：`live-provider.test.ts`（`JOBSAGE_TEST_LIVE=1` + key 才跑，默认 skip）。

## 真实推理实测（2026-08-27）

- ✅ **GLM 免费（ZHIPU_API_KEY + glm-4-flash）evaluate→draft 端到端通过**（37.7s）。
  命令：`JOBSAGE_TEST_LIVE=1 JOBSAGE_LIVE_MODEL=glm-4-flash pnpm exec vitest run packages/engine/test/e2e/live-provider.test.ts`
  （key 从 `~/.config/luma-mcp/env` 加载，未落盘/未入库。）
- 备选免费源：SenseNova `SENSENOVA_API_KEY`（Windows env，deepseek-v4-flash，token.sensenova.cn）——已确认存在，未在本会话实测。

## 已知限速

- GLM/SenseNova 免费端点 ~1 req/5-10s，429 正常；真实联调需耐心/重试。

## 阻塞点（已解除，保留记录）

- 真实推理端到端当时未实测，现已被上方 GLM 实测解除。若换 provider 仍需 key 时跑法：
  ```bash
  export DEEPSEEK_API_KEY=sk-...   # 或 DASHSCOPE_API_KEY / ZHIPU_API_KEY
  export JOBSAGE_TEST_LIVE=1
  pnpm --filter @jobsage/engine test -- live-provider
  # 或 CLI：
  jobsage evaluate --posting <id> --provider deepseek
  ```
  实测通过后，把结果补记到这里并把 goal 由 complete 复审为实测通过。

## 决策留痕（被排除方案）

- 每家专用 SDK 适配器 → 排除（多依赖/重复）；统一 OpenAI 兼容适配器。
- Anthropic Messages 兼容层接境内模型 → 排除（多数不兼容，BYOK 灵活度差）。
- 密钥落配置文件 → 排除（宪法 III，只从 env 读）。
