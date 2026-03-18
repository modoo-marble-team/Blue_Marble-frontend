# Plan

## 목표

- PR changed files와 PR 본문을 기준으로 문서 기반 워크플로우 누락을 warning으로 노출한다.
- 큰 변경인데 task 문서 링크가 없고 changed files 안에도 task 문서 3종 세트가 없거나, PR 본문에 검증/리스크 섹션이 비어 있으면 `AI Review` 코멘트에 함께 표시한다.
- `AI Review` 코멘트는 중복 로그를 줄이고, warning/required checks/suggested checks 중심으로 짧게 읽히도록 유지한다.
- warning은 advisory only로 유지하고 기존 CI 게이트를 대체하지 않는다.

## 대상 파일

- `.github/workflows/ai-review.yml`
- `docs/ai/tasks/ai-workflow-warning-gates/*`

## 완료 기준

- 큰 변경 기준이 workflow에 정의된다.
- 큰 변경인데 PR 본문 Task 섹션과 changed files 어디에도 task 문서 근거가 없으면 warning이 코멘트에 표시된다.
- `실행한 검증`, `남은 리스크` 섹션이 비어 있거나 placeholder 그대로면 warning이 표시된다.
- validation/self-review 결과가 중복 없이 짧은 요약으로 코멘트에 표시된다.

## 최소 검증

- `npx prettier --check .github/workflows/ai-review.yml docs/ai/tasks/ai-workflow-warning-gates/plan.md docs/ai/tasks/ai-workflow-warning-gates/context.md docs/ai/tasks/ai-workflow-warning-gates/checklist.md`
- `npm run ai:self-review -- --files .github/workflows/ai-review.yml docs/ai/tasks/ai-workflow-warning-gates/plan.md docs/ai/tasks/ai-workflow-warning-gates/context.md docs/ai/tasks/ai-workflow-warning-gates/checklist.md`
