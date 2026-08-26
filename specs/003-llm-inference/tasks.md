---
description: "Task list for 003-llm-inference implementation"
---

# Tasks: 真实 LLM 推理联调 BYOK（003-llm-inference）

**Input**: Design documents from `/specs/003-llm-inference/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅

**Tests**: 宪法 V 强制 TDD；env-gated 真实测试默认 skip，离线契约测试必须绿。

## 路径约定

`packages/engine/src/**`、`desktop/src/**`、`tools/compliance-check.mjs`。

---

## Phase 1: Engine 适配器与注册表

- [x] T001 先写测试 `packages/engine/test/unit/providers.test.ts`：`resolveProvider("deepseek")` 返回 baseURL/model/envVar 三元组正确；未知 provider 抛错——红
- [x] T002 实现 `packages/engine/src/adapters/providers.ts`：境内注册表 + `resolveProvider`——绿
- [x] T003 先写契约测试 `packages/engine/test/contract/openai-compatible.contract.test.ts`：用 `MockFetch`（注入可控 fetch）断言 `generate` 发送 `response_format json_object`、带 Authorization Bearer（env 读取）、解析 `choices[0].message.content`、超时错误映射——红
- [x] T004 实现 `packages/engine/src/adapters/openai-compatible.ts`（`OpenAiCompatibleLlmAdapter implements LlmPort`，用全局 fetch；generate/generateIsolated 同源隔离）——绿
- [x] T005 `ProviderConfigSchema.providerId` 枚举扩展 `deepseek|qwen|glm`（`packages/engine/src/domain/schemas.ts`）+ 单测：新枚举合法值通过、未知拒绝
- [x] T006 `packages/engine/src/index.ts` 导出新适配器与 `resolveProvider`；冒烟测试引用不抛错

## Phase 2: workflow 结构化输出强化（境内 provider 路径）

- [x] T007 复用 P0 `evaluate.ts`/`draft.ts` 的 zod retry——验证对 `OpenAiCompatibleLlmAdapter` 注入 MockFetch 走通 evaluate→draft（离线，bad JSON 重试一次）；缺省绿
- [x] T008 env-gated 真实测试 `packages/engine/test/e2e/live-provider.test.ts`：`JOBSAGE_TEST_LIVE=1` 且对应 key 存在时，对 deepseek 跑 evaluate+draft 端到端断言 zod 通过；否则 skip（`describe.skipIf`）

## Phase 3: CLI 透传与错误提示

- [x] T010 CLI 无改动（`--provider` 已是任意字符串），补测试：`evaluate --provider deepseek` 且未设 key → exit 3 且 error.hint 含 `DEEPSEEK_API_KEY`（`packages/cli/test/commands.test.ts` 扩展）
- [x] T011 `buildDeps` 支持 deepseek/qwen/glm：按 provider 构造对应适配器（`desktop/src/deps.ts` 或 cli 侧依赖注入）——先测试后实现

## Phase 4: 桌面端 provider 项

- [x] T020 `desktop/src/components/types.ts` `ProviderId` 加 `deepseek|qwen|glm`；`desktop/test` 补 ProviderId 合法性断言
- [x] T021 `desktop/src/components/views/SettingsView.tsx` 下拉加入境内项 + ProviderDesc 文案说明所需 env 变量；渲染测试（可选）
- [x] T022 复核 compliance：`tools/compliance-check.mjs` NETWORK_WHITELIST 增加 `openai-compatible.ts`；`pnpm check` 仍 compliance OK

## Phase 5: 验证与收尾

- [x] T030 全量测试：根 P0 63 + desktop 14 + Rust 5 保持绿；`pnpm check` OK
- [x] T031 有 key 时人工跑通 quickstart 真实推理场景；把结果写入 `specs/003-llm-inference/implementation-notes.md`；无 key 则记录为已知阻塞点
- [x] T032 更新根 README 的 BYOK 说明（境内 provider + env 变量表）；提交与标签须经项目主确认（铁律4）

---

## Dependency Graph

```text
Phase 1 (T001-T006)   ← 阻塞一切
  ├─▶ Phase 2 (T007-T008)
  │       └─▶ Phase 3 (T010-T011)
  ├─▶ Phase 4 (T020-T022)
  └─▶ Phase 5 (T030-T032)
```

## Parallel Opportunities

- Phase 1 中 T001/T002 与 T003/T004 可并行（providers.ts 与 openai-compatible.ts 相互独立；T005 schema 独立）
- Phase 4 桌面项与 Phase 3 CLI 透传可并行

## Implementation Strategy

- MVP = Phase 1 + 3（真实 provider 能在 CLI 跑通评估/草稿）
- 一切真实推理 env-gated；离线全绿是硬门槛
- 密钥零落盘，合规扫描兜底
