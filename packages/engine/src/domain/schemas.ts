/**
 * Domain schemas — single source of truth for JobSage entities.
 * Contract: specs/001-engine-core/data-model.md
 * Invariants enforced here include constitution Principle II (status is always
 * the literal "draft"; no send/submit states exist) and Principle VII (posting
 * source is user-paste only — no scraping path in P0).
 */
import { z } from "zod";

export const CandidateProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  contact: z.object({
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().optional(),
  }),
  education: z.array(
    z.object({
      institution: z.string().min(1),
      degree: z.string().min(1),
      field: z.string().min(1),
      start: z.string().min(1),
      end: z.string().optional(),
      highlights: z.array(z.string().min(1)).default([]),
    }),
  ),
  experiences: z.array(
    z.object({
      org: z.string().min(1),
      title: z.string().min(1),
      start: z.string().min(1),
      end: z.string().optional(),
      location: z.string().optional(),
      bullets: z.array(z.string().min(1)).min(1),
    }),
  ),
  skills: z.array(z.string().min(1)).default([]),
  portfolioLinks: z
    .array(z.object({ label: z.string().min(1), url: z.string().url() }))
    .default([]),
  writingStyleSample: z.string().optional(),
  behavioral: z
    .object({
      discType: z.string().optional(),
      motivations: z.array(z.string()).default([]),
      workStyle: z.string().optional(),
    })
    .optional(),
  locale: z.enum(["en", "zh"]).default("en"),
  version: z.number().int().positive(),
});

export const JobPostingSchema = z.object({
  id: z.string().min(1),
  source: z.literal("user-paste"),
  rawText: z.string().min(1),
  extracted: z.object({
    company: z.string().optional(),
    roleTitle: z.string().optional(),
    department: z.string().optional(),
    location: z.string().optional(),
    deadline: z.string().optional(),
    language: z.enum(["en", "zh", "other"]),
  }),
  keywords: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime(),
});

const DimensionSchema = z.object({
  name: z.string().min(1),
  score: z.number().int().min(1).max(5),
  evidence: z.string().min(1),
});

export const FitEvaluationSchema = z.object({
  id: z.string().min(1),
  postingId: z.string().min(1),
  profileVersion: z.number().int().positive(),
  overall: z.object({
    verdict: z.enum(["strong", "ok", "weak"]),
    score: z.number().int().min(1).max(5),
  }),
  dimensions: z.array(DimensionSchema).length(5),
  strengths: z.array(z.string().min(1)).default([]),
  gaps: z
    .array(
      z.object({
        item: z.string().min(1),
        honestMissing: z.literal(true),
      }),
    )
    .default([]),
  recommendation: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const ApplicationDraftSetSchema = z.object({
  id: z.string().min(1),
  evaluationId: z.string().min(1),
  // Constitution Principle II: there is no status other than "draft".
  status: z.literal("draft"),
  resume: z.object({
    contentMd: z.string().min(1),
    cutLog: z.array(
      z.object({
        removedLine: z.string().min(1),
        reason: z.string().min(1),
        scoreBreakdown: z.object({
          relevance: z.number(),
          uniqueness: z.number(),
          coverLetterDependent: z.boolean(),
        }),
      }),
    ),
  }),
  coverLetter: z.object({ contentMd: z.string().min(1) }),
  disclosure: z.object({
    enabled: z.boolean(),
    text: z.string().min(1),
  }),
  reviewNotes: z.array(
    z.object({
      dimension: z.string().min(1),
      issue: z.string().min(1),
      suggestion: z.string().min(1),
      resolvedAt: z.string().datetime().optional(),
    }),
  ),
  revisionHistory: z.array(
    z.object({
      at: z.string().datetime(),
      summary: z.string().min(1),
      basedOnNotes: z.number().int().nonnegative(),
    }),
  ),
  exports: z.array(
    z.object({
      type: z.literal("pdf"),
      path: z.string().min(1),
      exportedAt: z.string().datetime(),
    }),
  ),
});

export const ProviderConfigSchema = z.object({
  providerId: z.enum(["claude-agent-sdk", "mock"]),
  model: z.string().min(1),
  apiKeyEnvVar: z.string().min(1), // variable name, never the key value
  baseUrl: z.string().url().optional(),
});

export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;
export type JobPosting = z.infer<typeof JobPostingSchema>;
export type FitEvaluation = z.infer<typeof FitEvaluationSchema>;
export type ApplicationDraftSet = z.infer<typeof ApplicationDraftSetSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
