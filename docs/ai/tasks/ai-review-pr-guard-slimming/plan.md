# Plan

## Task

- 작업 이름: AI Review PR Guard Slimming
- 요청 날짜: 2026-03-19
- 담당 범위: `AI Review` 코멘트를 경량 PR Guard로 단순화

## Goal

- `AI Review`를 CI/Gemini와 겹치지 않는 경량 PR Guard 역할로 줄인다.
- PR 본문에서 빠진 근거를 드러내는 warning만 남기고, 중복 섹션은 제거한다.

## In Scope

- `.github/workflows/ai-review.yml`
- `docs/ai/tasks/ai-review-pr-guard-slimming/*`

## Out Of Scope

- Gemini 리뷰 동작 변경
- CI 워크플로우 변경
- branch protection 정책 변경

## Completion Criteria

- `AI Review` 코멘트는 `PR 경고`만 남긴다.
- task 문서, 기준 문서, 실행한 검증, 남은 리스크 warning만 유지한다.
- self-review / validation-plan / changed files / required checks / suggested checks 출력은 제거한다.

## Test Plan

- `npx prettier --check .github/workflows/ai-review.yml docs/ai/tasks/ai-review-pr-guard-slimming/plan.md docs/ai/tasks/ai-review-pr-guard-slimming/context.md docs/ai/tasks/ai-review-pr-guard-slimming/checklist.md`
- workflow `github-script` 블록 문법 확인
