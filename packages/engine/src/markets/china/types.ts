import { z } from "zod";
import type { CandidateProfile, FitEvaluation, JobPosting, ApplicationDraftSet } from "../../domain/schemas.js";

export type ChinesePlatform = "boss" | "liepin" | "51job" | "zhaopin" | "nowcoder" | "shixiseng" | "other";

export interface ChineseJobPostingExtracted {
  company?: string;
  roleTitle?: string;
  department?: string;
  location?: string;
  salaryRange?: string;
  experienceReq?: string;
  educationReq?: string;
  platform: ChinesePlatform;
  language: "zh";
  responsibilities: string[];
  requirements: string[];
  keywords: string[];
}

export const ChineseChatGreetingSchema = z.object({
  platform: z.enum(["boss", "liepin", "generic"]),
  openerText: z.string().min(10).max(300),
  coreMatches: z.array(z.string().min(1)).default([]),
  wordCount: z.number().int().positive(),
});

export type ChineseChatGreeting = z.infer<typeof ChineseChatGreetingSchema>;

export interface ChineseApplicationResult {
  draftSet: ApplicationDraftSet;
  greeting: ChineseChatGreeting;
}
