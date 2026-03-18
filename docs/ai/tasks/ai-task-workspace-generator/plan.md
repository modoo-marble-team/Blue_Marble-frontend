# Plan

## Task

- 작업 이름: AI task workspace generator
- 요청 날짜: 2026-03-18
- 담당 범위: `scripts/ai`, `package.json`, `docs/ai/tasks`

## Goal

- `docs/ai/tasks/<slug>/plan.md`, `context.md`, `checklist.md`를 빠르게 만들 수 있는 생성 스크립트를 추가한다.
- 단순 템플릿 복사에 그치지 않고, 입력 파일 기준 manual/검증 초안을 함께 넣어 실제 사용 마찰을 줄인다.

## In Scope

- `npm run ai:task:new -- <slug> [--files ...]` 스크립트 추가
- template 기반 task 문서 3종 생성
- 입력 파일 기준 Target Files, Related Files, 최소 검증 명령 초안 생성
- 관련 테스트와 문서 보강

## Out Of Scope

- 이미 존재하는 task 문서를 자동 병합/업데이트하는 기능
- PR 본문 자동 작성
- git 브랜치/이슈 자동 생성

## Target Files

- `scripts/ai/task-new.mjs`
- `scripts/ai/task-new.test.ts`
- `package.json`
- `docs/ai/tasks/README.md`
- `docs/ai/tasks/ai-task-workspace-generator/*`

## Completion Criteria

- `npm run ai:task:new -- example-slug` 실행 시 task 문서 3종이 생성된다.
- `--files`를 주면 관련 manual과 최소 검증 명령 초안이 문서에 반영된다.
- 기존 template 구조를 유지하면서도 바로 편집 가능한 문서가 나온다.

## Test Plan

- `npx vitest run scripts/ai/task-new.test.ts`
- `npx prettier --check scripts/ai/task-new.mjs scripts/ai/task-new.test.ts package.json docs/ai/tasks/README.md docs/ai/tasks/ai-task-workspace-generator/plan.md docs/ai/tasks/ai-task-workspace-generator/context.md docs/ai/tasks/ai-task-workspace-generator/checklist.md`
- `npm run ai:self-review -- --files scripts/ai/task-new.mjs scripts/ai/task-new.test.ts package.json docs/ai/tasks/README.md docs/ai/tasks/ai-task-workspace-generator/plan.md docs/ai/tasks/ai-task-workspace-generator/context.md docs/ai/tasks/ai-task-workspace-generator/checklist.md`
