# Plan

## Task

- 작업 이름: Vendor Neutral Team Workflow Standardization
- 작업 slug: vendor-neutral-team-workflow-standardization
- 요청 날짜: 2026-03-22
- 담당 범위: 공용 workflow 문서, PR/validation enforcement, vendor-specific repo 자산 제거

## Goal

- 저장소의 AI workflow를 특정 도구 파일이 아닌 `AGENTS.md`, `docs/*`, `TODO.md`, `scripts/ai/*` 중심의 팀 공용 표준으로 통일한다.

## WAT Workflow

1. 공용 source of truth를 `AGENTS.md`, `docs/ai/usage.md`, `TODO.md`, `docs/ai/tasks/*`, `scripts/ai/*`로 고정한다.
2. task/TODO/task slug 정합성을 PR template, self-review, PR Guard에서 함께 확인하게 만든다.
3. repo-managed Claude-specific runtime file을 제거하고, README/showcase/onboarding 문서를 vendor-neutral 기준으로 정리한다.

## In Scope

- `AGENTS.md`, `README.md`, `docs/ai/usage.md`, `docs/ai/team-memory.md`, `docs/ai/tasks/README.md`, `AI_WORKFLOW_SHOWCASE.md` 정리
- `scripts/ai/lib.mjs`, `scripts/ai/lib.test.ts`의 TODO/task slug warning 강화
- PR template / PR Guard의 TODO/task slug enforcement 추가
- `CLAUDE.md`, `.claude/*`, 폴더별 `CLAUDE.md`, `scripts/ai/claude-stop.mjs` 제거

## Out Of Scope

- 제품 API/런타임 코드 변경
- Husky/CI/Gemini 리뷰 구조 교체
- task scaffold 구조의 대규모 재설계
- 개인 로컬 도구 설정 예시 추가

## Target Files

- `AGENTS.md`
- `README.md`
- `docs/ai/usage.md`
- `docs/ai/team-memory.md`
- `docs/ai/tasks/README.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ai-review.yml`
- `AI_WORKFLOW_SHOWCASE.md`
- `scripts/ai/lib.mjs`
- `scripts/ai/lib.test.ts`
- `TODO.md`
- `docs/ai/tasks/vendor-neutral-team-workflow-standardization/*`

## Task Tracking

- TODO line: `- [x] vendor-neutral-team-workflow-standardization - Vendor Neutral Team Workflow Standardization (docs/ai/tasks/vendor-neutral-team-workflow-standardization/)`
- Session brief: `npm run ai:session:brief -- vendor-neutral-team-workflow-standardization`
- Reopen docs: `docs/ai/tasks/vendor-neutral-team-workflow-standardization/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- 저장소에서 tool-specific runtime file이 제거된다.
- 팀 공용 시작 경로가 `README -> AGENTS -> docs/ai/usage -> TODO -> docs/ai/tasks/README`로 정리된다.
- self-review와 PR Guard가 task/TODO/task slug 정합성을 확인한다.
- showcase와 team-memory가 vendor-neutral workflow를 설명한다.

## Role Plan

- Planner: 공용 SSOT, in/out scope, enforcement 기준 정리
- Implementer: 문서, PR template/workflow, self-review warning, 삭제 대상 정리
- Reviewer: 특정 도구 전용 규칙이 남지 않았는지 확인
- Tester: lint, Vitest, session brief, self-review, PR guard dry review 확인

## Test Plan

- `npm run lint`
- `npx vitest run scripts/ai/task-new.test.ts scripts/ai/lib.test.ts`
- `npm run ai:session:brief -- vendor-neutral-team-workflow-standardization`
- `npm run ai:self-review -- --files AGENTS.md README.md docs/ai/usage.md docs/ai/team-memory.md docs/ai/tasks/README.md .github/PULL_REQUEST_TEMPLATE.md .github/workflows/ai-review.yml AI_WORKFLOW_SHOWCASE.md scripts/ai/lib.mjs scripts/ai/lib.test.ts TODO.md docs/ai/tasks/vendor-neutral-team-workflow-standardization/plan.md docs/ai/tasks/vendor-neutral-team-workflow-standardization/context.md docs/ai/tasks/vendor-neutral-team-workflow-standardization/checklist.md package.json`
