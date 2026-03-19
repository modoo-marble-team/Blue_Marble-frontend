# Plan

## Task

- 작업 이름: Pr Template Pr Guard Alignment
- 요청 날짜: 2026-03-19
- 담당 범위: 입력 파일 기준 초안 생성

## Goal

- PR 템플릿이 현재 PR Guard 경고 기준과 어긋나 팀원이 placeholder를 그대로 두고도 통과할 것처럼 보이는 문제를 줄인다.
- 템플릿에서 실제로 필요한 섹션과 예시만 남겨, 팀원이 PR Guard 경고 없이 PR을 작성하기 쉽게 만든다.

## In Scope

- `.github/PULL_REQUEST_TEMPLATE.md`

## Out Of Scope

- PR Guard workflow 로직 변경
- 새로운 검사 항목 추가
- PR 본문 자동 생성 도구 추가

## Target Files

- `.github/PULL_REQUEST_TEMPLATE.md`

## Completion Criteria

- 템플릿에서 PR Guard가 실제로 검사하는 `Task 문서`, `참고한 기준 문서`, `실행한 검증`, `남은 리스크` 안내가 더 명확해진다.
- `역할 수행`처럼 현재 PR Guard가 검사하지 않는 섹션은 제거하거나 optional로 내려 팀 혼선을 줄인다.
- placeholder를 그대로 둬도 통과할 것처럼 보이던 예시를 blockquote 설명으로 바꿔, 실제 내용을 입력해야 한다는 점이 드러난다.

## Role Plan

- Planner: 범위 / 완료 기준 / 참고 문서 정리
- Implementer: 최소 범위 구현
- Reviewer: diff / self-review / 위험 신호 확인
- Tester: 검증 명령 실행과 결과 정리

## Test Plan

- `npx prettier --check .github/PULL_REQUEST_TEMPLATE.md`
- `npm run ai:self-review -- --files .github/PULL_REQUEST_TEMPLATE.md docs/ai/tasks/pr-template-pr-guard-alignment/plan.md docs/ai/tasks/pr-template-pr-guard-alignment/context.md docs/ai/tasks/pr-template-pr-guard-alignment/checklist.md`
