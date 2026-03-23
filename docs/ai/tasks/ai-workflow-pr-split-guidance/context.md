# Context

## Current Behavior

- `docs/ai/quickstart.md`, `docs/ai/usage.md`에는 task/TODO/handoff/validation 루프가 이미 정리되어 있다.
- 다만 workflow 관련 변경을 어떤 PR 단위로 나눌지, 로컬 Claude 자산을 어떻게 다뤄야 할지는 문서를 처음 읽는 사람이 한눈에 찾기 어렵다.
- 현재 워크트리에는 `CLAUDE.md`, `.claude/*`, `.gitignore` 변경이 있어 vendor-neutral 규칙과 로컬 자산 처리 기준을 더 명확히 드러낼 필요가 있다.

## Related Files

- `README.md`
- `AGENTS.md`
- `docs/ai/quickstart.md`
- `docs/ai/usage.md`
- `docs/ai/team-memory.md`
- `docs/ai/tasks/README.md`
- `.gitignore`
- `TODO.md`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 저장소에는 vendor-neutral 자산만 남겨야 한다.
- 기존 task/TODO/session brief 루프를 다시 설명하더라도 중복 설명으로 흐름을 복잡하게 만들지 않아야 한다.
- 로컬 tool 파일 ignore는 사용자 개인 설정을 보호하는 방향이어야 하며, 팀 공용 SSOT를 대체해서는 안 된다.

## Decision Notes

- 새 문서를 추가하지 않고 README/quickstart/usage 앞부분에 repo guardrails와 PR split 기준을 보강한다.
- `CLAUDE.md`, `.claude/`는 로컬 전용으로 유지하고 `.gitignore`에서 직접 제외한다.
- PR 분할 기준은 docs-only / automation / domain manual / local-only 자산 네 가지로 정리한다.

## Session Handoff Notes

- 다시 읽을 문서: `README.md`, `docs/ai/quickstart.md`, `docs/ai/usage.md`, `docs/ai/team-memory.md`
- 바로 이어서 할 단계: docs-only PR 설명을 작성하거나 후속 automation/manual PR이 필요한지 판단한다.
- pending decision: 없음
- 검증 재개 지점: 필요 시 `npm run ai:self-review -- --files .gitignore README.md TODO.md docs/ai/quickstart.md docs/ai/usage.md docs/ai/tasks/ai-workflow-pr-split-guidance/plan.md docs/ai/tasks/ai-workflow-pr-split-guidance/context.md docs/ai/tasks/ai-workflow-pr-split-guidance/checklist.md`

## Open Risks

- quickstart와 usage에 비슷한 내용이 추가되므로 표현이 어긋나면 혼선을 만들 수 있다.
- `.gitignore`가 로컬 tool 파일만 제외하도록 유지되는지 최종 diff에서 다시 확인해야 한다.
