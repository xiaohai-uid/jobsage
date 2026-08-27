import type { CandidateProfile, FitEvaluation, JobPosting } from "../../../domain/schemas.js";

export function buildChineseDraftCoverPrompt(input: {
  evaluation: FitEvaluation;
  profile: CandidateProfile;
  posting: JobPosting;
}): { system: string; user: string } {
  const system = `你是一位资深求职文案与沟通专家。
中国求职场景需要两种文案：
1. 【自荐信 (Cover Letter)】：结构完整、诚恳专业的正式求职自荐信。
2. 【BOSS直聘/猎聘直聊打招呼语 (Greeting)】：约 100-150 字的黄金破冰语。格式：礼貌问候 + 核心优势/年限/匹配度 + 针对 JD 核心痛点的解决能力 + 表达沟通意向。适合直接复制到聊天框。

必须严格返回 JSON：
{
  "coverLetterMd": "尊敬的招聘负责人：\n...",
  "greeting": {
    "platform": "boss",
    "openerText": "您好！看到贵司正在招聘【岗位】，我具备X年相关经验，曾主导过...",
    "coreMatches": ["亮点1", "亮点2"],
    "wordCount": 120
  }
}`;

  const user = `【候选人】
姓名：${input.profile.name}
核心优势：${input.evaluation.strengths.join(", ")}
主要技能：${input.profile.skills.join(", ")}

【目标职位】
企业/岗位：${input.posting.extracted.company || "贵司"} · ${input.posting.extracted.roleTitle || "该职位"}
JD 关键要求：${input.posting.keywords.join(", ")}

请生成自荐信与黄金直聊打招呼语：`;

  return { system, user };
}
