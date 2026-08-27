# Feature Specification: 中国市场包 Overlay（004-china-market）

**Feature Branch**: `004-china-market`

**Created**: 2026-08-27

**Status**: Ready for Implementation

**Input**: P2-② 规格：中国市场包 `markets/china`——中文档案结构与平台 JD 解析（BOSS直聘/猎聘/前程无忧/智联招聘）、本土化五维匹配评估与简历 STAR 精简、本土化求职信与平台直聊打招呼语（BOSS直聘破冰话术）、HR与技术面试官双角色交叉评审、以及合规声明。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 中文档案与主流平台 JD 结构化提取 (Priority: P1)

用户使用中文求职档案，并粘贴 BOSS 直聘、猎聘、前程无忧、智联招聘等平台的职位描述（JD）。系统自动提取岗位名称、公司、部门、薪资、工作年限、学历要求、技术职责与核心关键词，并规范化为 JobPosting 实体。

**Why this priority**: 中文招聘语料有独特的排版（如"职位详情"、"任职要求"、"加分项"、"薪资待遇"），必须精确解析以保证后续评估质量。

**Independent Test**: 对不同中文平台格式文本调用 `parseChineseJobPosting`，断言 roleTitle、company、keywords 等字段正确提取。

### User Story 2 - 本土化五维匹配评估流水线 (Priority: P1)

在已有中文档案与 JD 基础上，使用中文本土化评估 Prompt，调用境内 LLM（DeepSeek / Qwen / GLM / SenseNova）输出五维评估：
1. 专业技能重合度 (skills)
2. 项目与实战深度 (exp)
3. 岗位职责胜任力 (resp)
4. 职级资历与学历年限 (seniority)
5. 技术栈与业务工具 (stack)

输出包括量化得分（1-5）、优势总结、客观差距（honestMissing）与面试准备建议。

**Why this priority**: 评估是整个求职决策的核心漏斗第一环。

**Independent Test**: 调用 `evaluateChineseFit`，断言返回的 FitEvaluationSchema 校验通过且包含标准中文五维。

### User Story 3 - 中文简历 STAR 精简与相关度裁剪 (Priority: P1)

根据 JD 针对中文工作与项目经历条目做相关度加权，重写为 STAR 格式的量化亮点，并自动裁剪低相关性冗余内容，输出带有精确 `cutLog`（裁剪原因、相关度、是否转移自荐信）的中文简历草稿 Markdown。

**Why this priority**: 中国 HR 与猎头平均扫描简历时间约 10 秒，突出量化成果与核心技术栈是提高面试率的关键。

**Independent Test**: 调用 `draftChineseResume`，断言生成的 `resume.contentMd` 含有量化成果，`cutLog` 结构完整。

### User Story 4 - 中文自荐信与 BOSS直聘 / 猎聘直聊打招呼语 (Priority: P1)

针对中国特色招聘场景，除了生成完整中文自荐信（Cover Letter）外，专门生成"直聊打招呼语 / 破冰话术"（100字黄金开场白，包含核心优势匹配、与业务关联点、礼貌沟通意向）。严格遵循 Human-in-Command（宪法 II），纯本地生成，禁止自动发送，仅供用户手动复制。

**Why this priority**: BOSS直聘与猎聘的"直聊"是国内主流招聘交互模式，高质量打招呼语极大提升已读回复率。

**Independent Test**: 调用 `draftChineseCoverAndGreeting`，断言返回格式中既包含完整自荐信，又包含不超过 150 字的结构化平台直聊打招呼语。

### User Story 5 - HR + 技术面试官双角色评审与合规标识 (Priority: P2)

针对中文简历草稿执行双视角交叉评审（HR 视角关注格式规范与关键词，技术面试官关注实战深度与可信度），并生成符合《人工智能生成合成内容标识办法》的中文 AI 辅助声明。

**Why this priority**: 保证简历真实可信、不踩雷区，且满足国内法律法规合规要求。

**Independent Test**: 调用 `reviewAndReviseChinese`，断言返回包含双视角评注与中文声明。

### User Story 6 - CLI 与桌面端集成及示例数据 (Priority: P2)

CLI 提供 `--market china` 支持，并在 `examples/` 提供完整的中文简历样例（`profile-zh-sample.yaml`）与真实 JD 样例（`jd-boss-sample.txt`、`jd-liepin-sample.txt`），桌面端设置与导入支持中文本土化展示。

**Why this priority**: 确保端到端开箱即用体验。

**Independent Test**: 执行 `jobsage evaluate --posting <id> --market china` 全流程跑通。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-1** 在 `packages/engine/src/markets/china/` 建立薄覆层（Overlay），包含：
  - `parser.ts`：中文平台 JD 提取器（BOSS直聘、猎聘、前程无忧、智联招聘等）
  - `prompts/`：本土化评估、简历 STAR 重构、自荐信与直聊话术、双角色评审 Prompt
  - `greeting.ts`：平台直聊破冰话术数据结构与生成器
  - `compliance.ts`：符合《人工智能生成合成内容标识办法》的中文声明与合规规则
- **FR-2** 工作流适配：`evaluateChineseFit`、`draftChineseApplication`、`reviewAndReviseChinese`，保持与 LlmPort / EngineDeps 契约一致
- **FR-3** 实体与 Schema：在 `ApplicationDraftSetSchema` 或中文扩展中结构化支持直聊打招呼语（`greeting` / `chatOpener`）
- **FR-4** 示例语料：在 `examples/` 目录下提供 `profile-zh-sample.yaml`、`jd-boss-sample.txt`、`jd-liepin-sample.txt`
- **FR-5** CLI 联动：CLI 命令支持 `--market china` 选项或根据 profile/JD 语系自动路由
- **FR-6** 离线与合规：遵守所有宪法规则（无发送逻辑、纯本地运行、不落盘 API Key、合规扫描绿灯）

## Success Criteria *(mandatory)*

- **SC-1** 中文 JD 解析覆盖主流招聘平台文本，关键词与关键要求准确提取
- **SC-2** 中文五维评估与 STAR 简历裁剪通过 Zod Schema 校验
- **SC-3** 直聊打招呼语精准精炼（100-150字），突出岗位匹配度
- **SC-4** 根单元测试、契约测试、CLI 测试、合规检查与桌面测试全绿
