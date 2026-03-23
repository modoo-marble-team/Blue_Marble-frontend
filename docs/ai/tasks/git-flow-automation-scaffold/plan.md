# Plan

## Task

- 작업 이름: Git Flow Automation Scaffold
- 작업 slug: git-flow-automation-scaffold
- 요청 날짜: 2026-03-23
- 담당 범위: `scripts/ai`에 실행형 git-flow 명령 추가, npm script 연결, 공용 workflow 문서에 preview/execute 사용법 반영

## Goal

- 로컬 전용 `.claude/skills/git-flow/SKILL.md`의 흐름을 참고해 저장소 안에서 재현 가능한 실행형 git-flow 명령을 추가한다.
- issue 제목/본문, branch 이름, commit 메시지, PR 제목/본문을 현재 changed files와 task slug 기준으로 일관되게 생성하고 실제 실행까지 연결한다.
- `.claude/`를 커밋하지 않고도 git-flow 자동화 실험을 repo 공용 문서와 스크립트로 검증할 수 있게 만든다.

## WAT Workflow

1. 현재 `scripts/ai`의 helper와 PR gate 규칙을 재사용할 수 있는 범위를 확인한다.
2. preview와 execute를 분리해, 기본값은 안전한 출력이고 `--execute`에서만 실제 `gh`/`git`를 수행한다.
3. 변경 파일 분류, task/TODO 연결, manual/validation 추천이 PR body에 자연스럽게 반영되도록 한다.
4. rebase 충돌, PR gate 실패, staged 파일 누락은 즉시 중단하고 수동 복구 명령을 안내한다.

## In Scope

- `scripts/ai/git-flow.mjs`
- `scripts/ai/git-flow.test.ts`
- `package.json`
- `docs/ai/usage.md`
- `docs/ai/quickstart.md`
- `TODO.md`
- `docs/ai/tasks/git-flow-automation-scaffold/plan.md`
- `docs/ai/tasks/git-flow-automation-scaffold/context.md`
- `docs/ai/tasks/git-flow-automation-scaffold/checklist.md`

## Out Of Scope

- `.claude/skills/git-flow/SKILL.md` 자체를 저장소 PR에 포함하는 작업
- branch protection, Actions 권한, GitHub UI 설정 자동화

## Target Files

- `scripts/ai/git-flow.mjs`
- `scripts/ai/git-flow.test.ts`
- `package.json`
- `docs/ai/usage.md`
- `docs/ai/quickstart.md`

## Task Tracking

- TODO line: - [ ] `git-flow-automation-scaffold` - Git Flow Automation Scaffold (`docs/ai/tasks/git-flow-automation-scaffold/`) - 로컬 git-flow skill을 저장소 공용 issue/branch/commit/PR scaffold로 옮기고 테스트 가능하게 정리
- Session brief: `npm run ai:session:brief -- git-flow-automation-scaffold`
- Reopen docs: `docs/ai/tasks/git-flow-automation-scaffold/plan.md`, `context.md`, `checklist.md`, `docs/ai/usage.md`, `docs/ai/quickstart.md`

## Completion Criteria

- `npm run ai:git-flow -- --files ...` 명령으로 issue/branch/commit/PR scaffold를 생성할 수 있다.
- `npm run ai:git-flow -- --execute ...` 명령으로 issue 생성, branch 생성/전환, 명시 파일 스테이징, commit, push, PR 생성을 단계별 확인 후 실제 실행할 수 있다.
- large/high-risk PR일 때는 task 문서, TODO 연결, manual, validation 근거가 PR body에 포함된다.
- docs-only나 작은 변경에서는 task/TODO 섹션이 `N/A`로 내려간다.
- 사용법과 `.claude/` 비커밋 원칙, `--execute` / `--yes` 실행 원칙이 공용 문서에 반영된다.

## Role Plan

- Planner: 로컬 skill과 저장소 공용 workflow의 경계를 정리
- Implementer: scaffold 명령과 테스트 구현
- Reviewer: PR gate와 task/TODO/manual 규칙 일치 여부 확인
- Tester: 대상 Vitest, dry-run 명령, self-review 결과 정리

## Test Plan

- `npx vitest run scripts/ai/git-flow.test.ts`
- `node scripts/ai/git-flow.mjs --files docs/ai/usage.md`
- `node scripts/ai/git-flow.mjs --files src/pages/waiting-room/page/WaitingRoomPage.tsx docs/ai/tasks/waiting-room-host-transfer/plan.md docs/ai/tasks/waiting-room-host-transfer/context.md docs/ai/tasks/waiting-room-host-transfer/checklist.md --task-slug waiting-room-host-transfer --issue-number 123 --title "Waiting Room Host Transfer"`
- `node scripts/ai/git-flow.mjs --json --files scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts package.json docs/ai/usage.md docs/ai/quickstart.md TODO.md docs/ai/tasks/git-flow-automation-scaffold/plan.md docs/ai/tasks/git-flow-automation-scaffold/context.md docs/ai/tasks/git-flow-automation-scaffold/checklist.md --task-slug git-flow-automation-scaffold --title "Git Flow Automation Scaffold"`
- `npm run ai:self-review -- --files scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts package.json docs/ai/usage.md docs/ai/quickstart.md docs/ai/tasks/git-flow-automation-scaffold/plan.md docs/ai/tasks/git-flow-automation-scaffold/context.md docs/ai/tasks/git-flow-automation-scaffold/checklist.md TODO.md`
