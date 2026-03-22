# Plan

## Task

- 작업 이름: Partial Workflow Gate Large Prs
- 작업 slug: partial-workflow-gate-large-prs
- 요청 날짜: 2026-03-22
- 담당 범위: shared PR gate helper, blocking workflow, 로컬 dry-run 문서화

## Goal

- 큰 PR/high-risk PR에만 task/TODO/manual/validation 근거를 부분 필수 게이트로 적용하고, 작은 PR과 docs-only PR은 가볍게 유지한다.

## WAT Workflow

1. 범위와 완료 기준을 문서로 고정한다
2. 최소 범위 구현과 필요한 문서/테스트 수정 범위를 정리한다
3. 가장 좁은 검증부터 실행하고 handoff 상태를 남긴다

## In Scope

- `scripts/ai/lib.mjs`에 shared PR gate helper 추가
- `scripts/ai/pr-gate.mjs`, `scripts/ai/pr-gate.test.ts`, `package.json`에 local dry-run 인터페이스 추가
- `.github/workflows/ai-review.yml`, `.github/workflows/workflow-gate.yml`에 comment / blocking 분리 적용
- `docs/ai/quickstart.md`, `docs/ai/usage.md`, `.github/PULL_REQUEST_TEMPLATE.md`에 gate 설명과 dry-run 예시 추가

## Out Of Scope

- branch protection required check 설정 변경
- 작은 PR/docs-only PR까지 blocking 확대
- `남은 리스크`를 hard fail 대상으로 승격

## Target Files

- `.github/workflows/workflow-gate.yml`
- `.github/workflows/ai-review.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `docs/ai/quickstart.md`
- `docs/ai/usage.md`
- `package.json`
- `scripts/ai/lib.mjs`
- `scripts/ai/lib.test.ts`
- `scripts/ai/pr-gate.mjs`
- `scripts/ai/pr-gate.test.ts`

## Task Tracking

- TODO line: - [x] `partial-workflow-gate-large-prs` - Partial Workflow Gate Large Prs (`docs/ai/tasks/partial-workflow-gate-large-prs/`)
- Session brief: `npm run ai:session:brief -- partial-workflow-gate-large-prs`
- Reopen docs: `docs/ai/tasks/partial-workflow-gate-large-prs/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- 큰 PR/high-risk PR은 task/TODO/manual/validation 근거가 없으면 `Workflow Gate`가 실패한다.
- 작은 PR과 docs-only PR은 blocking 없이 통과한다.
- `AI Review` 코멘트와 `Workflow Gate` 실패 조건이 같은 shared helper를 사용한다.
- 로컬에서 `npm run ai:pr-gate`로 같은 기준을 dry-run 할 수 있다.

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
- `npm run ai:self-review -- --files .github/workflows/ai-review.yml .github/workflows/workflow-gate.yml .github/PULL_REQUEST_TEMPLATE.md docs/ai/quickstart.md docs/ai/usage.md package.json scripts/ai/lib.mjs scripts/ai/lib.test.ts scripts/ai/pr-gate.mjs scripts/ai/pr-gate.test.ts docs/ai/tasks/partial-workflow-gate-large-prs/plan.md docs/ai/tasks/partial-workflow-gate-large-prs/context.md docs/ai/tasks/partial-workflow-gate-large-prs/checklist.md TODO.md`
