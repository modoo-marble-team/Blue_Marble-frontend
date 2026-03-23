# Context

## Current Behavior

- 저장소에는 `task-new`, `session-brief`, `self-review`, `pr-gate`는 있지만 issue/branch/commit/PR를 한 번에 실행하는 공용 명령은 없다.
- 로컬 전용 skill `.claude/skills/git-flow/SKILL.md`는 전체 흐름을 설명하지만, `.claude/`는 공용 PR에 포함하면 안 된다.
- 현재 PR 본문 규칙은 `.github/PULL_REQUEST_TEMPLATE.md`와 `scripts/ai/pr-gate.mjs`가 source of truth다.

## Related Files

- `scripts/ai/lib.mjs`
- `scripts/ai/pr-gate.mjs`
- `scripts/ai/task-new.mjs`
- `package.json`
- `docs/ai/usage.md`
- `docs/ai/quickstart.md`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- `.claude/` 경로는 로컬 전용으로 유지하고 커밋 대상에서 제외해야 한다.
- preview 모드는 네트워크 의존 없이 로컬에서 deterministic하게 동작해야 한다.
- execute 모드는 사용자 로컬 환경의 `gh` 인증과 네트워크가 정상이라는 전제에서만 동작해야 한다.
- PR body는 기존 template와 workflow gate 규칙을 깨지 않아야 한다.
- 큰 변경과 작은 변경에서 task/TODO/manual/validation 출력이 과하지 않게 구분돼야 한다.
- dirty worktree에서 다른 변경을 실수로 커밋하지 않도록 기본 스테이징은 명시 파일만 대상으로 해야 한다.

## Decision Notes

- 기본 동작은 scaffold preview로 유지하고, `--execute`일 때만 실제 `gh`/`git`를 수행한다.
- 변경 파일 분류, manual 추천, validation 추천은 기존 `scripts/ai/lib.mjs` helper를 재사용한다.
- task slug가 있으면 PR body에 실제 task/TODO 연결을 넣고, 없으면 `N/A`로 내려 small PR도 바로 쓸 수 있게 한다.
- docs-only 변경의 기본 type은 `docs`, repo automation/script 중심 변경의 기본 type은 `chore`로 고정한다.
- 실제 실행 순서는 issue 생성 -> base rebase/branch 생성 또는 existing branch 재사용 -> 명시 파일만 staging -> commit -> push 전 rebase -> push -> PR gate -> PR 생성으로 고정한다.
- rebase 충돌, staged 파일 0건, PR gate 실패는 자동 진행하지 않고 즉시 중단한다.

## Session Handoff Notes

- 다시 읽을 문서: `docs/ai/usage.md`, `docs/ai/quickstart.md`, `scripts/ai/lib.mjs`, `.github/PULL_REQUEST_TEMPLATE.md`
- 바로 이어서 할 단계: 실제 로컬 쉘에서 `--execute`로 smoke run을 해 보고 `gh issue create` / `gh pr create` 출력이 기대와 맞는지 확인한다.
- pending decision: 없음
- 검증 재개 지점: `npx vitest run scripts/ai/git-flow.test.ts`, `npm run lint`, `npm run ai:self-review -- --files ...`

## Open Risks

- 실제 GitHub API 호출은 이 세션 샌드박스가 아니라 사용자 로컬 네트워크/인증 상태에 의존한다.
- issue/PR 본문 자동 요약이 사용자 기대보다 단순하면 후속 보강이 필요할 수 있다.
