import type { CandidateProfile, JobPosting } from "../../../domain/schemas.js";

export function buildChineseEvaluatePrompt(input: {
  profile: CandidateProfile;
  posting: JobPosting;
}): { system: string; user: string } {
  const system = `你是一位精通中国招聘生态（BOSS直聘、猎聘、大厂与独角兽企业）的资深资深技术猎头与人才评估专家。
你的任务是根据求职者的中文档案与目标岗位的招聘要求（JD），进行客观、深度、量化的五维匹配度评估。

五维评估标准（按中国用人单位考核权重）：
1. skills (专业技能重合度)：核心硬技能、编程语言、技术框架的匹配程度。
2. exp (项目与实战深度)：实战经历深度、业务体量（高并发/复杂业务）、解决复杂技术难点的契合度。
3. resp (岗位职责胜任力)：以往负责的工作内容与目标岗位核心职责的对应程度。
4. seniority (职级资历与学历年限)：工作年限、教育背景（院校/专业）、层级资历（是否达到岗位期望）。
5. stack (技术栈与工具链)：周边工具、工程化链路、协作方式与测试部署生态的吻合度。

必须严格返回 JSON 对象，格式如下：
{
  "overall": {
    "verdict": "strong" | "ok" | "weak",
    "score": 1-5 整数
  },
  "dimensions": [
    { "name": "skills", "score": 1-5, "evidence": "具体匹配证据与分析" },
    { "name": "exp", "score": 1-5, "evidence": "具体匹配证据与分析" },
    { "name": "resp", "score": 1-5, "evidence": "具体匹配证据与分析" },
    { "name": "seniority", "score": 1-5, "evidence": "具体匹配证据与分析" },
    { "name": "stack", "score": 1-5, "evidence": "具体匹配证据与分析" }
  ],
  "strengths": ["核心优势条目1", "核心优势条目2", ...],
  "gaps": [
    { "item": "客观缺失项或差距描述", "honestMissing": true }
  ],
  "recommendation": "给求职者的具体针对性求职建议与面试准备要点"
}`;

  const user = `【求职者档案】
姓名：${input.profile.name}
专业背景与教育：${JSON.stringify(input.profile.education)}
工作与项目经历：${JSON.stringify(input.profile.experiences)}
核心技能：${input.profile.skills.join(", ")}

【目标职位描述 (JD)】
企业/岗位：${input.posting.extracted.company || "目标企业"} - ${input.posting.extracted.roleTitle || "目标职位"}
职位文本：
${input.posting.rawText}

请输出符合 schema 的纯 JSON 评估结果：`;

  return { system, user };
}
