# Research: 002-desktop-shell

**Date**: 2026-08-25 | **Status**: unknowns resolved

## R1. 桌面框架：Tauri 2

- **Decision**: Tauri 2 + React + TypeScript + Vite。
- **Rationale**: 宪法已定；本机 rust 1.98 + webkit2gtk-4.1/gtk3/librsvg 已具备，可即时 `cargo` 构建。体积/内存显著小于 Electron，符合 local-first。
- **Alternatives**: Electron（重、背离宪法）；纯 PWA（无法访问文件系统级导出与本地进程编排，后续再验证移动端）。
- **Implementation note**: 使用 Tauri 官方 `create-tauri-app` React-TS 模板作为骨架，再裁剪。

## R2. 引擎调用边界：CLI Sidecar

- **Decision**: Rust 后端通过 `CommandChild`/`TauriCommand` 派生进程运行 `@jobsage/cli`，以 JSON 行协议传递参数/stdin；**白名单命令表**在 Rust 侧硬编码。
- **Rationale**: P0 已把 CLI 定义为第一接口（宪法 I）；桌面只是壳，不允许复制业务逻辑。sidecar 保持 `node packages/cli/dist/index.js` 开发态；发布时用 `bun build --compile` 产出单文件可执行（若 Bun 不可用，则附带 Node 运行时或采用 `bun` 跳过——见 R4）。
- **Security invariant**: 命令名只能取 `["init","posting","evaluate","draft","review","export","show","list"]` 前缀之一；参数作为独立数组传给 `spawn`，绝不拼 shell 字符串；stdin 仅在 `posting add --stdin` 时使用（JD 文本）。SC-2 由 Rust 单测覆盖。

## R3. 前端状态：纯 reducer

- **Decision**: `useReducer` + 纯 reducer 存于 `desktop/src/state`，不经由 React state 直接散落。
- **Rationale**: 可测试性（vitest）；与 P0 TDD 纪律一致；暂无引入 Redux/Zustand 的必要（YAGNI）。

## R4. 发布打包

- **Decision**: dev 用 Node；发布首选 Bun 单文件编译 sidecar。
- **Rationale**: Bun (`bun build --compile`) 可将 CLI 打成单文件可执行，避免向用户分发 Node 运行时。若当前环境无 Bun，发布任务降级为「附 Node 运行时」并记录为已知限制；P1 Linux 安装包用 Tauri bundler（AppImage/deb）。
- **Need check**: 本机是否有 bun（实现阶段确认；缺则 `curl -fsSL bun.sh/install`）。

## R5. 密钥与设置

- **Decision**: `AppSettings` 只存 workspacePath + provider；API Key 读取自进程环境变量（由用户启动 shell 注入），UI 不提供密钥输入框，设置页放说明。
- **Rationale**: 宪法 III/BYOK；避免把 secrets 落盘/入 git。

## R6. 工作区与 P0 复用清单

- 复用 P0 命令无需改动：`init --file`、`posting add --file/--stdin`、`evaluate --posting`、`draft --evaluation`、`review --draft [--revise]`、`export --draft --format pdf|html --out`。
- 前端需要把用户 UI 表单转成 `profile.yaml`（或直接生成 JSON）供 `init --file` 使用；或复用 P0 的交互 init（不推荐，GUI 已覆盖）。
- 草稿编辑保存直接写工作区 `applications/<id>/resume.md` 与 `draft-set.json`（与 CLI 约定一致），不需要新 CLI 子命令。