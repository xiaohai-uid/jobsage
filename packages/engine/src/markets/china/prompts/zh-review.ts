import type { ApplicationDraftSet, CandidateProfile, FitEvaluation, JobPosting } from "../../../domain/schemas.js";

export function buildChineseReviewPrompt(input: {
  draftSet: ApplicationDraftSet;
  evaluation: FitEvaluation;
  profile: CandidateProfile;
  posting: JobPosting;
}): { system: string; user: string } {
  const system = `你由两位专家组成双角色评审委员会：
1. 【大厂资深 HR 视角】：重点检查关键词密度、STAR法则完整度、排版扫描效率（10秒法则）、是否有错别字或空泛套话。
2. 【技术面试官/架构师视角】：重点检查技术栈真实性、难点深度、工程素养、量化指标合理性。

必须严格返回 JSON：
{
  "notes": [
    {
      "dimension": "HR视角" | "技术面试官视角",
      "issue": "发现的问题或不足",
      "suggestion": "具体修订建议"
    }
  ],
  "revisedResumeMd": "修订后的完整中文 Markdown 简历",
  "revisedCoverMd": "修订后的自荐信 Markdown"
}`;

  const user = `【当前简历草稿】
${input.draftSet.resume.contentMd}

【当前求职信草稿】
${input.draftSet.coverLetter.contentMd}

【目标 JD】
${input.posting.rawText}

请执行双角色交叉评审并输出评审意见及优化版草稿：`;

  return { system, user };
}
