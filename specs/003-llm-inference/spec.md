# Feature Specification: 真实 LLM 推理联调 BYOK（003-llm-inference）

**Feature Branch**: `003-llm-inference`

**Created**: 2026-08-26

**Status**: Draft

**Input**: 用户选定 P2 方向①：把桌面端与 engine 从 mock 切换到真实 LLM 推理。BYOK——用户自带密钥，境内模型（DeepSeek/Qwen/GLM，OpenAI 兼容）+ 保留 Claude Agent SDK 双轨；结构化输出经 zod 校验+重试一次；桌面 provider 可选、密钥从环境变量读取不落盘。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 用境内模型跑通真实评估与草稿 (Priority: P1)

用户在有 DeepSeek（或其他境内）API Key 的情况下，选择 provider=deepseek，粘贴 JD 后评估、生成草稿，全程走真实模型；输出的评估 JSON 通过 zod 校验进入 UI 五维卡片，草稿可编辑保存。

**Why this priority**: 真实推理是产品"能用"的地基；当前全 mock。

**Independent Test**: 设 `DEEPSEEK_API_KEY` 后，桌面选 provider=deepseek → Evaluate → 得到五维评估；CLI `jobsage evaluate --provider deepseek` 同样可用。

**Acceptance Scenarios**:

1. **Given** 已设 DEEPSEEK_API_KEY, **When** 粘贴 JD 并评估, **Then** 返回 schema 合法、五维齐全的评估结果
2. **Given** 未设对应 key, **When** 评估, **Then** 显示明确配置指引（缺哪个 env 变量），退出码 3，不崩溃
3. **Given** 模型输出非法 JSON 或 schema 不符, **When** 评估, **Then** 自动重试一次；仍失败则给出可读错误，不留半成品

### User Story 2 - 结构化输出与重试闭环 (Priority: P1)

所有 LLM 输出（评估、草稿 bullets、求职信、评审意见）都必须能被程序解析：OpenAI 兼容 provider 走 JSON mode/response_format，解析后 zod 校验，失败自动重试一次后硬报错（SchemaViolationError）。

**Why this priority**: 这是确定性核心与模型解耦的保障（宪法 IV）；坏输出静默会污染档案。

**Independent Test**: 对 mock/真实 provider 注入一次坏 JSON + 一次好 JSON，断言重试后成功；连续两次坏则抛 SchemaViolationError。

**Acceptance Scenarios**:

1. **Given** 首次输出坏 JSON, **When** 工作流调用, **Then** 重试一次，第二次合法则成功
2. **Given** 两次都坏, **When** 调用, **Then** 抛 SchemaViolationError，工作流不写半成品
3. **Given** OpenAI 兼容 provider, **When** 请求结构化, **Then** 使用 response_format json_object（或等效）以提升符合率

### User Story 3 - Claude Agent SDK 保留双轨 (Priority: P2)

保留现有 ClaudeAgentSdkLlmAdapter；用户可切 provider=claude-agent-sdk 用 Claude。两条轨道都满足 LlmPort 契约。

**Why this priority**: 海外/偏好 Claude 用户；不破坏已有实现。

**Independent Test**: provider=claude-agent-sdk 在设 ANTHROPIC_API_KEY 时跑通（env-gated）。

### User Story 4 - 桌面端 provider 可选 + 密钥提示 (Priority: P2)

设置页 provider 下拉加入 deepseek/qwen/glm/claude-agent-sdk/mock；密钥一律从环境变量读取，界面只显示"该 provider 需要哪个环境变量"的说明，不提供密钥输入框（宪法 III）。

**Why this priority**: 桌面端是用户入口；不落盘密钥是合规底线。

**Independent Test**: 设置页选 deepseek 并保存 → 重启后仍为 deepseek；界面出现 `DEEPSEEK_API_KEY` 说明文字，代码中无密钥存储路径。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-1** LlmPort 新增 OpenAI 兼容适配器，支持 DeepSeek/Qwen/GLM（baseURL/模型可配置）；各自密钥从 `DEEPSEEK_API_KEY`/`DASHSCOPE_API_KEY`/`ZHIPU_API_KEY` 环境变量读取
- **FR-2** 结构化输出：OpenAI 兼容 provider 使用 `response_format: {type: "json_object"}`；解析 + zod 校验 + 重试一次，连续失败抛 SchemaViolationError（复用 engine 现有 retry 逻辑）
- **FR-3** `ProviderConfigSchema.providerId` 枚举扩展为 `deepseek | qwen | glm | claude-agent-sdk | mock`；`baseUrl`/`model` 可配置
- **FR-4** 密钥仅从环境变量读取（apiKeyEnvVar 存变量名），不进任何配置文件/不落盘（SC-4）
- **FR-5** 桌面端 `desktop/src/components/types.ts` 的 `ProviderId` 增加 deepseek/qwen/glm；SettingsView 下拉同步；ProviderDesc 文案说明所需 env 变量
- **FR-6** 失败路径：缺 key → 可读错误含缺失变量名 + hint，CLI exit 3；网络/超时/限流 → 可读错误，不崩溃
- **FR-7** compliance：新增境内适配器文件加入 `tools/compliance-check.mjs` 的 NETWORK_WHITELIST；无其他新增网络边
- **FR-8** env-gated 测试：`JOBSAGE_TEST_LIVE=1` 且对应 key 存在时跑真实评估/草稿端到端；否则 skip（离线 CI 保持绿）

### Key Entities

- **ProviderConfig**: `{ providerId: "deepseek"|"qwen"|"glm"|"claude-agent-sdk"|"mock", model, apiKeyEnvVar, baseUrl? }`
- **OpenAiCompatibleLlmAdapter**: 实现 LlmPort（generate/generateIsolated），内部用 HTTP 调 `/chat/completions`（response_format json_object）
- **LlmRequest.jsonSchema**: 供适配器在可能时映射到 response_format；zod 校验始终在 workflow 层做

### Assumptions

- 境内模型走 OpenAI 兼容端点：DeepSeek `https://api.deepseek.com`、Qwen(DashScope) `https://dashscope.aliyuncs.com/compatible-mode/v1`、GLM(智谱) `https://open.bigmodel.cn/api/paas/v4`
- 密钥由用户在启动环境注入；本会话若无 key 则以 env-gated 测试 + 文档交付，明确阻塞点（沿用 P0/P1 先例）
- 桌面端默认仍可 mock；切真实 provider 需用户有 key

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-1** 有 key 时，`evaluate`/`draft` 用境内模型端到端跑通，输出通过 zod（env-gated 实测）
- **SC-2** 无 key 时，CLI/桌面给出含缺失 env 变量名的指引，退出码 3
- **SC-3** 坏结构化输出重试一次后硬报错，不写半成品（自动化测试覆盖）
- **SC-4** 仓库内无任何 provider API key 持久化代码/路径（compliance 扫描 + 代码审查）
- **SC-5** 根 `pnpm test`（P0 63）+ desktop（14）+ Rust（5）保持绿；新增 env-gated 测试默认 skip