import { z } from "zod";
import type { EngineDeps } from "../../ports/index.js";
import { ProfileVersionMismatchError, SchemaViolationError } from "../../ports/index.js";
import {
  ApplicationDraftSetSchema,
  FitEvaluationSchema,
  type ApplicationDraftSet,
  type CandidateProfile,
  type FitEvaluation,
  type JobPosting,
} from "../../domain/schemas.js";
import { formatChinaDisclosure } from "./compliance.js";
import { buildDeterministicGreeting } from "./greeting.js";
import { buildChineseEvaluatePrompt } from "./prompts/zh-evaluate.js";
import { buildChineseDraftResumePrompt } from "./prompts/zh-draft-resume.js";
import { buildChineseDraftCoverPrompt } from "./prompts/zh-draft-cover.js";
import { buildChineseReviewPrompt } from "./prompts/zh-review.js";
import type { ChineseApplicationResult, ChineseChatGreeting } from "./types.js";

export interface ChineseEvaluateInput {
  profile: CandidateProfile;
  posting: JobPosting;
}

export interface ChineseDraftInput {
  evaluation: FitEvaluation;
  profile: CandidateProfile;
  posting: JobPosting;
  disclosureEnabled?: boolean;
}

export interface ChineseReviewInput {
  profile: CandidateProfile;
  posting: JobPosting;
  draftSet: ApplicationDraftSet;
  evaluation?: FitEvaluation;
  revise?: boolean;
}

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return JSON.parse(fenced ? fenced[1]! : trimmed) as unknown;
}

export async function evaluateChineseFit(
  input: ChineseEvaluateInput,
  deps: EngineDeps
): Promise<FitEvaluation> {
  const prompt = buildChineseEvaluatePrompt(input);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { text } = await deps.llm.generate(prompt);
      const rawObj = parseJsonLoose(text) as Record<string, unknown>;
      const candidate = {
        id: deps.ids.next(),
        postingId: input.posting.id,
        profileVersion: input.profile.version,
        overall: rawObj.overall,
        dimensions: rawObj.dimensions,
        strengths: Array.isArray(rawObj.strengths) ? rawObj.strengths : [],
        gaps: Array.isArray(rawObj.gaps) ? rawObj.gaps : [],
        recommendation: String(rawObj.recommendation || "建议围绕核心技能强化简历描述。"),
        createdAt: deps.clock.now().toISOString(),
      };
      const val = FitEvaluationSchema.safeParse(candidate);
      if (val.success) return val.data;
      lastError = val.error;
    } catch (err) {
      lastError = err;
    }
  }

  throw new SchemaViolationError(
    `Chinese evaluation output failed schema validation after retry: ${String(lastError)}`
  );
}

export async function draftChineseApplication(
  input: ChineseDraftInput,
  deps: EngineDeps
): Promise<ChineseApplicationResult> {
  const { evaluation, profile, posting } = input;
  if (profile.version !== evaluation.profileVersion) {
    throw new ProfileVersionMismatchError(
      `Profile version ${profile.version} does not match evaluation version ${evaluation.profileVersion}`
    );
  }

  // 1. Resume
  const resumePrompt = buildChineseDraftResumePrompt(input);
  let resumeContent = `# ${profile.name}\n\n## 个人优势\n${evaluation.strengths.join("\n- ")}`;
  let cuts: Array<{
    removedLine: string;
    reason: string;
    scoreBreakdown: { relevance: number; uniqueness: number; coverLetterDependent: boolean };
  }> = [];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { text } = await deps.llm.generate(resumePrompt);
      const parsedRes = parseJsonLoose(text) as Record<string, unknown>;
      if (typeof parsedRes.contentMd === "string") {
        resumeContent = parsedRes.contentMd;
      }
      if (Array.isArray(parsedRes.cuts)) {
        cuts = parsedRes.cuts as typeof cuts;
      }
      break;
    } catch {
      // fallback on failure
    }
  }

  // 2. Cover Letter & Greeting
  const coverPrompt = buildChineseDraftCoverPrompt(input);
  let coverContent = `尊敬的招聘负责人：\n\n关注到贵司正在招聘 ${posting.extracted.roleTitle}，我的背景与岗位高度匹配...`;
  let greeting: ChineseChatGreeting = buildDeterministicGreeting(profile, posting, evaluation);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { text } = await deps.llm.generate(coverPrompt);
      const parsedCov = parseJsonLoose(text) as {
        coverLetterMd?: string;
        greeting?: { platform?: "boss" | "liepin" | "generic"; openerText?: string; coreMatches?: string[] };
      };
      if (typeof parsedCov.coverLetterMd === "string") {
        coverContent = parsedCov.coverLetterMd;
      }
      if (parsedCov.greeting?.openerText) {
        greeting = {
          platform: parsedCov.greeting.platform || "boss",
          openerText: parsedCov.greeting.openerText,
          coreMatches: parsedCov.greeting.coreMatches || evaluation.strengths.slice(0, 2),
          wordCount: parsedCov.greeting.openerText.length,
        };
      }
      break;
    } catch {
      // fallback
    }
  }

  const disclosure = formatChinaDisclosure(input.disclosureEnabled ?? true);

  const draftSet: ApplicationDraftSet = {
    id: deps.ids.next(),
    evaluationId: evaluation.id,
    status: "draft",
    resume: {
      contentMd: resumeContent,
      cutLog: cuts,
    },
    coverLetter: {
      contentMd: coverContent,
    },
    disclosure,
    reviewNotes: [],
    revisionHistory: [
      {
        at: deps.clock.now().toISOString(),
        summary: "初版中文定制简历与自荐材料生成（含 BOSS 直聘破冰打招呼语）",
        basedOnNotes: 0,
      },
    ],
    exports: [],
  };

  return {
    draftSet: ApplicationDraftSetSchema.parse(draftSet),
    greeting,
  };
}

