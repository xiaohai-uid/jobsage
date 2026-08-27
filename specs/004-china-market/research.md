# Research & Architecture Decision: 中国市场包 Overlay（004-china-market）

## Context & Upstream Fidelity

上游 `ai-job-search` 是以欧美招聘生态（LinkedIn / ATS / Cover Letter）为主的英文架构。在中国市场，招聘生态存在显著差异：
1. **平台与交互形态**：BOSS直聘、猎聘的"直聊"模式占主导，求职者首先需要的是"黄金 100 字打招呼语/破冰语"，而非长篇 Cover Letter。
2. **JD 文本排版特征**：国内 JD 常有"岗位职责"、"任职要求"、"岗位亮点/福利"等分块，且包含薪资范围（如 25k-40k·15薪）、学历门槛（统招本科/硕士）、工作年限要求。
3. **简历规范**：国内 HR 重视 STAR 原则、项目实战难点及业务量化产出，反感空洞形容词。
4. **合规与法律约束**：
   - 严禁任何平台自动化爬虫或自动打招呼脚本（防封号及不正当竞争风险，宪法 II/VII）。
   - 内容须符合《人工智能生成合成内容标识办法》。
   - 数据完全保留在本地，严禁简历数据跨境外流或云端留存（PIPL 合规）。

## Architecture Pattern: Thin Overlay

按照宪法 Principle VI，本地化采用薄覆层（Thin Overlay）模式：
- 不侵入修改原英文工作流核心，通过 `packages/engine/src/markets/china/` 导出本土化工作流包装函数与 Prompt。
- 共享底层的 `LlmPort`、`PdfRendererPort`、`IdGeneratorPort`、`ClockPort`。
- 上游同步和共享核心升级完全零冲突。
