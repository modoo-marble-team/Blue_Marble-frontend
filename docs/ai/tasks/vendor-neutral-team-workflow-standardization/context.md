# Context

## Current Behavior

- 저장소의 공용 workflow 본체는 이미 `AGENTS.md`, `docs/ai/manuals/*`, `docs/rules.md`, `docs/testing.md`, `docs/ai/tasks/*`, `scripts/ai/*`에 있다.
- 직전 작업에서 `CLAUDE.md`, `.claude/*`, 폴더별 `CLAUDE.md`, `scripts/ai/claude-stop.mjs`가 추가되면서 vendor-specific runtime file이 repo에 들어왔다.
- 현재 상태에서도 Claude를 쓰지 않는 팀원은 `AGENTS.md`와 `docs/*`만으로 workflow를 수행할 수 있지만, 온보딩 문서와 showcase가 Claude adapter를 너무 전면에 보이게 만든다.

## Related Files

- `AGENTS.md`
- `README.md`
- `TODO.md`
- `docs/ai/usage.md`
- `docs/ai/team-memory.md`
- `docs/ai/tasks/README.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ai-review.yml`
- `scripts/ai/lib.mjs`
- `scripts/ai/lib.test.ts`
- `scripts/ai/self-review.mjs`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `AGENTS.md`

## Constraints

- 공용 workflow는 도구 중립적이어야 한다.
- 기존 task/TODO/session handoff 흐름은 유지해야 한다.
- 삭제 전 vendor-specific 파일에만 있던 유일한 규칙이 있으면 공용 문서로 흡수해야 한다.
- enforcement는 PR template, PR Guard, `scripts/ai/*`, Husky, CI처럼 저장소 공용 자산에서만 담당해야 한다.

## Decision Notes

- 저장소에는 tool-specific runtime file을 남기지 않고, 각 사용자가 로컬에서 공용 문서를 읽도록 연결하는 방식을 채택한다.
- `AGENTS.md`와 `docs/ai/usage.md`를 팀 공용 workflow 설명의 중심으로 올린다.
- `ai:self-review`와 PR Guard에 TODO/task slug warnings를 추가해 task queue 정합성을 자동 점검한다.

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `AGENTS.md`, `docs/ai/usage.md`, `.github/workflows/ai-review.yml`, `scripts/ai/lib.mjs`
- 바로 이어서 할 1개 단계: validation 결과를 반영해 checklist와 TODO 상태를 final state로 맞춘다.
- pending decision / blocker: 없음
- 검증 재개 지점: `npm run lint`, `npx vitest run scripts/ai/task-new.test.ts scripts/ai/lib.test.ts`, `npm run ai:self-review -- --files ...`

## Open Risks

- PR Guard의 TODO/task slug 검사는 PR 본문 작성 습관에 의존하므로, 템플릿 문구가 너무 모호하면 경고가 과하거나 약할 수 있다.
- tool-specific 파일을 제거한 뒤에도 일부 팀원이 개인 로컬 설정에서 예전 repo file을 기대하면 문서 공지가 필요할 수 있다.
