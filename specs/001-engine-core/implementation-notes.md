# Implementation Notes — P0 (001-engine-core)

**Date**: 2026-08-25 | **Status**: v0.1.0-p0 complete

## What was built

- `packages/engine`: domain schemas (zod), ports (Llm/PdfRenderer/Id/Clock),
  workflows (evaluate → draft → review-revise), deterministic relevance-weighted
  cutting, HTML/A4 render templates + renderPdf, adapters (Claude Agent SDK,
  Mock, Null, Playwright PDF).
- `packages/cli`: `jobsage init / posting add / evaluate / draft / review
  [--revise] / export --format pdf|html` with JSON envelope + exit codes,
  local workspace filesystem layout, audit log.
- Compliance tooling: `pnpm check` scans engine for transport imports and
  verifies LICENSE/NOTICE.

## Test results

- `pnpm test`: **63 passed**, 2 gated skipped (render contract + ATS smoke require
  `JOBSAGE_TEST_RENDER=1` and pdftotext for smoke).
- `pnpm check`: **compliance OK**.
- Real render: `PlaywrightPdfAdapter` verified with `JOBSAGE_TEST_RENDER=1` —
  PDF magic bytes pass. Browser available on this machine.

## Manual quickstart walkthrough (Python-driven CLI)

All timings on this WSL machine with mock provider (no network LLM):

| command | exit | time |
|---|---|---|
| init | 0 | 0.30s |
| posting add | 0 | 0.30s |
| evaluate | 0 | 0.30s |
| draft | 0 | 0.31s |
| review --revise | 0 | 0.32s |
| export html | 0 | 0.30s |
| export pdf | 0 | 0.90s (real Chromium) |

PDF output `%PDF` magic, 19,129 bytes. SC-1/SC-2 target (≤30min onboarding,
≤5min triple deliverable) is trivially met offline; real-LLM latency dominates
online and is outside engine scope.

## Known limitations / deferred (documented)

- Interview prep, application forms, web-research fetch chain, `/rank`, `/setup`
  interactive and Notion/Gmail sync are out of P0 (follow-up features).
- Reviewer does not perform live company web research (constitution offline
  constraint); divergence recorded in research.md R6.
- ATS text-layer smoke test is optional-dep-gated (pdftotext missing here);
  the structural guarantee is covered by render unit tests (contact as text).
- Real Claude Agent SDK inference not exercised in this environment (no API
  key); adapter compiles and is env-gated.