<!--
Sync Impact Report
- Version change: (none) → 1.0.0
- Modified principles: n/a (initial ratification)
- Added sections: Core Principles I–VIII; Technology & Compliance Constraints; Development Workflow & Quality Gates; Governance
- Removed sections: none
- Follow-up TODOs: none
-->
# JobSage（谋职）Constitution

## Core Principles

### I. Engine-First（引擎先行）
Every capability starts as a self-contained library in `packages/engine`, independently testable and importable without any UI. The CLI (`packages/cli`) is the first and canonical interface: text in → JSON/markdown out, errors to stderr, exit codes meaningful. Desktop, mobile, and web are shells over the same engine; no feature may exist only in a shell. Rationale: the upstream project's value lives in workflows, not UI; an engine-first core lets every surface reuse it and keeps the product testable headlessly from day one.

### II. Human-in-Command（人审投递）— NON-NEGOTIABLE
The agent MUST never send, submit, or post anything on a user's behalf. Every outbound artifact (application, greeting message, follow-up email) is produced as a draft only, and requires one explicit user confirmation action before it leaves the machine. The product MUST NOT contain auto-apply, batch-submit, or "spray" features of any kind. Rationale: platform ToS bans, the Tencent group-control unfair-competition precedent (¥2.6M), BOSS直聘 absorbing authorized auto-apply into first-party features, and uniform industry consensus across all surviving projects (career-ops, job-ops, JobHuntBot).

### III. Local-First & BYOK — NON-NEGOTIABLE
User career data (profile, CV sources, application archives) stays on the user's machine by default; nothing uploads without an explicit, revocable sync action by the user. LLM access is Bring-Your-Own-Key via the Provider Port; the product never brokers or stores user API keys server-side in the open-source core. Cloud value-added services process only data the user explicitly synced, and the China edition MUST route inference through domestic registered models only (PIPL cross-border obligation). Rationale: privacy is the core differentiator against consumer SaaS; resume data is legally protected personal information (巧达科技 criminal precedent).

### IV. Modular Monolith, Explicit Ports
One runtime, code-level modularity. Domain logic is pure and offline-testable; LLM providers, job-board adapters, PDF renderers, and storage sit behind explicit port interfaces (hexagonal). Network seams are added only when a real scaling driver appears — never preemptively. Rationale: Anthropic/Cognition/Fowler consensus for AI-native products; single runtime eliminates contract drift that killed earlier multi-service attempts.

### V. Test-First — NON-NEGOTIABLE
TDD enforced: tests written and failing before implementation for engine modules; red-green-refactor cycle strictly followed. Contract tests cover every Port implementation; integration tests cover engine↔provider and engine↔storage seams. A feature without tests does not merge. Rationale: the engine is the product; regression cost compounds fastest there, and upstream sync (cherry-picks) demands a safety net.

### VI. Upstream Fidelity & License Compliance
JobSage derives from MadsLorentzen/ai-job-search (MIT). The upstream LICENSE copyright notice and a NOTICE file naming the upstream project MUST ship in every distribution. Localization lives in thin overlays (`markets/<market>/` pattern proven by youngledo/ai-job-search-cn) that never mutate shared workflow sources; an upstream sync mechanism (cherry-pick discipline or pointer-sync tooling) MUST be maintained so improvements flow both ways. Rationale: MIT grants the right but requires the notice; the overlay pattern is what keeps long-term divergence costs near zero.

### VII. Compliance by Design（合规内建）
Market-specific legal red lines are acceptance criteria, not afterthoughts:
- Global: no LinkedIn automation (ToS); AI-assisted artifacts carry a disclosure generator (EU AI Act Art.50 spirit); no impersonation of humans in conversation.
- China: no bulk operations; no scraping of platform data (JD text enters via user paste or official/open channels); no resume storage on servers; no "保offer/代投" marketing claims; generative features registered where required; content labeling per《人工智能生成合成内容标识办法》.
A feature that cannot ship inside these lines is redesigned, not excepted. Rationale: these lines came from the 2026-08 competitive/legal research; violating any one is existential (account bans, unfair-competition liability, criminal exposure).

### VIII. Simplicity & Quality-over-Volume
Grow in layers from the smallest end-to-end working version; YAGNI applies to abstractions, configuration, and services alike. Product narrative and copy NEVER promise volume ("auto-apply N jobs") — always fit-first tailoring, apply caps, and quality signals. Rationale: recruiter backlash defines the market's survival boundary; simplicity keeps a small team shipping.

## Technology & Compliance Constraints

- **Languages/runtimes**: TypeScript end-to-end. Engine: TypeScript (Node), Claude Agent SDK behind ProviderPort (pluggable to DeepSeek/Qwen/GLM/domestic models for CN).
- **Shells**: Desktop = Tauri 2; Mobile = Expo/React Native (PWA acceptable for v1 validation); Web site = Next.js/Astro static-first; 增值 backend = Cloudflare Workers stack.
- **Resume rendering**: HTML/CSS templates printed to PDF (Chromium); LaTeX remains an opt-in pro export only. No TeX requirement in consumer installs.
- **China data plane**: domestic inference endpoints; no cross-border personal-data flows; no server-side resume persistence.
- **Distribution**: desktop bundles its runtime; user supplies model keys (BYOK) or subscribes to hosted runs (paid tier).

## Development Workflow & Quality Gates

- Spec-driven: every feature goes through `/speckit-specify → plan → tasks → implement`; constitution compliance is checked at plan review and code review.
- Gates: (1) tests pass, (2) new ports have contract tests, (3) human-in-command paths have an explicit confirmation step verified by test, (4) no user data egress without explicit sync action, (5) upstream NOTICE intact in build artifacts.
- Branches: `main` releasable; feature branches per spec; upstream sync branch refreshed weekly.

## Governance

This constitution supersedes all other practices. Amendments require: written rationale in the PR, updated Sync Impact Report, semantic version bump (MAJOR = principle removal/redefinition, MINOR = new principle/material expansion, PATCH = clarification), and maintainer approval. All PRs and reviews verify compliance; complexity must be justified against Principle VIII. Runtime development guidance lives in spec plans, not here.

**Version**: 1.0.0 | **Ratified**: 2026-08-25 | **Last Amended**: 2026-08-25
