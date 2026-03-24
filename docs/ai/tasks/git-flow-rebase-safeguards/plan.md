# Plan

## Task

- 작업 이름: Git Flow Rebase Safeguards
- 작업 slug: git-flow-rebase-safeguards
- 요청 날짜: 2026-03-24
- 담당 범위: `ai:git-flow`의 rebase 보장 흐름을 실행 결과와 문서에서 명확히 드러내도록 정리

## Goal

- `npm run ai:git-flow -- --execute ...`를 사용할 때 branch 생성 전 / push 전 rebase가 실제로 어떻게 수행되는지 명확히 보이게 한다
- 수동 issue/commit/push 흐름으로 rebase를 놓치지 않도록 문서 가이드를 강화한다
- 스크립트/문서/테스트가 같은 rebase 정책을 설명하도록 맞춘다

## WAT Workflow

1. 범위와 완료 기준을 문서로 고정한다
2. 최소 범위 구현과 필요한 문서/테스트 수정 범위를 정리한다
3. 가장 좁은 검증부터 실행하고 handoff 상태를 남긴다

## In Scope

- `scripts/ai/git-flow.mjs`
- `scripts/ai/git-flow.test.ts`
- `docs/ai/usage.md`
- `docs/ai/quickstart.md`
- `TODO.md`

## Out Of Scope

- 실제 game/lobby/waiting-room 기능 코드 변경
- GitHub Actions 또는 pre-push hook 동작 변경
- 새로운 git-flow 단계 추가나 issue/PR 템플릿 구조 변경

## Target Files

- `scripts/ai/git-flow.mjs`
- `scripts/ai/git-flow.test.ts`
- `docs/ai/usage.md`
- `docs/ai/quickstart.md`
- `TODO.md`

## Task Tracking

- TODO line: - [ ] `git-flow-rebase-safeguards` - Git Flow Rebase Safeguards (`docs/ai/tasks/git-flow-rebase-safeguards/`)
- Session brief: `npm run ai:session:brief -- git-flow-rebase-safeguards`
- Reopen docs: `docs/ai/tasks/git-flow-rebase-safeguards/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- dry-run 출력에서 rebase 정책이 명시적으로 보인다
- 실행 결과에서 base branch, rebase target, branch 전/ push 전 rebase 여부를 확인할 수 있다
- `docs/ai/usage.md`, `docs/ai/quickstart.md`가 `--execute` 사용 시 rebase 보장을 분명히 설명한다
- 관련 Vitest와 문서 검증이 통과한다

## Role Plan

- Planner: 범위 / 완료 기준 / 참고 문서 정리
- Implementer: 최소 범위 구현
- Reviewer: diff / self-review / 위험 신호 확인
- Tester: 검증 명령 실행과 결과 정리

## Test Plan

- `npx vitest run scripts/ai/git-flow.test.ts`
- `npx prettier --check scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts docs/ai/usage.md docs/ai/quickstart.md docs/ai/tasks/git-flow-rebase-safeguards TODO.md`
- `npm run ai:self-review -- --files scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts docs/ai/usage.md docs/ai/quickstart.md docs/ai/tasks/git-flow-rebase-safeguards/plan.md docs/ai/tasks/git-flow-rebase-safeguards/context.md docs/ai/tasks/git-flow-rebase-safeguards/checklist.md TODO.md`
