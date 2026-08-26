# Contract: UI 状态模型（002-desktop-shell）

**Stability**: v1。前端 `useReducer` 状态树。

## 顶层状态

```ts
interface AppState {
  settings: AppSettings;                    // workspacePath, provider
  workspace: WorkspaceIndex;               // profile/postings/evaluations/applications
  screen: { kind: "profile" | "jd" | "draft" | "settings"; draftSetId?: string };
  pending: { command: string; startedAt: string } | null;   // FR-9 单命令
  lastResult: CommandResult | null;
}
```

## Reducer 动作

| action | payload | 约束 |
|---|---|---|
| `settings.loaded` | AppSettings | |
| `command.started` | { command: string } | pending 必须为 null，否则忽略 |
| `command.succeeded` | CommandResult | 置 lastResult；清 pending |
| `command.failed` | { code, message, hint } | 置 lastResult error；清 pending |
| `workspace.indexed` | WorkspaceIndex | |
| `draft.edited` | { field: "resume"\|"coverLetter"; content: string } | |
| `draft.saved` | DraftEditorState | |
| `export.done` | { path, format } | 写审计由 CLI 完成，UI 只展示 |

## 禁止动作（单测断言）

- reducer 不包含 `send` / `submit` / `apply-to-platform` 动作
- UI 渲染中不存在 "Send" / "Submit" / "发送" / "提交申请" 按钮（SC-6）