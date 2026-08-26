# Implementation Plan: 真实 LLM 推理联调 BYOK（003-llm-inference）

**Branch**: `003-llm-inference` | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-llm-inference/spec.md`

## Summary

为 engine 增加真实 LLM 推理：新增 **OpenAI 兼容适配器**支持境内模型（DeepSeek/Qwen/GLM），保留 Claude Agent SDK 双轨；结构化输出走 `response_format json_object` + zod 校验 + 重试一次；ProviderConfig 枚举扩展；桌面 provider 下拉加入境内选项、密钥从环境变量读取不落盘。全部真实推理为 env-gated（有 key 实测，无 key 交付规格+测试并标阻塞点）。

## Technical Context

**Language/Version**: TypeScript 5.x（engine），Rust 1.98（桌面仅透传 provider 字符串，无改动）

**Primary Dependencies**: 新增 `undici` 或直接用 Node 内置 `fetch`（Node ≥20 全局 fetch）——**用内置 fetch**（零新依赖，符合宪法 VIII）；现有 `zod`、`@anthropic-ai/claude-agent-sdk`

**Storage**: 无新存储；密钥只从环境变量读，不落盘

**Testing**: vitest（离线契约 + env-gated 真实）；Rust 桌面不动

**Target Platform**: 桌面 Windows + CLI（与 P0/P1 一致）

**Project Type**: engine 库扩展（adapter）+ 配置枚举 + 桌面 UI provider 项

**Performance Goals**: 评估 ≤ 60s（模型延迟主导）；结构化失败重试一次

**Constraints**: 新增适配器文件进 compliance NETWORK_WHITELIST；无其他网络边；密钥不落盘；离线测试保持绿

**Scale/Scope**: engine `adapters/` 新增 1 个适配器 + ProviderConfig 扩展；desktop 类型/文案微调

## Constitution Check

*GATE: Must pass before Phase 0 research.*

| Principle | Gate | Status |
|---|---|---|
| IV Modular Monolith + Ports | 境内适配器实现 LlmPort，不碰领域层 | ✅ |
| III Local-First & BYOK | 密钥只从 env 读，不落盘 | ✅ FR-4/SC-4 |
| VII Compliance | 境内模型（PIPL 合规）；适配器进白名单；无新网络边 | ✅ FR-7 |
| V Test-First | env-gated 真实测试 + 离线契约测试 | ✅ FR-8 |
| VIII Simplicity | 用 Node 内置 fetch，零新运行时依赖 | ✅ |

## Project Structure

```text
packages/engine/src/
├── ports/index.ts                     # LlmPort 不变
├── adapters/
│   ├── openai-compatible.ts           # 新增：DeepSeek/Qwen/GLM 通用适配器（fetch + response_format）
│   ├── claude-agent-sdk.ts            # 保留
│   └── mock.ts                        # 保留
├── domain/schemas.ts                  # ProviderConfigSchema.providerId 枚举扩展
└── index.ts                           # 导出新适配器
packages/engine/src/adapters/providers.ts   # 境内 provider 注册表（baseURL/model/envVar）
desktop/src/components/types.ts        # ProviderId + ProviderDesc 扩展
desktop/src/components/views/SettingsView.tsx  # 下拉项 + 密钥说明文案
tools/compliance-check.mjs             # NETWORK_WHITELIST 增加 openai-compatible.ts
```

## Post-Design Constitution Re-check

- 境内适配器仅经 LlmPort 注入，领域层零改动 ✅
- fetch 只在白名单适配器内使用，compliance 扫描放行 ✅
- ProviderConfig 不存 key 值，只存 apiKeyEnvVar 名 ✅

All gates: **PASS**