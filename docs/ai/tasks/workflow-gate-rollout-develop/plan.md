# Plan

## Task

- 작업 이름: Workflow Gate Rollout Develop
- 작업 slug: workflow-gate-rollout-develop
- 요청 날짜: 2026-03-22
- 담당 범위: rollout runbook, 운영 안내, develop branch protection 전환 절차 문서화

## Goal

- `Workflow Gate`를 `develop` 브랜치 운영에 안전하게 전환할 수 있도록 runbook와 검증 절차를 정리하고, external blocker를 문서화한다.

## WAT Workflow

1. 범위와 완료 기준을 문서로 고정한다
2. 최소 범위 구현과 필요한 문서/테스트 수정 범위를 정리한다
3. 가장 좁은 검증부터 실행하고 handoff 상태를 남긴다

## In Scope

- `docs/ai/workflow-gate-rollout.md` 추가
- `docs/ai/quickstart.md`
- `docs/ai/usage.md`
- `docs/ai/team-memory.md`
- `TODO.md`
- `docs/ai/tasks/workflow-gate-rollout-develop/*`

## Out Of Scope

- `Workflow Gate` 정책 자체 변경
- 다른 보호 브랜치 확대
- 이 환경에서 GitHub branch protection 직접 변경

## Target Files

- `docs/ai/workflow-gate-rollout.md`
- `docs/ai/quickstart.md`
- `docs/ai/usage.md`
- `docs/ai/team-memory.md`
- `TODO.md`
- `docs/ai/tasks/workflow-gate-rollout-develop/plan.md`
- `docs/ai/tasks/workflow-gate-rollout-develop/context.md`
- `docs/ai/tasks/workflow-gate-rollout-develop/checklist.md`

## Task Tracking

- TODO line: - [ ] `workflow-gate-rollout-develop` - Workflow Gate Rollout Develop (`docs/ai/tasks/workflow-gate-rollout-develop/`)
- Session brief: `npm run ai:session:brief -- workflow-gate-rollout-develop`
- Reopen docs: `docs/ai/tasks/workflow-gate-rollout-develop/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- rollout runbook 한 문서에서 gate 대상, fail 조건, sample PR, grace period, branch protection 절차, rollback 기준을 바로 확인할 수 있다.
- quickstart, usage, team-memory가 `develop` required check 운영을 같은 방향으로 설명한다.
- 이 환경에서 GitHub settings를 직접 못 바꾸는 blocker가 task 문서와 runbook에 명시된다.

## Role Plan

- Planner: 범위 / 완료 기준 / 참고 문서 정리
- Implementer: 최소 범위 구현
- Reviewer: diff / self-review / 위험 신호 확인
- Tester: 검증 명령 실행과 결과 정리

## Test Plan

- `npm run lint`
- `npx vitest run scripts/ai/task-new.test.ts scripts/ai/lib.test.ts scripts/ai/pr-gate.test.ts`
- `npm run ai:pr-gate -- --files src/pages/waiting-room/page/WaitingRoomPage.tsx --pr-body-file /tmp/pr-body-valid.md`
- `npm run ai:pr-gate -- --mode enforce --changed-files-file /tmp/pr-gate-changed-files.txt --pr-body-file /tmp/pr-body-invalid.md`
- `npm run ai:self-review -- --files docs/ai/workflow-gate-rollout.md docs/ai/quickstart.md docs/ai/usage.md docs/ai/team-memory.md docs/ai/tasks/workflow-gate-rollout-develop/plan.md docs/ai/tasks/workflow-gate-rollout-develop/context.md docs/ai/tasks/workflow-gate-rollout-develop/checklist.md TODO.md`
