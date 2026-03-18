# Plan

## 목표

- PR changed files 기준으로 필요한 검증을 `required`와 `suggested`로 구조화해 자동 표시한다.
- 기존 `AI Review` 코멘트의 self-review / warning gate 흐름은 유지하면서, 검증 전략이 더 직접적으로 보이게 만든다.
- deterministic한 분류 규칙만 사용하고, 실제 검증 강제 실행은 이번 범위에서 제외한다.

## 대상 파일

- `scripts/ai/lib.mjs`
- `scripts/ai/validation-plan.mjs`
- `package.json`
- `.github/workflows/ai-review.yml`

## 완료 기준

- changed files 기준 `required`와 `suggested` 검증 스크립트를 계산할 수 있다.
- `AI Review` 코멘트에 `Validation Orchestration` 섹션이 추가된다.
- `lobby / waiting-room / game / UI / config` 변경 시 관련 검증 전략이 구조적으로 표시된다.

## 최소 검증

- `npx prettier --check scripts/ai/lib.mjs scripts/ai/validation-plan.mjs package.json .github/workflows/ai-review.yml docs/ai/tasks/ai-review-validation-orchestration/plan.md docs/ai/tasks/ai-review-validation-orchestration/context.md docs/ai/tasks/ai-review-validation-orchestration/checklist.md`
- `node scripts/ai/validation-plan.mjs --files src/pages/lobby/LobbyPage.tsx`
- `node scripts/ai/validation-plan.mjs --files src/pages/waiting-room/page/WaitingRoomPage.tsx`
- `npm run ai:self-review -- --files scripts/ai/lib.mjs scripts/ai/validation-plan.mjs package.json .github/workflows/ai-review.yml docs/ai/tasks/ai-review-validation-orchestration/plan.md docs/ai/tasks/ai-review-validation-orchestration/context.md docs/ai/tasks/ai-review-validation-orchestration/checklist.md`
