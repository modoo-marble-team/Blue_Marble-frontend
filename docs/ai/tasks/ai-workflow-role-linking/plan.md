# Plan

## Task

- 작업 이름: Ai Workflow Role Linking
- 요청 날짜: 2026-03-18
- 담당 범위: 입력 파일 기준 초안 생성

## Goal

- PR 본문에서 참고한 기준 문서, 역할 수행, 검증 증빙이 같이 보이도록 구조를 보강한다.
- `ai:task:new`가 같은 구조를 미리 채워 task 문서 작성 마찰을 줄이게 한다.
- `AI Review`가 큰 변경에서 해당 흔적이 비어 있으면 warning으로 드러내도록 연결한다.

## In Scope

- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ai-review.yml`
- `scripts/ai/task-new.mjs`
- `package.json`
- `docs/ai/tasks/README.md`

## Out Of Scope

- 생성형 리뷰 확장
- branch protection 강제
- roles 전용 별도 실행 엔진

## Target Files

- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ai-review.yml`
- `scripts/ai/task-new.mjs`
- `package.json`
- `docs/ai/tasks/README.md`

## Completion Criteria

- PR 템플릿에 참고한 기준 문서 / 역할 수행 섹션이 추가된다.
- `ai:task:new`가 role plan / relevant manuals / review 역할 체크를 포함한 문서를 생성한다.
- `AI Review`가 큰 변경에서 기준 문서, Reviewer/Tester 흔적, required check 증빙 누락을 warning으로 표시한다.

## Role Plan

- Planner: PR 템플릿과 workflow가 검사할 기준을 먼저 정의
- Implementer: task 생성기와 workflow 연결 구현
- Reviewer: warning 기준과 코멘트 노이즈 확인
- Tester: 관련 테스트와 self-review 실행

## Test Plan

- `npx vitest run scripts/ai/task-new.test.ts`
- `npx prettier --check .github/PULL_REQUEST_TEMPLATE.md .github/workflows/ai-review.yml scripts/ai/task-new.mjs scripts/ai/task-new.test.ts docs/ai/tasks/README.md docs/ai/tasks/ai-workflow-role-linking/plan.md docs/ai/tasks/ai-workflow-role-linking/context.md docs/ai/tasks/ai-workflow-role-linking/checklist.md`
- `npm run ai:self-review -- --files .github/PULL_REQUEST_TEMPLATE.md .github/workflows/ai-review.yml scripts/ai/task-new.mjs scripts/ai/task-new.test.ts docs/ai/tasks/README.md docs/ai/tasks/ai-workflow-role-linking/plan.md docs/ai/tasks/ai-workflow-role-linking/context.md docs/ai/tasks/ai-workflow-role-linking/checklist.md`
