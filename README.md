# JobSage（谋职）

**Local-first AI job application copilot.** Derived from
[MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search)
(MIT). Human-in-command: JobSage drafts, never sends.

This is the **P0 engine + CLI**. It turns your local candidate profile + a job
description into: fit evaluation → tailored resume/cover letter drafts → review
→ PDF export. Everything stays on your machine; you bring your own model key.

## Status

P0 milestone: `v0.1.0-p0`. Offline test suite green, real PDF rendering works
when a Chromium binary is available to Playwright.

## Prerequisites

- Node.js ≥ 20, pnpm ≥ 9
- For real inference: `ANTHROPIC_API_KEY` (or another adapter later)
- For PDF export: a Chromium binary available to Playwright (`npx playwright install chromium` if needed)

## Quickstart (offline, mock provider)

```bash
pnpm install
pnpm build

export JOBSAGE_PROVIDER=mock
# Set JOBSAGE_MOCK_RESPONSES to a JSON array of canned LLM responses for demos/tests.

jobsage init --file examples/profile-sample.yaml
jobsage posting add --file examples/jd-sample.txt
jobsage evaluate --posting <postingId>
jobsage draft --evaluation <evaluationId>
jobsage review --draft <draftSetId> --revise
jobsage export --draft <draftSetId> --format html --out resume.html
```

## Real inference

```bash
unset JOBSAGE_PROVIDER
export ANTHROPIC_API_KEY=sk-...
# same commands as above
```

## Testing & compliance

```bash
pnpm test      # offline unit/contract/e2e (mock provider)
pnpm check     # constitution compliance scan (no transport in engine, NOTICE intact)
```

## License & attribution

MIT. Notice of derivation is in [`NOTICE`](NOTICE); upstream license text is
kept in [`LICENSE`](LICENSE).