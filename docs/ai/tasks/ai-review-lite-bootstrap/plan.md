# Plan

## 목표

- PR 템플릿에 task 문서, 검증 결과, 남은 리스크를 명시하도록 보강한다.
- 비용 없는 경량 AI 리뷰 workflow를 추가해 PR마다 `ai:self-review`와 `ai:check:ui -- --plan` 결과를 자동 코멘트로 남긴다.
- 기존 CI 게이트는 유지하고, AI 리뷰는 advisory only 보조 단계로 둔다.

## 대상 파일

- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ai-review-lite.yml`
- 필요 시 이번 작업용 task 문서

## 완료 기준

- PR 템플릿에 관련 이슈, 작업 내용 외에 task 문서 링크, 실행한 검증, 남은 리스크가 구조적으로 드러난다.
- `pull_request` 이벤트에서 동작하는 경량 AI 리뷰 workflow가 추가된다.
- workflow는 changed files 기준으로 `npm run ai:self-review`와 `npm run ai:check:ui -- --plan` 결과를 PR comment에 업데이트한다.

## 최소 검증

- `npm run ai:self-review -- --files .github/PULL_REQUEST_TEMPLATE.md .github/workflows/ai-review-lite.yml docs/ai/tasks/ai-review-lite-bootstrap/plan.md docs/ai/tasks/ai-review-lite-bootstrap/context.md docs/ai/tasks/ai-review-lite-bootstrap/checklist.md`
- `npx prettier --check .github/PULL_REQUEST_TEMPLATE.md .github/workflows/ai-review-lite.yml docs/ai/tasks/ai-review-lite-bootstrap/plan.md docs/ai/tasks/ai-review-lite-bootstrap/context.md docs/ai/tasks/ai-review-lite-bootstrap/checklist.md`
