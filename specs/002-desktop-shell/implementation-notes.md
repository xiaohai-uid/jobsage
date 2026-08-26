# Implementation Notes — P1 Desktop Shell (002-desktop-shell)

**Date**: 2026-08-26 | **Status**: in progress (UI + sidecar wiring complete; installable bundle verifying)

## What was built

- **Open Design integration**: created a project, wrote a UI brief, ran
  `od-new-generation` (accepted artifact `jobsage-desktop.html`) and
  `od-react-export` (typed React source under `desktop/src/components/`).
  The generated design system (oklch tokens, sidebar layout, six views) is
  integrated verbatim.
- **Tauri backend**: `sidecar.rs` whitelist + safe process runner; `commands.rs`
  exposing `run_jobsage`, `get_settings`, `save_settings`,
  `read_workspace_file`, `write_workspace_file` with path-traversal guard.
- **Frontend bridge**: `commands.ts` wraps Tauri invoke + pure argv builders;
  `engineMapper.ts` maps engine evaluations/profiles to the UI types.
- **JobSageApp wiring**: replaced all mock actions with real sidecar calls —
  evaluate (posting add stdin → evaluate → read evaluation.json), profile
  import/save, draft generate + save, export to workspace/exports.

## Tests

- Rust: 5 passed (whitelist accept/reject, export format guard,
  safe-rel-path traversal).
- Desktop: 14 passed (reducer 5, commands argv builders 6, engine mapper 3).
- Root P0: 63 passed / 4 gated skipped — unchanged.

## Open Design artifacts

- Generated HTML: `jobsage-desktop.html` in the OD project data dir.
- Generated React source copied into `desktop/src/components/`.
- Inputs used: `artifactKind=internal tool`, `audience=job seekers and tech
  professionals`, `topic=JobSage desktop app UI...`, styling `plain CSS`.

## Remaining

- `pnpm tauri build` installable Linux bundle verification (in progress).
- Manual desktop quickstart walkthrough (needs GUI display).
- Wire review/review notes UI if desired (engine supports it; generated UI
  currently exposes draft editing/saving only).