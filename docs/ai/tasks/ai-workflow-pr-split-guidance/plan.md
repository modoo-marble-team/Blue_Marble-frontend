# Plan

## Task

- 작업 이름: AI Workflow PR Split Guidance
- 작업 slug: ai-workflow-pr-split-guidance
- 요청 날짜: 2026-03-23
- 담당 범위: workflow 문서의 repo guardrails/PR 분할 기준 보강, 로컬 Claude 자산 비커밋 정렬

## Goal

- 새 팀원이 workflow 변경을 어떤 단위로 PR로 나눌지 바로 판단할 수 있게 하고, 로컬 Claude 자산이 공용 저장소로 들어오지 않도록 운영 규칙을 더 앞쪽 문서에 드러낸다.

## WAT Workflow

1. 기존 workflow 문서와 vendor-neutral 규칙을 다시 확인한다.
2. README, quickstart, usage에 repo guardrails와 PR split 기준을 최소 범위로 반영한다.
3. 로컬 Claude 자산 ignore를 정렬하고 task/TODO/validation 상태를 맞춘다.

## In Scope

- `README.md`에 SSOT와 로컬 tool 파일 비커밋 규칙 추가
- `docs/ai/quickstart.md`에 repo guardrails와 PR split 기준 추가
- `docs/ai/usage.md`에 repo guardrails와 PR split guidelines 추가
- `.gitignore`에 `CLAUDE.md`, `.claude/` 로컬 ignore 반영
- task workspace와 `TODO.md` 정합성 유지

## Out Of Scope

- `scripts/ai/*` 동작 변경
- GitHub workflow / gate 로직 변경
- 제품 코드 또는 도메인 manual의 계약 수정

## Target Files

- `.gitignore`
- `README.md`
- `TODO.md`
- `docs/ai/quickstart.md`
- `docs/ai/usage.md`
- `docs/ai/tasks/ai-workflow-pr-split-guidance/plan.md`
- `docs/ai/tasks/ai-workflow-pr-split-guidance/context.md`
- `docs/ai/tasks/ai-workflow-pr-split-guidance/checklist.md`

## Task Tracking

- TODO line: - [x] `ai-workflow-pr-split-guidance` - AI Workflow PR Split Guidance (`docs/ai/tasks/ai-workflow-pr-split-guidance/`)
- Session brief: `npm run ai:session:brief -- ai-workflow-pr-split-guidance`
- Reopen docs: `docs/ai/tasks/ai-workflow-pr-split-guidance/plan.md`, `context.md`, `checklist.md`, `docs/ai/quickstart.md`, `docs/ai/usage.md`

## Completion Criteria

- README/quickstart/usage를 읽으면 workflow 변경을 docs-only PR / automation PR / manual PR / local-only 자산으로 나누는 기준이 드러난다.
- `CLAUDE.md`, `.claude/`가 로컬 전용이라는 규칙이 문서와 ignore 양쪽에서 일관되게 보인다.
- `TODO.md`와 task workspace, session brief 출력이 현재 상태와 맞는다.

## Role Plan

- Planner: 범위와 PR 분할 기준을 정리
- Implementer: README/quickstart/usage/.gitignore 최소 범위 수정
- Reviewer: vendor-neutral 규칙과 문서 간 일관성 확인
- Tester: workflow audit, session brief, self-review 결과 확인

## Test Plan

- `npm run ai:workflow:audit`
- `npm run ai:session:brief -- ai-workflow-pr-split-guidance`
- `npm run ai:self-review -- --files .gitignore README.md TODO.md docs/ai/quickstart.md docs/ai/usage.md docs/ai/tasks/ai-workflow-pr-split-guidance/plan.md docs/ai/tasks/ai-workflow-pr-split-guidance/context.md docs/ai/tasks/ai-workflow-pr-split-guidance/checklist.md`
