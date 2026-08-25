# Contract: CLI 命令面与 JSON 信封（001-engine-core）

**Stability**: schemaVersion = 1。破坏性变更必须递增并迁移本文档。

## 全局约定

- 二进制名：`jobsage`
- 输出双模式：人类可读（默认）与 `--json`（机器可读）
- **JSON 信封**（所有命令 `--json` 模式统一）：

```json
{
  "schemaVersion": 1,
  "ok": true,
  "data": { /* 命令专属 */ },
  "error": null
}
```

失败时 `"ok": false`，`"data": null`，`"error": { "code": "<机器码>", "message": "<人读信息>", "hint?": "<修复建议>" }`

## 退出码

| code | 含义 |
|---|---|
| 0 | 成功 |
| 1 | 用法错误（未知命令/参数） |
| 2 | 工作区/输入文件错误（找不到、格式非法） |
| 3 | 配置错误（密钥未配置、provider 不可用） |
| 4 | 引擎执行失败（LLM 校验失败重试后仍错、渲染失败） |
| 5 | 未捕获异常 |

## 命令

### `jobsage init [--file <profile.yaml|json>] [--workspace <dir>]`
交互式或从文件创建 CandidateProfile。
- data: `{ profileId, workspacePath, profileVersion }`

### `jobsage posting add --file <jd.txt> | --stdin`
录入职位描述（仅粘贴来源）。
- data: `{ postingId, extracted: { company?, roleTitle?, language }, keywordCount }`

### `jobsage evaluate --posting <postingId>`
五维匹配评估。
- data: `{ evaluationId, verdict, score, dimensions[5], strengthsCount, gapsCount }`
- error: code=3 当 provider 密钥缺失。

### `jobsage draft --evaluation <evaluationId>`
生成简历草稿 + 求职信草稿（含裁剪日志）。
- data: `{ draftSetId, resumePages(estimate), coverLetterWords, cutCount, disclosureEnabled }`

### `jobsage review --draft <draftSetId> [--revise]`
独立上下文评审；`--revise` 连续执行修订并产出终稿。
- data: `{ notesCount, revised: boolean, revisionId }`

### `jobsage export --draft <draftSetId> --format pdf --out <path>`
显式导出动作（唯一允许产生 PDF 文件的入口，写入审计记录）。
- data: `{ path, pages, bytes }`
- error: code=4 渲染器不可用（如缺 Chromium），此时提示可改用 HTML 导出。

### `jobsage show <entity-type> <id>` / `jobsage list <entity-type>`
查看实体（profile/posting/evaluation/draft）。只读。

## 合规断言（契约测试覆盖）

- 命令面中**不存在** send/submit/publish/apply-to-platform 类动词
- `export` 是唯一写工作区外文件的命令，且必须用户显式调用
