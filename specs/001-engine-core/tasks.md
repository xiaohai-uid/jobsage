---
description: "Task list for 001-engine-core implementation"
---

# Tasks: Engine Core — P0 求职引擎与 CLI 验证

**Input**: Design documents from `/specs/001-engine-core/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Tests**: 宪法 Principle V 强制 TDD——每个实现任务前置红测试任务。

**Organization**: 按用户故事分组；US1 可独立交付 MVP。

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Monorepo（pnpm workspaces）：`packages/engine/src/**`、`packages/cli/src/**`、根级配置与分发合规文件。

---

## Phase 1: Setup（项目骨架）

- [ ] T001 建立 pnpm monorepo 根：`package.json`（private, engines.node>=20）、`pnpm-workspace.yaml`（packages/*）、`tsconfig.base.json`（strict、NodeNext）、`.gitignore`（node_modules/dist/.jobsage/）
- [ ] T002 [P] 创建 `packages/engine/package.json`（name @jobsage/engine, exports 指 dist）+ `tsconfig.json`（extends base, project reference）+ 占位 `src/index.ts`（export {}）
- [ ] T003 [P] 创建 `packages/cli/package.json`（name @jobsage/cli, bin: jobsage→dist/index.js, dependency @jobsage/engine workspace:*）+ `tsconfig.json` + 占位 `src/index.ts`
- [ ] T004 根级 `vitest.workspace.ts` 聚合两包；各包写首个冒烟测试（engine: index 导出非空；cli: 入口可 import）——先红后绿验证工具链
- [ ] T005 [P] 分发合规文件：根 `LICENSE`（MIT，保留 "Copyright (c) 2026 Mads Lorentzen" 原始版权行并追加 JobSage 行）+ 根 `NOTICE`（声明 derived from MadsLorentzen/ai-job-search，附上游仓库 URL）
- [ ] T006 `git init`（若未初始化）+ 首个提交（chore: bootstrap monorepo）

## Phase 2: Foundational（所有故事的阻塞前置）

- [ ] T007 [US-Foundation] 先写领域不变式测试 `packages/engine/test/unit/domain.test.ts`：status 只接受字面量 `"draft"`（构造其他值必须类型错误/zod 拒绝）、gaps 每项 honestMissing=true、profile.version 正整数——运行确认失败
- [ ] T008 实现 `packages/engine/src/domain/schemas.ts`：按 data-model.md 用 zod 定义 CandidateProfile / JobPosting / FitEvaluation / ApplicationDraftSet / ProviderConfig 及推断类型导出——使 T007 转绿
- [ ] T009 [P] 端口定义 `packages/engine/src/ports/index.ts`：LlmPort（generate/generateIsolated + jsonSchema 重试一次语义）、PdfRendererPort、IdGeneratorPort、ClockPort、EngineDeps——严格对照 contracts/engine-api.md
- [ ] T010 [P] Mock 适配器 `packages/engine/src/adapters/mock.ts`：MockLlmAdapter（脚本化确定性响应、记录调用上下文次数供隔离断言）+ NullPdfAdapter（恒抛 RendererUnavailable）
- [ ] T011 端口契约测试 `packages/engine/test/contract/llm-port.contract.test.ts`：对 MockLlmAdapter 断言 generate 返回结构、jsonSchema 失败重试恰好一次、generateIsolated 无共享状态——先红后绿（对 mock 实现修正）
- [ ] T012 真实适配器 `packages/engine/src/adapters/claude-agent-sdk.ts`：ClaudeAgentSdkLlmAdapter 包装 @anthropic-ai/claude-agent-sdk query()；密钥经 ProviderConfig.apiKeyEnvVar 引用的环境变量读取；同文件附环境门控契约测试（无密钥时 skip）
- [ ] T013 [P] 渲染装配层 `packages/engine/src/render/templates.ts`：A4 简历与一页求职信的 HTML/CSS 模板函数 + 单测 `test/unit/render.test.ts`（联系方式以文本节点存在、模板含披露声明插槽）
- [ ] T014 CLI IO 层 `packages/cli/src/io.ts`：JSON 信封输出（schemaVersion/ok/data/error）+ 退出码表（0/1/2/3/4/5）+ 单测 `packages/cli/test/io.test.ts`
- [ ] T015 工作区层 `packages/cli/src/workspace.ts`：research.md R7 目录约定的读写（profile/ postings/ evaluations/ applications/ exports/ jobsage.log 追加式审计日志）+ 单测覆盖各实体往返与日志追加

**Checkpoint**: `pnpm build && pnpm test` 全绿——此时引擎尚无业务工作流，但地基可测。

## Phase 3: User Story 1 - 求职者从零到第一份岗位评估报告 (Priority: P1) 🎯 MVP

**Story Goal**: 档案 + 粘贴 JD → 五维匹配评估报告（verdict/score/dimensions/strengths/gaps）
**Independent Test**: 样例档案+样例 JD → `jobsage evaluate` 产出含四要素报告文件；不匹配 JD 得 weak 低分

- [ ] T016 [US1] 先写测试 `packages/engine/test/unit/prompts-evaluate.test.ts`：断言 evaluate 提示词载体包含五维名称、"不可信数据"定界声明、禁止虚构指令——确认失败
- [ ] T017 [US1] 实现 `packages/engine/src/workflows/prompts/evaluate.ts`（语义移植上游 04-job-evaluation.md，映射表见 research.md R6）——使 T016 绿
- [ ] T018 [US1] 先写测试 `packages/engine/test/unit/workflow-evaluate.test.ts`（mock LlmPort）：evaluateFit 返回通过 zod 校验的 FitEvaluation、记录 profileVersion、dimensions.length===5——确认失败
- [ ] T019 [US1] 实现 `packages/engine/src/workflows/evaluate.ts`：组装提示词（profile 数据区+posting 不可信数据区）→ llm.generate(jsonSchema=FitEvaluation) → 校验返回——使 T018 绿
- [ ] T020 [US1] CLI `init` 命令 `packages/cli/src/commands/init.ts`：交互式或 --file 读入 YAML/JSON 档案 → 写 workspace/profile/profile.json；新增样例 `examples/profile-sample.yaml`；接线 commander
- [ ] T021 [US1] CLI `posting add` 命令：--file/--stdin 全文逐字保存 raw.txt + posting.json（source 固定 user-paste）；新增样例 `examples/jd-sample.txt`
- [ ] T022 [US1] CLI `evaluate` 命令：读档案+posting → engine.evaluateFit → 落盘 evaluations/<id>/；provider 密钥缺失时退出码 3 且 error.hint 给出配置指引（测试覆盖该路径）

**✓ Story 1 完成即可独立演示 MVP**：离线 mock 下全链路可用。

## Phase 4: User Story 2 - 一键生成定制简历与求职信草稿 (Priority: P1)

**Story Goal**: 评估 → 相关性加权裁剪的简历草稿 + 求职信草稿（事实可溯源、带披露声明）
**Independent Test**: 同档案两个 JD 两套草稿重点不同；每条 bullet 有可解析 sourceRef

- [ ] T023 [US2] 先写纯逻辑测试 `packages/engine/test/unit/cut-score.test.ts`：裁剪三因子评分（JD相关性、独特性、是否被求职信引用）的打分与排序边界用例——确认失败
- [ ] T024 [US2] 实现 `packages/engine/src/domain/cut-score.ts` 使 T023 绿（规则注释标注上游 05 号文件出处）
- [ ] T025 [US2] 提示词载体 `workflows/prompts/draft-resume.ts` + `draft-cover.ts`（移植上游 05/06 号文件的裁剪与面向未来框架规则；LaTeX 指令替换为 HTML 模板约定并在文件头注明差异）+ 测试断言关键规则文本存在
- [ ] T026 [US2] 先写测试 `test/unit/workflow-draft.test.ts`（mock）：draftApplication 产出的 resume.contentMd 中每条 bullet 带 sourceRef、cutLog 与被裁条目一致、disclosure 默认文案存在、status==="draft"——确认失败
- [ ] T027 [US2] 实现 `packages/engine/src/workflows/draft.ts` 使 T026 绿；ProfileVersionMismatch 抛错路径一并覆盖
- [ ] T028 [US2] 离线端到端测试 `packages/engine/test/e2e/us2-chain.test.ts`：fixtures 走 evaluate→draft 全链（mock），SC-3 自动化断言：程序化解析每条 sourceRef 在 profile 中可解析命中
- [ ] T029 [US2] CLI `draft` 命令：落盘 applications/<id>/（draft-set.json + resume.md + cover-letter.md）

## Phase 5: User Story 3 - 双角色评审修订流水线 (Priority: P2)

**Story Goal**: 独立上下文评审初稿 → 结构化批评 → 修订终稿，全程留痕
**Independent Test**: 对同一初稿跑 review --revise，reviewNotes 非空且 revisionHistory 增加；终稿相对初稿有可见修订说明

- [ ] T030 [US3] 提示词载体 `workflows/prompts/review.ts`（移植上游 apply.md 评审者步骤：内联草稿、按维度批评；**记录差异**：P0 评审不含实时公司网络调研，仅基于 posting+profile，差异写入 research.md R6 表）
- [ ] T031 [US3] 契约测试补充：MockLlmAdapter.generateIsolated 的上下文隔离断言（两次 isolated 调用上下文计数独立递增）
- [ ] T032 [US3] 先写测试 `test/unit/workflow-review.test.ts`（mock）：reviewAndRevise(review-and-revise) 后 reviewNotes[].resolvedAt 已填或显式保留标记、revisionHistory.length===1 且 basedOnNotes===notes 数——确认失败
- [ ] T033 [US3] 实现 `packages/engine/src/workflows/review-revise.ts`（评审走 generateIsolated）使 T032 绿
- [ ] T034 [US3] CLI `review [--revise]` 命令 + 落盘更新 draft-set.json

## Phase 6: User Story 4 - PDF 导出 (Priority: P2)

**Story Goal**: 显式导出排版稳定、ATS 文本层干净的 PDF，留痕
**Independent Test**: 导出的 PDF 文本提取含姓名+邮箱字面文本

- [ ] T035 [US4] Playwright 适配器 `packages/engine/src/adapters/playwright-pdf.ts`：html+css→A4 PDF Uint8Array；契约测试环境门控（无 Chromium 时 skip 并输出安装指引）
- [ ] T036 [US4] engine `renderPdf` 组装（templates.ts 渲染 HTML → pdfRenderer.render）；NullPdfAdapter 路径抛 RendererUnavailable 的错误映射测试
- [ ] T037 [US4] CLI `export --format pdf|html --out <path>`：唯一外写命令；成功后向 draft-set.exports 追加审计记录；渲染器不可用时退出码 4 + hint 改用 html（用 NullPdfAdapter 注入测试）
- [ ] T038 [US4] ATS 冒烟集成测试（playwright 门控）：renderPdf 产物经 pdftotext（若系统有）或 pdf 解析库断言姓名/邮箱存在于文本层

## Phase 7: Polish & Cross-Cutting

- [ ] T039 合规自检脚本 `tools/compliance-check.mjs`：扫描 engine src 无传输类 import（fetch/axios/undici/node-fetch/smtp等）、status 字面量断言、NOTICE/LICENSE 存在性；接入根 `package.json` scripts.check；单测其正反用例
- [ ] T040 CI `.github/workflows/ci.yml`：pnpm install → build → test（离线 mock）→ check（合规脚本）；不注入任何真实密钥
- [ ] T041 README Quickstart 章节：镜像 specs/001-engine-core/quickstart.md 场景 A–C 的用户视角精简版 + BYOK 配置说明
- [ ] T042 执行 quickstart.md 场景 A–D 全量人工验收：修复发现的缺口；把场景计时结果（SC-1/SC-2）记入 `specs/001-engine-core/implementation-notes.md`
- [ ] T043 收尾提交：`feat(engine): p0 job-search engine core with cli validation` + 打标签 `v0.1.0-p0`

---

## Dependency Graph

```text
Phase 1 (T001-T006)
   └─▶ Phase 2 (T007-T015)  ←—— 阻塞一切故事
          ├─▶ Phase 3 US1 (T016-T022) 🎯 MVP
          │      └─▶ Phase 4 US2 (T023-T029)
          │             ├─▶ Phase 5 US3 (T030-T034)
          │             └─▶ Phase 6 US4 (T035-T038)
          └─▶ Phase 7 Polish (T039-T041 可提前并行；T042-T043 收尾依赖全部故事)
```

故事完成顺序：US1 → US2 → (US3 ∥ US4) → Polish。

## Parallel Opportunities

- Phase 1：T002/T003/T005 三任务互不相交可并行
- Phase 2：T009/T010/T013 并行（不同文件域：ports/adapters/render）
- US3 与 US4 整段可并行（分别只触达 workflows/review-revise 与 render/adapters+export 命令面）
- 所有 [P] 标记任务在各自阶段内可并行

## Implementation Strategy

- **MVP = Phase 1+2+3（US1）**：完成后即具备"档案→评估"的可演示价值
- 每个任务严格红→绿；契约测试是端口演进的护栏
- mock 优先：全部编排逻辑在离线世界完成并锁死，真实适配器只是最后一个插头
