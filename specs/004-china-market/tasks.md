---
description: "Task list for 004-china-market implementation"
---

# Tasks: 中国市场包 Overlay（004-china-market）

**Prerequisites**: 001-engine-core ✅ | 002-desktop-shell ✅ | 003-llm-inference ✅

## Phase 1: 规范与领域数据结构 (T001-T004)
- [x] T001 建立中文市场包目录结构与类型定义：`packages/engine/src/markets/china/types.ts`
- [x] T002 实现中文合规声明常量与辅助函数：`packages/engine/src/markets/china/compliance.ts`
- [x] T003 编写中文平台 JD 提取器单元测试：`packages/engine/test/unit/markets/china/parser.test.ts`
- [x] T004 实现中文平台 JD 提取器：`packages/engine/src/markets/china/parser.ts`

## Phase 2: 本土化 Prompt 矩阵与工作流 (T010-T014)
- [x] T010 编写中文评估、简历重构、自荐信/直聊话术、评审 Prompt 模板：`packages/engine/src/markets/china/prompts/`
- [x] T011 编写中文直聊打招呼语生成与提取逻辑：`packages/engine/src/markets/china/greeting.ts`
- [x] T012 编写中文工作流单元测试：`packages/engine/test/unit/markets/china/workflows.test.ts`
- [x] T013 实现中文工作流适配器（evaluate, draft, review）：`packages/engine/src/markets/china/workflows.ts`
- [x] T014 在 `packages/engine/src/index.ts` 导出中文市场包 API

## Phase 3: 示例数据集与 CLI 集成 (T020-T023)
- [x] T020 添加中文示例候选人档案：`examples/profile-zh-sample.yaml`
- [x] T021 添加中文真实招聘平台 JD 样例：`examples/jd-boss-sample.txt`、`examples/jd-liepin-sample.txt`
- [x] T022 CLI 支持 `--market china` 及自动语系识别与直聊话术展示
- [x] T023 CLI 扩展测试：`packages/cli/test/commands.test.ts` 验证 `--market china` 完整流程

## Phase 4: 全量验证与交付 (T030-T032)
- [x] T030 全量自动化测试（Root Vitest + Desktop Vitest + Compliance Check + Build）
- [x] T031 真实境内模型（SenseNova / GLM）在线中文端到端实测验证
- [x] T032 更新 README.md 与 implementation-notes.md 记录完整成果
