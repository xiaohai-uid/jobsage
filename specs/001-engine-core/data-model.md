# Data Model: 001-engine-core

**Date**: 2026-08-25 | 引擎领域实体（zod schema 为单一事实源，本文档为人读对照）

## CandidateProfile（候选人档案）

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | `profile` 固定（单用户单档案） |
| `name` | string | 非空 |
| `contact` | `{ email, phone?, location? }` | email 格式校验 |
| `education` | `[{ institution, degree, field, start, end?, highlights[] }]` | start 必填；highlights 可为空数组 |
| `experiences` | `[{ org, title, start, end?, location?, bullets[] }]` | bullets 每条非空字符串；建议附量化证据 |
| `skills` | `string[]` | 去重 |
| `portfolioLinks` | `[{ label, url }]` | url 格式校验 |
| `writingStyleSample` | `string?` | 用户真实写作样本，供求职信语气对齐 |
| `behavioral` | `{ discType?, motivations[], workStyle? }?` | 可选（上游 02 号文件语义） |
| `locale` | `"en" \| "zh"` | 影响产物语言，默认 en |
| `version` | int | 每次编辑递增；evaluation/draft 记录所依据的版本 |

**不变式**：草稿中任何事实性陈述必须可追溯到本档案某字段（SC-3 事实保真的数据基础）。

## JobPosting（职位描述）

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | ULID |
| `source` | `"user-paste"` 固定 | P0 唯一合法来源 |
| `rawText` | string | 非空、全文逐字保存（评估与存档共用） |
| `extracted` | `{ company?, roleTitle?, department?, location?, deadline?, language }` | LLM 抽取 + zod 校验；language ∈ {en, zh, other} |
| `keywords` | `string[]` | 抽取的关键要求清单 |
| `createdAt` | ISO datetime | |

**安全不变式**：`rawText` 是数据不是指令——任何消费方不得执行其内容（R6 规则，测试断言）。

## FitEvaluation（匹配评估）

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | ULID |
| `postingId` | string | FK → JobPosting |
| `profileVersion` | int | 评估时的档案版本快照号 |
| `overall` | `{ verdict: "strong"\|"ok"\|"weak", score: 1..5 }` | verdict 与 score 一致性由规则约束 |
| `dimensions` | 5 项 `[{ name, score: 1..5, evidence }]` | 五维语义对齐上游 04 号文件；evidence 非空 |
| `strengths` | `string[]` | |
| `gaps` | `[{ item, honestMissing: true }]` | 只允许真实缺失；禁止"建议塞入"类内容 |
| `recommendation` | string | 行动建议 |
| `createdAt` | ISO datetime | |

## ApplicationDraftSet（申请草稿集）

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | ULID |
| `evaluationId` | string | FK → FitEvaluation |
| `status` | `"draft"` **常量** | 类型层面不存在其他取值（宪法 II） |
| `resume` | `{ contentMd, cutLog: [{ removedLine, reason, scoreBreakdown }] }` | cutLog 对齐上游相关性加权裁剪规则：`(JD相关性, 独特性, 是否被求职信引用)` 三因子 |
| `coverLetter` | `{ contentMd }` | 一页约定由模板渲染时校验 |
| `disclosure` | `{ enabled: boolean, text }` | FR-7 AI 协助声明；text 有默认文案可编辑 |
| `reviewNotes` | `[{ dimension, issue, suggestion, resolvedAt? }]` | Story 3 评审产出 |
| `revisionHistory` | `[{ at, summary, basedOnNotes: int }]` | 初稿→批评→终稿全程留痕 |
| `exports` | `[{ type: "pdf", path, exportedAt }]` | 仅记录显式导出动作（审计） |

## ProviderConfig（模型配置）

| 字段 | 类型 | 约束 |
|---|---|---|
| `providerId` | `"claude-agent-sdk" \| "mock" \| (未来扩展)` | 适配器注册表决定 |
| `model` | string | 如 `claude-*` |
| `apiKeyEnvVar` | string | **环境变量名而非密钥值**（宪法 III） |
| `baseUrl?` | string | 中国版境内端点预留 |

## 状态转移

```
JobPosting ──evaluate──▶ FitEvaluation ──draft──▶ ApplicationDraftSet(status=draft)
                              ▲                        │  │
                              │                        │  └─export(显式)──▶ exports[] 追加
                              └──────re-evaluate(新实体)─┘└─review/revise──▶ reviewNotes/revisionHistory 追加
```

- 实体一经创建不可变更，修订以追加方式留痕（审计需求）
- 删除只发生在用户显式清空工作区时（P0 不提供细粒度删除命令）

## 存储映射

见 research.md R7 工作区目录约定。每个实体 = 一个 JSON 文件 + 配套人类可读 Markdown。
