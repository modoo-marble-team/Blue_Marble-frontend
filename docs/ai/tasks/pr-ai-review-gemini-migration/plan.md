# Plan

## Task

- 작업 이름: PR AI Review Gemini migration
- 요청 날짜: 2026-03-18
- 담당 범위: GitHub PR AI review 구성 최소 전환

## Goal

- 기존 deterministic `AI Review` workflow는 유지하고, OpenAI 기반 summary 단계를 제거한다.
- GitHub App 기반 Gemini Code Assist가 PR summary와 생성형 code review를 담당할 수 있도록 repo 설정을 추가한다.

## In Scope

- `.github/workflows/ai-review.yml`에서 OpenAI summary 단계 제거
- `.gemini/config.yaml`, `.gemini/styleguide.md` 추가
- `package.json`의 `ai:review-summary` 스크립트 제거
- 관련 task 문서 작성

## Out Of Scope

- GitHub Marketplace 앱 설치
- repository secret / variable 삭제
- branch protection 정책 변경
- inline review 정책 튜닝

## Target Files

- `.github/workflows/ai-review.yml`
- `.gemini/config.yaml`
- `.gemini/styleguide.md`
- `package.json`
- `scripts/ai/review-summary.mjs`
- `scripts/ai/review-summary.test.ts`
- `docs/ai/tasks/pr-ai-review-gemini-migration/*`

## Completion Criteria

- `AI Review` workflow가 warning / validation / self-review / UI check plan만 담당한다.
- repo에 Gemini GitHub review 동작용 설정 파일이 추가된다.
- OpenAI API key/model에 의존하는 스크립트와 workflow 단계가 제거된다.
- 작업 범위와 제외 범위가 task 문서에 정리된다.

## Test Plan

- `npx prettier --check .github/workflows/ai-review.yml .gemini/config.yaml .gemini/styleguide.md package.json docs/ai/tasks/pr-ai-review-gemini-migration/plan.md docs/ai/tasks/pr-ai-review-gemini-migration/context.md docs/ai/tasks/pr-ai-review-gemini-migration/checklist.md`
- `npm run ai:self-review -- --files .github/workflows/ai-review.yml .gemini/config.yaml .gemini/styleguide.md package.json docs/ai/tasks/pr-ai-review-gemini-migration/plan.md docs/ai/tasks/pr-ai-review-gemini-migration/context.md docs/ai/tasks/pr-ai-review-gemini-migration/checklist.md`
