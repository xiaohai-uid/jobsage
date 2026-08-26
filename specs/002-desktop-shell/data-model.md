# Data Model: 002-desktop-shell

**Date**: 2026-08-25 | 前端/桌面本地状态模型（zod schema 为前端校验；P0 实体沿用 engine）

## AppSettings（本地应用配置）

| 字段 | 类型 | 约束 |
|---|---|---|
| `workspacePath` | string | 绝对路径，默认 `~/.jobsage/workspace` |
| `provider` | `"auto" \| "mock" \| "claude-agent-sdk"` | 默认 auto |
| **不存** `apiKey` | — | 架构上不存在该字段（SC-3） |

## WorkspaceIndex（工作区目录索引）

| 字段 | 类型 |
|---|---|
| `profile?` | CandidateProfile（读 `profile/profile.json`） |
| `postings` | `[{ id, roleTitle?, language, createdAt }]` |
| `evaluations` | `[{ id, postingId, verdict, score, createdAt }]` |
| `applications` | `[{ id, evaluationId, reviewNotesCount, revisionHistoryCount, exports[] }]` |

## SidecarInvocation

| 字段 | 类型 | 约束 |
|---|---|---|
| `command` | string | 必须 ∈ 白名单前缀（见 contracts/sidecar-protocol.md） |
| `args` | string[] | 独立参数数组，不拼接 shell |
| `cwd` | string | workspacePath |
| `stdin?` | string | 仅 `posting add --stdin` |

## DraftEditorState

| 字段 | 类型 |
|---|---|
| `draftSetId` | string |
| `resumeMd` | string |
| `coverLetterMd` | string |
| `cutLog` | 来自 engine ApplicationDraftSet.resume.cutLog |
| `disclosure` | `{ enabled, text }` |
| `status` | 恒 `"draft"`（沿用 engine 类型，界面上不可改） |

## 状态转移（前端）

```
Idle → Running(command) → Success(result) | Error{code,message,hint}
DraftLoad → Edit(resumeMd|coverLetterMd) → Save(Persisted)
Settings → WorkspaceChanged → Reindex
```

- 同一时间只允许一个 Running 命令（FR-9 防重）
- 所有 SidecarInvocation 仅经 `commands.rs` 的 `run_jobsage` 白名单路由