/**
 * Pure mappers between the engine JSON envelope/file shapes and the Open
 * Design generated UI types. No Tauri runtime — unit-testable.
 */
import type { EvaluationResult, ProfileData, Verdict } from "./components/types.js";

export interface EngineDimension {
  name: string;
  score: number;
  evidence?: string;
}

export interface EngineEvaluation {
  id: string;
  overall: { verdict: Verdict; score: number };
  dimensions: EngineDimension[];
  strengths: string[];
  gaps: Array<{ item: string }>;
  recommendation: string;
}

export function verdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case "strong":
      return "Strong match";
    case "ok":
      return "Good match";
    case "weak":
      return "Weak match";
  }
}

/** Engine 1-5 score → UI 0-100 scale (used by the generated dashboard). */
export function scoreToPercent(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 20)));
}

export function mapEvaluationToResult(evaluation: EngineEvaluation): EvaluationResult {
  return {
    verdict: evaluation.overall.verdict,
    verdictLabel: verdictLabel(evaluation.overall.verdict),
    score: scoreToPercent(evaluation.overall.score),
    dims: evaluation.dimensions.map((dim, index) => ({
      id: String(index),
      label: dim.name,
      score: scoreToPercent(dim.score),
    })),
    strengths: evaluation.strengths,
    gaps: evaluation.gaps.map((gap) => `Missing: ${gap.item}`),
    reco: evaluation.recommendation,
  };
}

export interface EngineProfile {
  name: string;
  contact: { email: string; phone?: string; location?: string };
  education: Array<{ institution: string; degree: string; field: string; start: string; end?: string }>;
  experiences: Array<{ org: string; title: string; start: string; end?: string; bullets: string[] }>;
  skills: string[];
  version: number;
}

export function mapProfileToUi(profile: EngineProfile, savedAt: string): ProfileData {
  return {
    name: profile.name,
    email: profile.contact.email,
    headline: profile.experiences[0]?.title ?? "",
    location: profile.contact.location ?? "",
    version: profile.version,
    savedAt,
    lastImport: "workspace profile.json",
    experience: profile.experiences.map((exp) => ({
      role: exp.title,
      company: exp.org,
      years: `${exp.start}–${exp.end ?? "present"}`,
      highlights: exp.bullets.join("; "),
    })),
    education: profile.education.map((edu) => ({
      school: edu.institution,
      degree: `${edu.degree} — ${edu.field}`,
      years: edu.start,
    })),
    skills: profile.skills,
  };
}