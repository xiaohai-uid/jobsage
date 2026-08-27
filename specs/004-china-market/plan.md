# Implementation Plan: 中国市场包 Overlay（004-china-market）

**Branch**: `004-china-market` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

## Summary

实现中国市场包薄覆层 `packages/engine/src/markets/china/`，提供：
1. 中文招聘平台 JD 结构化解析器（BOSS直聘/猎聘/51job/智联）
2. 本土化五维匹配评估 Prompt & Workflow
3. STAR 格式量化中文简历裁剪优化 Workflow
4. 本土化自荐信 + BOSS直聘/猎聘黄金 100 字直聊打招呼语生成器
5. HR + 技术面试官双角色评审与合规声明
6. 中文示例档案与真实 JD 样例数据集
7. CLI `--market china` 支持与桌面端中文联动

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I Engine-First | 市场包在 engine 内以独立模块存在，CLI/桌面透明调用 | ✅ |
| II Human-in-Command | 直聊话术纯本地生成，禁止自动发送，由用户手动复制 | ✅ |
| III Local-First & BYOK | 数据全本地，已跑通 DeepSeek/SenseNova/GLM 境内模型 | ✅ |
| IV Modular Monolith | Overlay 模式，不破坏上游核心，复用统一 Ports | ✅ |
| V Test-First | 单元测试 + 契约测试 + E2E 离线测试驱动开发 | ✅ |
| VI Upstream Fidelity | Thin Overlay 模式，完全保持与上游主干兼容 | ✅ |
| VII Compliance | 遵守 PIPL 与 AI 内容标识管理办法，无爬虫/无外传 | ✅ |
| VIII Simplicity | 结构清晰，零新增重依赖 | ✅ |
