# Context

## Current Behavior

- `docs/ai/quickstart.md`와 `docs/ai/usage.md`는 이미 Blue_Marble 전용 workflow guardrail을 정리하고 있다.
- `AI_WORKFLOW_SHOWCASE.md`는 팀 공용 workflow 구조 소개에는 적합하지만, 사용자가 가져온 긴 Claude Code 치트시트를 Blue_Marble 기준으로 어떻게 재해석해야 하는지까지는 직접적으로 보여주지 않는다.
- README에는 showcase 문서 진입 링크가 없어, 치트시트형 설명을 찾기 어렵다.

## Related Files

- `README.md`
- `AGENTS.md`
- `docs/ai/quickstart.md`
- `docs/ai/usage.md`
- `AI_WORKFLOW_SHOWCASE.md`
- `TODO.md`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 저장소는 vendor-neutral workflow를 유지해야 한다.
- `CLAUDE.md`, `.claude/*`, 개인 tool 설정을 repo-managed 기본 방식처럼 소개하면 안 된다.
- 기존 quickstart/usage와 충돌하는 새 규칙을 만들지 않고, 이미 있는 규칙을 치트시트 형식으로 재배열해야 한다.

## Decision Notes

- 기존 showcase 문서를 삭제/대체하지 않고, 같은 파일 경로에서 Blue_Marble 전용 치트시트로 재작성한다.
- quickstart/usage는 규칙 문서로 유지하고, showcase는 “왜 이렇게 운영하는가”를 빠르게 이해시키는 문서로 쓴다.
- README에 showcase 링크를 추가해 진입점을 보강한다.

## Session Handoff Notes

- 다시 읽을 문서: `README.md`, `AI_WORKFLOW_SHOWCASE.md`, `docs/ai/quickstart.md`, `docs/ai/usage.md`
- 바로 이어서 할 단계: 필요 시 이 치트시트를 issue/PR 본문이나 온보딩 자료로 재사용한다.
- pending decision: 없음
- 검증 재개 지점: 필요 시 `npm run ai:self-review -- --files README.md AI_WORKFLOW_SHOWCASE.md TODO.md docs/ai/tasks/blue-marble-cheatsheet-refresh/plan.md docs/ai/tasks/blue-marble-cheatsheet-refresh/context.md docs/ai/tasks/blue-marble-cheatsheet-refresh/checklist.md`

## Open Risks

- showcase 문서가 quickstart/usage와 중복되더라도 표현이 어긋나면 오히려 혼선을 만들 수 있다.
- 치트시트 톤을 유지하려다 vendor-neutral 원칙이 흐려지지 않도록 마지막 검토가 필요하다.
