# Context

## Current Behavior

- 현재 PR body 기반 workflow 검증 로직은 `.github/workflows/ai-review.yml` 안에 인라인으로 들어 있다.
- comment workflow만 있고 실제로 fail 시키는 blocking workflow는 없다.
- large/high-risk 판정 기준은 이미 존재하지만, 로컬에서 같은 기준을 dry-run 할 수 있는 명령이 없다.
- 2차에서 quickstart, usage, workflow audit은 정리됐지만, 큰 PR 누락을 실제로 막는 단계는 아직 없다.

## Related Files

- `.github/workflows/workflow-gate.yml`
- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `.github/workflows/ai-review.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `docs/ai/quickstart.md`
- `docs/ai/usage.md`
- `package.json`
- `scripts/ai/lib.mjs`
- `scripts/ai/lib.test.ts`
- `scripts/ai/pr-gate.mjs`
- `scripts/ai/pr-gate.test.ts`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 작은 PR과 docs-only PR은 계속 blocking 없이 통과해야 한다.
- hard fail 기준은 task 문서, TODO 연결, TODO actual slug, required manual, validation 근거 5개로 고정한다.
- `남은 리스크`는 warning-only로 유지한다.
- `AI Review` 코멘트와 `Workflow Gate` 실패 조건은 같은 shared helper를 사용해야 한다.

## Decision Notes

- PR gate 판단은 `scripts/ai/lib.mjs` helper로 올리고, comment workflow와 blocking workflow는 그 결과만 읽게 한다.
- blocking workflow는 새 `workflow-gate.yml`로 분리해 branch protection에서 required check로 연결할 여지를 만든다.
- docs-only large file count PR은 `classifyFiles(files).docsOnly`로 제외해 문서 PR이 과하게 막히지 않게 한다.
- local dry-run은 `npm run ai:pr-gate`와 `--pr-body-file` / `--changed-files-file` 인터페이스로 고정한다.

## Session Handoff Notes

- 다시 읽을 문서: `.github/workflows/ai-review.yml`, `.github/workflows/workflow-gate.yml`, `scripts/ai/lib.mjs`, `scripts/ai/pr-gate.mjs`
- 바로 이어서 할 단계: lint, Vitest, 성공/실패 dry-run fixture, self-review 결과를 반영해 checklist와 TODO 상태를 마무리한다.
- pending decision / blocker: 없음
- 검증 재개 지점: `npm run ai:pr-gate -- --mode enforce --changed-files-file /tmp/pr-gate-changed-files.txt --pr-body-file /tmp/pr-body-invalid.md`

## Open Risks

- PR body empty 상태에서 큰 PR이 바로 fail 되는 것은 의도된 동작이지만, 팀에 공지가 필요하다.
- task slug를 여러 개 넣는 PR은 warning-only로 남기므로, 운영상 계속 감시가 필요하다.
