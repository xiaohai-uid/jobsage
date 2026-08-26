# Contract: Sidecar 协议（002-desktop-shell）

**Stability**: v1。桌面端只能通过这些命令与 engine 交互；命令集合是白名单。

## 进程模型

- Rust `sidecar.rs` 以 `std::process::Command` 派生 sidecar 可执行文件，参数数组独立传递，**不经过 shell**。
- 开发态二进制：`node` 运行 `../../packages/cli/dist/index.js`（由 Cargo 构建脚本注入路径）；发布态：`bun build --compile` 产物路径注入 Tauri bundle resource。
- 每个调用一次进程；stdout 必须是 P0 CLI 的 JSON 信封（`schemaVersion/ok/data/error`）。

## 命令白名单（前缀+固定子命令）

| 前缀 | 允许参数 | 说明 |
|---|---|---|
| `init` | `--file <path>`, `--workspace <dir>`, `--json` | GUI 先写临时 profile 文件 |
| `posting` | `add --file <path> \| --stdin`, `--workspace <dir>`, `--json` | JD 经文件或 stdin 传入 |
| `evaluate` | `--posting <id>`, `--workspace <dir>`, `--provider <auto\|mock\|claude-agent-sdk>`, `--json` | |
| `draft` | `--evaluation <id>`, `--workspace <dir>`, `--provider <...>`, `--json` | |
| `review` | `--draft <id>`, `[--revise]`, `--workspace <dir>`, `--provider <...>`, `--json` | |
| `export` | `--draft <id>`, `--format <pdf\|html>`, `--out <path>`, `[--document <resume\|cover-letter>]`, `--workspace <dir>`, `--json` | 唯一写外部文件的命令 |
| `show`/`list` | 只读展示（可选 P1），同 P0 契约 | |

## 安全断言（Rust 单测覆盖）

1. `run_jobsage("rm -rf /")` → 拒绝（非白名单前缀）
2. `run_jobsage(["posting","add","--file","$(rm -rf)"])` → 作为独立数组传给 spawn，不解释 shell 元字符
3. stdin 仅当命令为 `posting add --stdin` 时传递
4. 每次调用超时（默认 60s）与最大输出缓存（1MB）防护

## UI 状态契约

见 `contracts/ui-state.md`。前端 reducer 只接受 CommandResult 或 Error 两种命令完成信号。