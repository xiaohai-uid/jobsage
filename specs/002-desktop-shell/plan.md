# Implementation Plan: Desktop Shell — Tauri 2 桌面应用（002-desktop-shell）

**Branch**: `002-desktop-shell` | **Date**: 2026-08-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-desktop-shell/spec.md`

## Summary

在 P0 引擎/CLI 之上封装 Tauri 2 桌面应用。前端 React + TypeScript + Vite；后端 Rust 通过**受管 sidecar**调用 `@jobsage/cli`（开发态 node，发布态 Bun 单文件编译），以 JSON 信封通信。用户界面提供工作区管理、档案导入、JD 粘贴评估、草稿双栏预览编辑、PDF/HTML 导出与设置页。引擎零改动；P1 只加壳。

## Technical Context

**Language/Version**: TypeScript 5.x（前端），Rust 1.98（Tauri 2.x），Node ≥20（CLI sidecar 开发态）

**Primary Dependencies**: `@tauri-apps/cli` + `@tauri-apps/api`；React 19；Vite 7；现有 `@jobsage/engine` + `@jobsage/cli` workspace 包

**Storage**: 本地文件系统工作区（沿用 P0 `~/.jobsage/workspace`）；Tauri 应用配置存 `app_config_dir`

**Testing**: 前端 vitest（reducer/命令 runner 正反用例）；Rust 命令 runner 单测（白名单注入）；P0 `pnpm test` 保持全绿

**Target Platform**: Linux (WSL dev) → AppImage/deb；Windows/macOS 后续

**Project Type**: desktop app（Tauri 2 + React）

**Performance Goals**: 本地命令响应 < 1s（mock）；UI 操作无感知卡顿

**Constraints**: 不持久化 API Key；sidecar 命令名白名单禁止任意 shell 拼接；不新增网络传输（模型推理仍走 engine 适配器白名单）；UI 无"发送/提交"按钮

**Scale/Scope**: 单用户本地；新增 `desktop/` 与 `sidecar/` 两个工作区目录；P0 63 测试保持绿

## Constitution Check

*GATE: Must pass before Phase 0 research.*

| Principle | Gate | Status |
|---|---|---|
| I Engine-First | 桌面是 CLI 的透明壳，不复制业务逻辑 | ✅ sidecar 只调 CLI |
| II Human-in-Command | UI 无发送动作；导出显式触发 | ✅ 规格 FR-5/SC-6 |
| III Local-First & BYOK | 数据留本地；Key 不持久化 | ✅ 规格 FR-8/SC-3 |
| IV Modular Monolith | 不引入服务层；只加 UI 壳与 sidecar 适配 | ✅ |
| V Test-First | 前端/命令 runner 测试先行 | ✅ 见 tasks |
| VI Upstream Fidelity | 不触碰 LICENSE/NOTICE | ✅ |
| VII Compliance | Key 不入库；无新网络边 | ✅ |
| VIII Simplicity | React + Vite + Tauri 官方模板最小骨架 | ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/002-desktop-shell/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
├── contracts/
│   ├── sidecar-protocol.md   # CLI 命令白名单 + JSON 信封
│   └── ui-state.md           # 前端状态模型
└── tasks.md
```

### Source Code (repository root)

```text
desktop/                        # Tauri 2 应用（Rust + Vite + React）
├── src-tauri/
│   ├── src/
│   │   ├── commands.rs        # Tauri commands: run_jobsage, get_settings, ...
│   │   └── sidecar.rs         # 子进程管理 + 白名单校验
│   ├── tauri.conf.json
│   └── Cargo.toml
├── src/                       # React 前端
│   ├── main.tsx
│   ├── App.tsx
│   ├── state/                 # useReducer + reducer 纯函数（可测）
│   ├── components/            # ProfileForm, JdEvaluator, DraftEditor, SettingsPage
│   └── commands.ts            # 封装 invoke("run_jobsage", ...)
├── package.json
└── test/
└── sidecar/                   # 发布用 Bun 编译产物（可选，开发直接用 node）
```

## Post-Design Constitution Re-check

- sidecar 命令白名单在 `sidecar.rs` 单测覆盖：非白名单命令/参数注入被拒（SC-2）✅
- settings 不持久化 key；schema 无 key 字段（SC-3）✅
- UI reducer 单测断言无 send/submit/apply-to-platform 动作（SC-6）✅

All gates: **PASS**