import type { CandidateProfile, FitEvaluation, JobPosting } from "../../domain/schemas.js";
import type { ChineseChatGreeting } from "./types.js";

/**
 * Generates an instant, deterministic 100-word greeting for BOSS直聘 / 猎聘
 * when offline or as template fallback.
 */
export function buildDeterministicGreeting(
  profile: CandidateProfile,
  posting: JobPosting,
  evaluation?: FitEvaluation
): ChineseChatGreeting {
  const role = posting.extracted.roleTitle || "贵司该职位";
  const years = profile.experiences.length > 0 ? `${profile.experiences.length * 2}+年` : "多年";
  const topSkills = profile.skills.slice(0, 3).join("、");
  const strength = evaluation?.strengths[0] || "具备扎实工程落地能力";

  const opener = `您好！关注到贵司正在招聘【${role}】，我具备${years}相关经验，精通 ${topSkills}。${strength}，与该岗位的职责及技术要求高度契合。非常期待能与您进一步沟通交流！`;

  return {
    platform: "boss",
    openerText: opener,
    coreMatches: evaluation?.strengths.slice(0, 2) || [topSkills],
    wordCount: opener.length,
  };
}
