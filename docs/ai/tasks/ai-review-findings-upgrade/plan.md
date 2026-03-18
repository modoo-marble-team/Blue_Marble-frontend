# Plan

## 목표

- `AI Review` 코멘트가 단순 체크 계획 출력이 아니라, diff 기준의 `Findings`와 `Test Gaps`를 먼저 보여주도록 바꾼다.
- 기존 warning gate와 validation plan은 유지하되, 중복 로그보다 실제 위험 신호가 먼저 읽히게 만든다.
- repo 전용 deterministic 리뷰어 역할을 강화해 Gemini summary와 역할이 겹치지 않게 한다.

## 대상 파일

- `scripts/ai/lib.mjs`
- `scripts/ai/self-review.mjs`
- `.github/workflows/ai-review.yml`
- `scripts/ai/lib.test.ts`

## 완료 기준

- self-review 출력에 `Findings`, `Test Gaps` 섹션이 추가된다.
- auth transport / lobby / waiting-room / game / socket 변경에 대해 최소한의 deterministic review 규칙이 동작한다.
- PR 코멘트가 `Workflow Warnings -> Findings -> Test Gaps -> Required/Suggested Checks` 순서로 짧게 읽힌다.
- 관련 테스트가 추가되어 review 규칙의 기본 동작을 검증한다.

## 최소 검증

- `npx vitest run scripts/ai/lib.test.ts`
- `npx prettier --check scripts/ai/lib.mjs scripts/ai/self-review.mjs scripts/ai/lib.test.ts .github/workflows/ai-review.yml docs/ai/tasks/ai-review-findings-upgrade/plan.md docs/ai/tasks/ai-review-findings-upgrade/context.md docs/ai/tasks/ai-review-findings-upgrade/checklist.md`
- `npm run ai:self-review -- --files scripts/ai/lib.mjs scripts/ai/self-review.mjs .github/workflows/ai-review.yml scripts/ai/lib.test.ts docs/ai/tasks/ai-review-findings-upgrade/plan.md docs/ai/tasks/ai-review-findings-upgrade/context.md docs/ai/tasks/ai-review-findings-upgrade/checklist.md`
