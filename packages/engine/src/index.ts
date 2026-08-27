/**
 * @jobsage/engine — JobSage core engine.
 *
 * Public API surface. Contract: specs/001-engine-core/contracts/engine-api.md
 * Invariants (constitution Principle II): no send/submit/publish capability
 * exists anywhere in this package; all artifacts are drafts.
 */
export const ENGINE_NAME = "jobsage-engine" as const;
export const ENGINE_VERSION = "0.1.0" as const;

// Domain
export * from "./domain/schemas.js";

// Ports (types + errors)
export type {
  ClockPort,
  EngineDeps,
  IdGeneratorPort,
  LlmPort,
  LlmRequest,
  PdfRendererPort,
} from "./ports/index.js";
export {
  ProfileVersionMismatchError,
  RendererUnavailableError,
  SchemaViolationError,
} from "./ports/index.js";

// Workflows
export { evaluateFit } from "./workflows/evaluate.js";
export type { EvaluateInput } from "./workflows/evaluate.js";
export { draftApplication, DEFAULT_DISCLOSURE_TEXT } from "./workflows/draft.js";
export type { DraftInput } from "./workflows/draft.js";
export { reviewAndRevise } from "./workflows/review-revise.js";
export type { ReviewReviseInput } from "./workflows/review-revise.js";

// Adapters
export {
  FixedClock,
  MockLlmAdapter,
  NullPdfAdapter,
  SequentialIdGenerator,
} from "./adapters/mock.js";
export { ClaudeAgentSdkLlmAdapter } from "./adapters/claude-agent-sdk.js";
export { OpenAiCompatibleLlmAdapter } from "./adapters/openai-compatible.js";
export type { OpenAiCompatibleConfig } from "./adapters/openai-compatible.js";
export { PROVIDER_IDS, resolveProvider } from "./adapters/providers.js";
export type { ProviderMeta } from "./adapters/providers.js";
export { SystemClock, UlidLikeIdGenerator } from "./adapters/system.js";
export { PlaywrightPdfAdapter } from "./adapters/playwright-pdf.js";

// Render
export { mdToSimpleHtml, renderDocument } from "./render/templates.js";
export type { RenderInput, RenderOutput } from "./render/templates.js";
export { renderPdf } from "./render/export.js";
export type { RenderPdfInput } from "./render/export.js";

// Markets (Thin Overlays)
export * as ChinaMarket from "./markets/china/index.js";
export {
  parseChineseJobPosting,
  evaluateChineseFit,
  draftChineseApplication,
  reviewAndReviseChinese,
  buildDeterministicGreeting,
  CHINA_AI_DISCLOSURE_TEXT,
  CHINA_PRIVACY_NOTICE,
} from "./markets/china/index.js";
export type {
  ChineseJobPostingExtracted,
  ChineseChatGreeting,
  ChineseApplicationResult,
  ChineseEvaluateInput,
  ChineseDraftInput,
  ChineseReviewInput,
} from "./markets/china/index.js";
