import type { CandidateProfile, FitEvaluation, JobPosting } from "../../../domain/schemas.js";

export function buildChineseDraftResumePrompt(input: {
  evaluation: FitEvaluation;
  profile: CandidateProfile;
  posting: JobPosting;
}): { system: string; user: string } {
  const system = `你是一位专注于中文技术简历定制的专家。
请根据评估结果与目标 JD，将求职者简历重构为高信息密度、符合 STAR 法则（情境-任务-行动-结果）、突出量化成果的中文 Markdown 简历。
规则：
1. 严禁编造未在档案中出现的履历。
2. 突出与目标 JD 强相关的项目与技术关键词。
3. 经历描述中尽量包含量化指标（如性能提升百分比、业务承载量、节省成本等）。
4. 格式包含：# 姓名, 联系方式, 个人总结, 核心技能, 工作与项目经历, 教育背景。

必须返回包含 Markdown 文本的 JSON 格式：
{
  "contentMd": "# 姓名\n...",
  "cuts": [
    {
      "removedLine": "裁剪或精简的原始要点",
      "reason": "裁剪原因（如：与目标JD相关度低，避免分散HR注意力）",
      "scoreBreakdown": { "relevance": 0.3, "uniqueness": 0.4, "coverLetterDependent": false }
    }
  ]
}`;

  const user = `【求职者档案】
${JSON.stringify(input.profile, null, 2)}

【五维匹配评估】
得分: ${input.evaluation.overall.score} / 5 (${input.evaluation.overall.verdict})
优势: ${input.evaluation.strengths.join("; ")}
差距: ${input.evaluation.gaps.map((g) => g.item).join("; ")}

【目标 JD】
${input.posting.rawText}

请生成量化定制的中文 Markdown 简历与裁剪日志：`;

  return { system, user };
}
