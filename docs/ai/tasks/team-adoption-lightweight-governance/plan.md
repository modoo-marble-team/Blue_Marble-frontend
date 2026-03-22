# Plan

## Task

- 작업 이름: Team Adoption Lightweight Governance
- 작업 slug: team-adoption-lightweight-governance
- 요청 날짜: 2026-03-22
- 담당 범위: quickstart 문서, issue intake, workflow audit, 운영 루프 문서화

## Goal

- vendor-neutral workflow 1차 구조를 팀이 실제로 따라가기 쉽게 만들고, 경고 전용 audit로 운영 정합성을 점검할 수 있게 한다.

## WAT Workflow

1. 범위와 완료 기준을 문서로 고정한다
2. 최소 범위 구현과 필요한 문서/테스트 수정 범위를 정리한다
3. 가장 좁은 검증부터 실행하고 handoff 상태를 남긴다

## In Scope

- `docs/ai/quickstart.md` 추가
- `README.md`, `docs/ai/usage.md`, `docs/ai/tasks/README.md`, `docs/ai/team-memory.md`, `AI_WORKFLOW_SHOWCASE.md`에 2차 운영 루프 반영
- `.github/ISSUE_TEMPLATE/*`에 큰 작업 / 작은 작업 기준과 workflow intake 추가
- `scripts/ai/workflow-audit.mjs`, `package.json`, `scripts/ai/lib.mjs`, `scripts/ai/lib.test.ts`에 soft audit 추가

## Out Of Scope

- 제품 API/런타임 변경
- CI fail gate 강화
- tool-specific 로컬 설정 추가

## Target Files

- `docs/ai/quickstart.md`
- `README.md`
- `docs/ai/usage.md`
- `docs/ai/tasks/README.md`
- `docs/ai/team-memory.md`
- `AI_WORKFLOW_SHOWCASE.md`
- `.github/ISSUE_TEMPLATE/chore.md`
- `.github/ISSUE_TEMPLATE/docs.md`
- `.github/ISSUE_TEMPLATE/test.md`
- `.github/ISSUE_TEMPLATE/feat.md`
- `.github/ISSUE_TEMPLATE/fix.md`
- `.github/ISSUE_TEMPLATE/refactor.md`
- `.github/ISSUE_TEMPLATE/hotfix.md`
- `.github/ISSUE_TEMPLATE/build.md`
- `package.json`
- `scripts/ai/lib.mjs`
- `scripts/ai/lib.test.ts`
- `scripts/ai/workflow-audit.mjs`

## Task Tracking

- TODO line: - [ ] `team-adoption-lightweight-governance` - Team Adoption Lightweight Governance (`docs/ai/tasks/team-adoption-lightweight-governance/`)
- Session brief: `npm run ai:session:brief -- team-adoption-lightweight-governance`
- Reopen docs: `docs/ai/tasks/team-adoption-lightweight-governance/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- 새 팀원이 `README -> quickstart -> task:new -> session:brief -> PR template` 흐름을 구두 설명 없이 따라갈 수 있다.
- non-trivial issue 템플릿에서 task slug, manual, validation 초안을 바로 적을 수 있다.
- `npm run ai:workflow:audit`가 queue-managed task workspace와 `TODO.md` 정합성 경고를 보여준다.
- 2차 운영 문서가 warning-only governance를 일관되게 설명한다.

## Role Plan

- Planner: 범위 / 완료 기준 / 참고 문서 정리
- Implementer: 최소 범위 구현
- Reviewer: diff / self-review / 위험 신호 확인
- Tester: 검증 명령 실행과 결과 정리

## Test Plan

- `npm run lint`
- `npx vitest run scripts/ai/task-new.test.ts scripts/ai/lib.test.ts`
- `npm run ai:workflow:audit`
- `npm run ai:session:brief -- team-adoption-lightweight-governance`
- `npm run ai:self-review -- --files README.md docs/ai/quickstart.md docs/ai/usage.md docs/ai/tasks/README.md docs/ai/team-memory.md AI_WORKFLOW_SHOWCASE.md .github/ISSUE_TEMPLATE/chore.md .github/ISSUE_TEMPLATE/docs.md .github/ISSUE_TEMPLATE/test.md .github/ISSUE_TEMPLATE/feat.md .github/ISSUE_TEMPLATE/fix.md .github/ISSUE_TEMPLATE/refactor.md .github/ISSUE_TEMPLATE/hotfix.md .github/ISSUE_TEMPLATE/build.md package.json scripts/ai/lib.mjs scripts/ai/lib.test.ts scripts/ai/workflow-audit.mjs docs/ai/tasks/team-adoption-lightweight-governance/plan.md docs/ai/tasks/team-adoption-lightweight-governance/context.md docs/ai/tasks/team-adoption-lightweight-governance/checklist.md TODO.md`