export async function reviewAndReviseChinese(
  input: ChineseReviewInput,
  deps: EngineDeps
): Promise<ApplicationDraftSet> {
  const { draftSet } = input;
  const prompt = buildChineseReviewPrompt({
    draftSet,
    evaluation: input.evaluation || {
      id: "eval-temp",
      postingId: input.posting.id,
      profileVersion: input.profile.version,
      overall: { verdict: "strong", score: 5 },
      dimensions: [
        { name: "skills", score: 5, evidence: "" },
        { name: "exp", score: 5, evidence: "" },
        { name: "resp", score: 5, evidence: "" },
        { name: "seniority", score: 5, evidence: "" },
        { name: "stack", score: 5, evidence: "" },
      ],
      strengths: [],
      gaps: [],
      recommendation: "",
      createdAt: deps.clock.now().toISOString(),
    },
    profile: input.profile,
    posting: input.posting,
  });

  let notes: Array<{ dimension: string; issue: string; suggestion: string }> = [];
  let revisedResumeMd = draftSet.resume.contentMd;
  let revisedCoverMd = draftSet.coverLetter.contentMd;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { text } = await deps.llm.generateIsolated(prompt);
      const parsed = parseJsonLoose(text) as {
        notes?: typeof notes;
        revisedResumeMd?: string;
        revisedCoverMd?: string;
      };
      if (Array.isArray(parsed.notes)) notes = parsed.notes;
      if (input.revise && typeof parsed.revisedResumeMd === "string") {
        revisedResumeMd = parsed.revisedResumeMd;
      }
      if (input.revise && typeof parsed.revisedCoverMd === "string") {
        revisedCoverMd = parsed.revisedCoverMd;
      }
      break;
    } catch {
      // fallback
    }
  }

  const nowIso = deps.clock.now().toISOString();
  const resolvedNotes = notes.map((n) => ({
    ...n,
    resolvedAt: input.revise ? nowIso : undefined,
  }));

  const appendedNotes = [...draftSet.reviewNotes, ...resolvedNotes];
  const newRevisionHistory = [...draftSet.revisionHistory];
  if (input.revise && notes.length > 0) {
    newRevisionHistory.push({
      at: nowIso,
      summary: `基于双角色交叉评审意见完成第 ${newRevisionHistory.length + 1} 次中文简历与自荐信修订`,
      basedOnNotes: notes.length,
    });
  }

  return ApplicationDraftSetSchema.parse({
    ...draftSet,
    resume: {
      ...draftSet.resume,
      contentMd: revisedResumeMd,
    },
    coverLetter: {
      contentMd: revisedCoverMd,
    },
    reviewNotes: appendedNotes,
    revisionHistory: newRevisionHistory,
  });
}
