# Checklist

## Implementation

- [x] Read related manuals and existing docs.
- [x] Summarized impact scope before changes.
- [x] Reflected WAT steps in task docs.
- [x] Kept implementation scope minimal.
- [x] Checked mock/real paths together.
- [x] Updated related contract paths when needed.

## Testing

- [x] Ran targeted Vitest suites.
- [ ] Run `npm run lint` if required by change scope.
- [ ] Run `npm run build` if required by change scope.
- [ ] Run Playwright scenario when user flow risk is high.

## Review

- [x] Self-reviewed with `docs/rules.md` guidance.
- [x] Checked boundary cases (redirect, cleanup, duplicate subscribe, errors).
- [x] Synced TODO task status with current work.
- [ ] Updated session handoff notes.
- [ ] Verified `npm run ai:session:brief -- board-sot-sync` output.
- [x] Reported changed files, validations, and remaining risks.

## 2026-03-30 Gate Recovery

- [x] Updated task triplet files in this PR cycle.
- [x] PR body uses exact heading `## 🧠 Task 문서 (큰 작업이면 필수)`.
- [ ] Re-run workflow-gate after PR body update and confirm green.
