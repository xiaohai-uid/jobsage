---
description: "Task list for 002-desktop-shell implementation"
---

# Tasks: Desktop Shell — Tauri 2 桌面应用（002-desktop-shell）

**Input**: Design documents from `/specs/002-desktop-shell/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Tests**: 宪法 Principle V 强制 TDD；前端/命令 runner 测试先行。

## 路径约定

`desktop/`（Tauri 应用）与 `desktop/src-tauri/`（Rust）；根 `pnpm-workspace.yaml` 需加入 `desktop`（或独立包）。

---

## Phase 1: Setup（桌面工程骨架）

- [ ] T001 更新根 `pnpm-workspace.yaml` 加入 `desktop`；`desktop/package.json`（name @jobsage/desktop, private, scripts: dev/test/build; deps: @tauri-apps/api, react, react-dom; devDeps: @tauri-apps/cli, vite, @vitejs/plugin-react, typescript, vitest, @types/react, @testing-library/react）
- [ ] T002 初始化 Tauri 2 React-TS 最小骨架：`desktop/src-tauri/Cargo.toml`（tauri 2.x）、`tauri.conf.json`（identifier com.jobsage.desktop, productName JobSage）、`desktop/src/main.tsx` + `App.tsx` 占位；确保 `pnpm tauri dev` 可编译（Rust + Vite）
- [ ] T003 先写 Rust 测试 `desktop/src-tauri/src/sidecar.test.rs`：白名单命令接受/拒绝、shell 注入参数作为独立数组、stdin 仅限 posting add、超时/输出上限——红
- [ ] T004 实现 `desktop/src-tauri/src/sidecar.rs`：`run_jobsage(command: Vec<String>, cwd, stdin?) -> Result<JsonEnvelope, String>`；白名单前缀校验；进程超时 60s；输出 1MB 截断——绿
- [ ] T005 实现 Tauri commands `desktop/src-tauri/src/commands.rs`：`run_jobsage`（委托 sidecar）、`get_settings`、`save_settings`；在 `lib.rs`/`main.rs` 注册——先写 Rust 契约测试再实现
- [ ] T006 前端状态 reducer `desktop/src/state/appReducer.ts` + 先写测试 `desktop/test/state/appReducer.test.ts`：`command.started` 拒绝并发、`command.succeeded/failed`、`draft.edited/saved`——红后绿

## Phase 2: US1 - 工作区与档案（P1）

- [ ] T010 前端 `desktop/src/components/WorkspaceSetup.tsx`：首次启动选择/创建工作区目录（Tauri dialog+filedir插件）→ 调 `save_settings` → 索引工作区
- [ ] T011 前端 `desktop/src/components/ProfileForm.tsx`：文件选择器导入 YAML/JSON + 手工表单（姓名/邮箱/经历列表/技能）；导入校验 CandidateProfileSchema（前端轻量 zod 复用 engine 类型）
- [ ] T012 `desktop/src/commands.ts` 封装 `invoke("run_jobsage", ["init","--file",tmpPath,"--workspace",ws,"--json"])` → 解析信封 → 触发 reducer
- [ ] T013 单测：ProfileForm validator 正反用例（合法档案通过、缺邮箱/空技能拒绝）；WorkspaceSetup 目录选择成功/取消路径

**US1 完成判据**：GUI 里导入样例档案 → 侧栏显示档案名/版本；工作区出现 profile.json。

## Phase 3: US2 - JD 评估（P1）

- [ ] T020 前端 `desktop/src/components/JdEvaluator.tsx`：JD 大文本框 + 评估按钮（pending 禁用）+ `invoke("run_jobsage",["posting","add","--stdin",...,"evaluate","--posting",...])`（posting 经 stdin 写入）
- [ ] T021 结果展示 `desktop/src/components/EvaluationResult.tsx`：verdict badge、五维卡片、strengths/gaps、recommendation；错误视图显示 error.hint
- [ ] T022 reducer 扩展 `command.started/succeeded/failed` 接线；测试覆盖评估成功、失败(exit 3/4)两种 UI 状态

**US2 完成判据**：粘贴 JD → mock 评估 → 五维结果渲染；无终端。

## Phase 4: US3 - 草稿生成与编辑（P1）

- [ ] T030 前端 `desktop/src/components/DraftPanel.tsx`：从评估页"Generate drafts"→ 调 `draft` 命令 → 双栏 Markdown 预览（resume/cover）+ cutLog 列表 + disclosure 开关
- [ ] T031 编辑保存：文本域绑定 `draft.edited` reducer；"Save" 写回工作区 `applications/<id>/resume.md|cover-letter.md` 与 draft-set.json（前端直接写文件，经 Tauri fs 插件，不新增 CLI）
- [ ] T032 单测：reducer 编辑/保存流转；渲染断言无 "Send"/"Submit"/"发送" 按钮文案（SC-6）

**US3 完成判据**：生成草稿 → 编辑 → 保存；界面只有 DRAFT 无发送动作。

## Phase 5: US4 - 导出（P1）

- [ ] T040 前端 `desktop/src/components/ExportButton.tsx`：导出 HTML/PDF 按钮 → 保存对话框（Tauri dialog save）→ `invoke("run_jobsage",["export",...])` → 成功/失败状态
- [ ] T041 单测：ExportButton 命令构造正确（format/out/document）；失败提示含 fallback 建议

**US4 完成判据**：桌面导出 HTML/PDF 文件成功并显示路径；审计日志新增条目。

## Phase 6: US5 - 设置（P2 但 P1 收尾含）

- [ ] T050 `desktop/src/components/SettingsPage.tsx`：workspacePath 与 provider 选择；API Key 说明文案；`save_settings/get_settings` 持久化
- [ ] T051 单测：settings reducer 持久化往返；无 apiKey 字段（SC-3）

## Phase 7: Polish & Verification

- [ ] T060 `cd desktop && pnpm test` 全绿；根 `pnpm test`（P0 63）仍绿；`pnpm check` compliance OK
- [ ] T061 执行 `specs/002-desktop-shell/quickstart.md` 场景 A–D 手工验收并记录到 `implementation-notes.md`
- [ ] T062 发布构建：`cd desktop && pnpm tauri build`（Linux AppImage/deb）；若 Bun 可用，编译 sidecar 单文件并接入 bundle；否则记录已知限制
- [ ] T063 更新根 README 加 P1 桌面使用说明；提交并打标签 `v0.2.0-p1`

---

## Dependency Graph

```text
Phase 1 (T001-T006)   ← 阻塞一切
  ├─▶ Phase 3 US2 (T020-T022) ──┐
  ├─▶ Phase 2 US1 (T010-T013) ──┤
  │                             ▼
  │                     Phase 4 US3 (T030-T032)
  │                             │
  │                     Phase 5 US4 (T040-T041)
  └─▶ Phase 6 US5 (T050-T051) ─┤
                                ▼
                        Phase 7 Polish (T060-T063)
```

完成顺序：Setup → US1 → US3 → US4 → (US2 可与 US1 并行) → Settings → Polish。

## Parallel Opportunities

- Phase 1：Rust sidecar（T003-T005）与前端 reducer（T006）可并行
- Phase 2/3：US1 与 US2 可并行（不同组件，且 US2 需工作区存在但可在临时目录验证）
- Phase 5/6 可并行

## Implementation Strategy

- MVP = Setup + US1 + US2（能导入档案并在 GUI 看到评估结果）
- 前端只做壳：所有业务经由 sidecar CLI，不复制 engine 逻辑
- 安全优先：Rust 侧白名单注入测试先行于任何 UI