# Feature Specification: Desktop Shell — Tauri 2 桌面应用（002-desktop-shell）

**Feature Branch**: `002-desktop-shell`

**Created**: 2026-08-25

**Status**: Draft

**Input**: 用户需求：在 P0 engine + CLI 之上封装 Tauri 2 桌面应用，让普通用户摆脱终端完成"档案→评估→草稿→导出 PDF"全流程。复用 `@jobsage/engine`（通过 CLI sidecar），不重写引擎。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 打开应用并导入/创建候选人档案 (Priority: P1)

用户在桌面应用中首次启动：选择或创建本地工作区，通过文件选择器导入已有的 `profile.yaml/json`，或通过表单逐项填写（姓名、邮箱、经历、技能）。应用把档案写到工作区 `profile/profile.json`，并在侧栏显示"档案已就绪"。

**Why this priority**: 档案是流水线的唯一事实源，没有档案后面所有步骤无意义。

**Independent Test**: 启动应用 → 导入 `examples/profile-sample.yaml` → 侧栏显示姓名与版本号；工作区出现 `profile/profile.json`。

**Acceptance Scenarios**:

1. **Given** 首次打开且无工作区, **When** 用户选择一个目录作为工作区, **Then** 应用初始化标准目录结构并显示引导
2. **Given** 已选择工作区, **When** 导入合法 YAML 档案, **Then** 档案被校验（CandidateProfileSchema）并写入 `profile/profile.json`，错误时显示可读错误而非崩溃
3. **Given** 档案版本非 1, **When** 保存表单, **Then** 版本递增并在界面展示

### User Story 2 - 粘贴 JD 并查看匹配评估 (Priority: P1)

用户把职位描述粘贴进大文本框，点击"评估"。应用调用 sidecar CLI `evaluate`，展示：总体建议（strong/ok/weak）、打分、五维卡片、优势/差距列表。全程无需终端。

**Why this priority**: "先筛后投"是产品价值的根；这是用户在桌面端第一次看到 AI 结果。

**Independent Test**: 粘贴 `examples/jd-sample.txt` → 点击评估 → 页面出现 verdict/score/五维卡片/差距列表；错误（如未配置密钥且非 mock）显示配置指引。

**Acceptance Scenarios**:

1. **Given** mock provider 已选, **When** 粘贴 JD 并评估, **Then** 显示五维评分与优势/差距，且无崩溃
2. **Given** 未配置 API Key 且 provider 非 mock, **When** 评估, **Then** 显示"需要 ANTHROPIC_API_KEY"与配置指引，退出码 3 被转换为界面提示
3. **Given** 评估进行中, **When** 用户重复点击, **Then** 按钮禁用防止并发重复任务

### User Story 3 - 生成并编辑草稿（简历 + 求职信） (Priority: P1)

评估完成后，用户点击"生成草稿"。应用调用 `draft` 显示简历/求职信 Markdown 预览、裁剪日志（cutLog）、AI 协助披露声明；用户可直接在文本域编辑草稿。

**Why this priority**: 这是核心产出物；可编辑性是"人审"体验的关键（宪法 II——用户始终在环）。

**Independent Test**: 评估完成后点击"生成草稿"→ 双栏预览（简历/求职信）与裁剪日志；编辑后点击"保存草稿"→ `draft-set.json` 更新。

**Acceptance Scenarios**:

1. **Given** 已有评估, **When** 生成草稿, **Then** 界面出现简历与求职信内容、AI 披露开关与文案、裁剪日志条目
2. **Given** 用户编辑简历文本, **When** 保存, **Then** 内容写回 `applications/<id>/resume.md` 与 `draft-set.json`
3. **Given** 草稿集 status, **When** 任何时候查看, **Then** 界面明确标注"DRAFT / 未发送"，且不存在"发送"按钮

### User Story 4 - 导出 PDF/HTML (Priority: P1)

用户点击"导出"，选择保存路径，应用调用 `export` 生成 PDF（或 HTML 兜底），随后在界面显示成功与文件路径。导出动作记录审计日志。

**Why this priority**: 最终交付物是文件；导出是显式用户动作（宪法 II）。

**Independent Test**: 导出 HTML 到临时目录 → 文件存在且含 `<!doctype html>`；若浏览器可用，导出 PDF → 文件 `%PDF` 开头；审计日志新增 export 条目。

**Acceptance Scenarios**:

