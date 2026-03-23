# Plan

## Task

- 작업 이름: Blue Marble Cheatsheet Refresh
- 작업 slug: blue-marble-cheatsheet-refresh
- 요청 날짜: 2026-03-23
- 담당 범위: AI workflow showcase 문서를 Blue_Marble 전용 치트시트로 재작성

## Goal

- 일반 Claude Code 팁을 이 저장소의 vendor-neutral workflow 기준으로 다시 해석해, 팀 공용 규칙과 개인 도구 활용을 명확히 분리한 치트시트를 제공한다.

## WAT Workflow

1. 기존 workflow 문서와 showcase 문서가 이미 다루는 내용과 비어 있는 내용을 확인한다.
2. `AI_WORKFLOW_SHOWCASE.md`를 Blue_Marble 기준 치트시트로 재작성하고 README 진입 링크를 맞춘다.
3. task workspace, TODO, 검증 결과를 현재 문서 상태와 맞춘다.

## In Scope

- `AI_WORKFLOW_SHOWCASE.md` 전면 재작성
- `README.md`에 showcase 진입 링크 추가
- task workspace와 `TODO.md` 연결

## Out Of Scope

- `docs/ai/quickstart.md`, `docs/ai/usage.md`의 상세 운영 규칙 재설계
- `scripts/ai/*` 동작 변경
- `.claude/*` 또는 기타 tool-specific runtime file 추가

## Target Files

- `AI_WORKFLOW_SHOWCASE.md`
- `README.md`
- `TODO.md`
- `docs/ai/tasks/blue-marble-cheatsheet-refresh/plan.md`
- `docs/ai/tasks/blue-marble-cheatsheet-refresh/context.md`
- `docs/ai/tasks/blue-marble-cheatsheet-refresh/checklist.md`

## Task Tracking

- TODO line: - [x] `blue-marble-cheatsheet-refresh` - Blue Marble Cheatsheet Refresh (`docs/ai/tasks/blue-marble-cheatsheet-refresh/`)
- Session brief: `npm run ai:session:brief -- blue-marble-cheatsheet-refresh`
- Reopen docs: `AI_WORKFLOW_SHOWCASE.md`, `README.md`, `docs/ai/tasks/blue-marble-cheatsheet-refresh/{plan,context,checklist}.md`

## Completion Criteria

- showcase 문서를 읽으면 Blue_Marble 기준으로 “팀 공용 규칙”과 “개인 Claude 활용”의 경계가 명확해진다.
- `AGENTS.md`, `docs/ai/quickstart.md`, `docs/ai/usage.md`와 충돌하지 않는다.
- README에서 치트시트 진입이 가능하다.

## Role Plan

- Planner: 기존 문서 구조와 충돌 지점 정리
- Implementer: showcase/README/task 문서 최소 범위 수정
- Reviewer: vendor-neutral 규칙과 문구 충돌 여부 점검
- Tester: self-review / session brief / workflow audit 확인

## Test Plan

- `npm run ai:workflow:audit`
- `npm run ai:session:brief -- blue-marble-cheatsheet-refresh`
- `npm run ai:self-review -- --files README.md AI_WORKFLOW_SHOWCASE.md TODO.md docs/ai/tasks/blue-marble-cheatsheet-refresh/plan.md docs/ai/tasks/blue-marble-cheatsheet-refresh/context.md docs/ai/tasks/blue-marble-cheatsheet-refresh/checklist.md`
