/**
 * @jobsage/engine — JobSage core engine.
 *
 * Public API surface. Contract: specs/001-engine-core/contracts/engine-api.md
 * Invariants (constitution Principle II): no send/submit/publish capability
 * exists anywhere in this package; all artifacts are drafts.
 */
export const ENGINE_NAME = "jobsage-engine" as const;
export const ENGINE_VERSION = "0.1.0" as const;