1. **Given** 已有草稿, **When** 选择"导出 HTML", **Then** 保存对话框返回路径且文件写入成功，状态显示绿色对勾
2. **Given** Chromium 可用, **When** 选择"导出 PDF", **Then** 文件以 `%PDF` 开头写入成功，审计记录含字节数
3. **Given** 导出失败（如渲染器不可用）, **When** 用户点导出, **Then** 显示可读错误并建议改用 HTML

### User Story 5 - 设置：Provider 与密钥提示 (Priority: P2)

设置页允许选择 provider（mock / claude-agent-sdk）与工作区路径；API Key 仅提示用户从环境注入，应用不持久化密钥。

**Why this priority**: P1 可在默认环境变量下工作；设置页是可用性补全。

**Independent Test**: 切换 mock → 重启 → 仍是 mock（设置持久化）；界面出现"API Key 通过环境变量提供"说明，无密钥输入框。

**Acceptance Scenarios**:

1. **Given** 设置页, **When** 选择 mock 并保存, **Then** 重启后保持不变
2. **Given** 设置页, **When** 查看密钥说明, **Then** 页面明确写"密钥由环境变量提供，应用不保存"，且无明文密钥存储代码路径

## Requirements *(mandatory)*

### Functional Requirements

- **FR-1** 工作区管理：应用绑定一个本地工作区目录；首次启动引导创建；目录选择持久化在本地应用配置
- **FR-2** 档案导入/编辑：支持导入 YAML/JSON 档案与表单编辑；校验复用车/engine 的 CandidateProfileSchema
- **FR-3** JD 输入：大文本框粘贴职位描述；以 user-paste 写入 posting
- **FR-4** 流水线命令：通过受管 sidecar 调用 CLI 的 evaluate/draft/review/export，使用 JSON 信封解析结果；命令名白名单，禁止任意 shell 拼接
- **FR-5** 结果展示：评估摘要、五维卡片、优势/差距、草稿双栏预览、裁剪日志、披露声明开关
- **FR-6** 草稿编辑保存：用户可编辑简历/求职信 Markdown；保存写回工作区
- **FR-7** 导出：调用 export，PDF 优先、HTML 兜底；成功/失败状态与审计
- **FR-8** 设置：provider（mock/claude-agent-sdk）与工作区路径持久化；API Key 仅从环境变量读取，不持久化
- **FR-9** 异步与防重：命令运行中禁用相关按钮；错误以可读 UI 呈现（含 hint）
- **FR-10** 构建产物：`pnpm tauri dev` 可运行；`pnpm tauri build` 产出 Linux 安装包（AppImage/deb）

### Key Entities

- **AppSettings**: workspacePath, provider ("mock"|"claude-agent-sdk"|"auto")
- **WorkspaceState**: profile?/postings/evaluations/applications 的目录索引
- **CommandInvocation**: cliArgs[], cwd(workspace), env
- **CommandResult**: Envelope<unknown>（复用 P0 CLI JSON 信封）
- **DraftEditorState**: draftSetId, resumeMd, coverLetterMd, cutLog[], disclosure{enabled,text}

### Assumptions

- P1 开发环境为 WSL Ubuntu Linux；Windows/macOS 打包在后续版本
- sidecar 在开发态为 `node packages/cli/dist/index.js`，发布态为 Bun 单文件编译产物（若 Bun 不可用则用 Node 二进制打包）；sidecar 只是 CLI 的透明包装，不引入新业务逻辑
- 应用不实现登录/云同步/移动端；这些是后续 feature
- 前端技术栈：React + TypeScript + Vite（Tauri 2 官方推荐模版）——继承宪法 TypeScript 全栈约束
- UI 文案默认英文，中文市场 overlay 后续 feature

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-1** 不打开终端的情况下，新用户从导入档案到导出 PDF ≤ 10 分钟（演示路径）
- **SC-2** sidecar 调用全部通过 JSON 信封；命令参数白名单测试覆盖：非法命令/注入参数被拒绝
- **SC-3** 应用数据与密钥边界：代码审查/测试确认 API Key 不被持久化（仓库内无 `api_key` 存储代码；设置无密钥输入框）
- **SC-4** `pnpm tauri build` 在 Linux 产出可安装包（AppImage 或 deb）
- **SC-5** 现有 `pnpm test`（P0 63 项）保持绿色；新增桌面端单测覆盖命令 runner（正反用例）与工作区状态 reducer
- **SC-6** 草稿界面任何状态下不出现发送/提交按钮（可自动化断言 DOM 无这些文案）