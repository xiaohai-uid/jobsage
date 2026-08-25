# Implementation Plan: Engine Core — P0 求职引擎与 CLI 验证（001-engine-core）

**Branch**: `001-engine-core` | **Date**: 2026-08-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-engine-core/spec.md`

## Summary

把上游 ai-job-search 的核心求职工作流（候选人档案 → 五维匹配评估 → 相关性加权裁剪的简历草稿 + 求职信草稿 → drafter-reviewer 评审修订 → 导出）移植为 TypeScript 核心引擎库 `packages/engine`，以 `packages/cli` 作为第一接口做端到端验证。LLM 经 ProviderPort 接入（默认 Claude Agent SDK 适配器 + 离线 mock 适配器），简历渲染经 PdfRendererPort 接入（Playwright 打印 HTML/CSS 模板）。全程本地数据平面、产物恒为 draft、架构上无发送能力。

## Technical Context

**Language/Version**: TypeScript 5.x（strict），Node.js ≥ 20 LTS

**Primary Dependencies**: `@anthropic-ai/claude-agent-sdk` ^0.3.x（LLM 运行时，仅存在于 adapter 内）；`commander`（CLI）；`zod`（schema 校验与结构化输出解析）；`playwright`（PDF 渲染 adapter）；`vitest`（测试）

**Storage**: 本地文件系统工作区（`~/.jobsage/workspace/` 或项目内 `.jobsage/`）：Markdown/JSON 文件即数据库，无服务器、无 DB

**Testing**: vitest（单测 + 契约测试 + 离线端到端）；CI 全部走 mock provider

**Target Platform**: macOS / Linux / Windows（Node CLI；桌面壳在后续 feature）

**Project Type**: monorepo（library + cli）

**Performance Goals**: 三件套生成 ≤ 5 分钟（受模型延迟主导，非代码瓶颈）；评估报告 ≤ 60s

**Constraints**: 除用户配置的模型推理外零网络调用；离线可跑通全部测试；分发物含上游 LICENSE 版权行 + NOTICE

**Scale/Scope**: 单用户本机；~2 个包；上游 ~1,800 行提示词语义移植

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I Engine-First | 引擎为独立包可无 UI 测试；CLI 为第一接口 | ✅ 结构含 packages/engine + packages/cli |
| II Human-in-Command | 架构无 send/submit 路径；产物恒 draft；导出显式触发 | ✅ FR-8/SC-4 对应；engine 无任何传输依赖 |
| III Local-First & BYOK | 数据只落本机文件；密钥经环境变量引用（不存明文） | ✅ ProviderConfig 只存环境变量名 |
| IV Modular Monolith + Ports | 单运行时；LlmPort / PdfRendererPort 显式端口；domain 纯净可离线测 | ✅ 见 Project Structure |
| V Test-First | 任务拆解必须 test-first 排序 | ✅ 传递给 /speckit-tasks 的硬约束 |
| VI Upstream Fidelity | LICENSE 保留 + NOTICE 文件任务化；提示词语义映射表维护于 research.md | ✅ |
| VII Compliance by Design | P0 仅粘贴式 JD 录入（无抓取）；AI 披露声明内置 | ✅ 无任何爬虫依赖 |
| VIII Simplicity | 无 DB、无 monorepo 重型工具、无超前抽象 | ✅ pnpm workspaces + tsc |

## Project Structure

### Documentation (this feature)

```text
specs/001-engine-core/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/requirements.md
├── contracts/           # Phase 1 output
│   ├── cli-schema.md    # CLI 命令面 + JSON 信封 + 退出码
│   └── engine-api.md    # 引擎公共 API 与端口契约
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/
├── engine/                      # 核心域库（无 UI、无 IO 假设）
│   ├── src/
│   │   ├── domain/              # 纯类型与实体：profile / posting / evaluation / draft-set
│   │   ├── ports/               # LlmPort、PdfRendererPort、IdGeneratorPort、ClockPort
│   │   ├── ports/…adapters      # claude-agent-sdk 适配器、mock 适配器、playwright 渲染适配器
│   │   ├── workflows/           # evaluate / draft / review-revise 编排（移植自上游）
│   │   │   └── prompts/         # 上游提示词的结构化 TS 载体（语义映射见 research.md）
│   │   ├── render/              # markdown → HTML 模板装配（简历/求职信/披露声明）
│   │   └── index.ts             # 公共 API（唯一出口，见 contracts/engine-api.md）
│   └── test/
│       ├── unit/                # 领域逻辑（离线）
│       ├── contract/            # 每个端口适配器的契约测试
│       └── e2e/                 # mock provider 全流程
└── cli/
    └── src/
        ├── index.ts             # commander 入口：init/evaluate/draft/review/export
        ├── io.ts                # JSON 信封输出、退出码
        └── workspace.ts         # 工作区文件读写（engine 之外的壳层职责）

# 分发合规
NOTICE                           # 署名 derived from MadsLorentzen/ai-job-search (MIT)
LICENSE                          # MIT（保留上游版权行）
```

**Scope guard**: `07-interview-prep.md`、`08-application-forms.md` 不进入 P0（后续 feature）；`09-web-research.md` 的 URL 抓取升级链不进入 P0（仅粘贴录入）。

## Post-Design Constitution Re-check

Phase 1 设计后复核：

- II 复核：`contracts/engine-api.md` 公共 API 中不存在任何 submit/send/publish 方法；export 动作由 CLI 层触发并写审计记录 ✅
- III 复核：数据模型全部落盘路径位于本机工作区；ProviderConfig.apiKeyEnv 为变量名引用 ✅
- VI 复核：NOTICE/LICENSE 进入仓库根与构建产物清单（tasks 落实）✅
- VIII 复核：新增依赖合计 5 个运行时依赖，每个有 research.md 决策记录 ✅

All gates: **PASS**
