/**
 * @jobsage/engine/markets/china — China Market Overlay.
 * Localization overlay for Chinese recruitment platforms (BOSS, Liepin, 51Job, etc.)
 */
export * from "./types.js";
export * from "./compliance.js";
export * from "./parser.js";
export * from "./greeting.js";
export * from "./workflows.js";
export { buildChineseEvaluatePrompt } from "./prompts/zh-evaluate.js";
export { buildChineseDraftResumePrompt } from "./prompts/zh-draft-resume.js";
export { buildChineseDraftCoverPrompt } from "./prompts/zh-draft-cover.js";
export { buildChineseReviewPrompt } from "./prompts/zh-review.js";
