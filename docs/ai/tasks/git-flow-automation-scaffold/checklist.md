# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] `scripts/ai`에 git-flow scaffold 명령을 추가했다
- [x] npm script와 문서 사용 예시를 연결했다
- [x] `.claude/` 비커밋 원칙을 문서에 명시했다
- [x] `--execute` / `--yes` 실행 경로를 추가했다
- [x] rebase 충돌, staged 파일 누락, PR gate 실패 중단 규칙을 구현했다
- [x] 기본 스테이징을 명시 파일만 대상으로 고정했다

## Testing

- [x] `npx vitest run scripts/ai/git-flow.test.ts`
- [x] `node scripts/ai/git-flow.mjs --files docs/ai/usage.md`
- [x] `node scripts/ai/git-flow.mjs --files src/pages/waiting-room/page/WaitingRoomPage.tsx docs/ai/tasks/waiting-room-host-transfer/plan.md docs/ai/tasks/waiting-room-host-transfer/context.md docs/ai/tasks/waiting-room-host-transfer/checklist.md --task-slug waiting-room-host-transfer --issue-number 123 --title "Waiting Room Host Transfer"`
- [x] `node scripts/ai/git-flow.mjs --files scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts package.json docs/ai/usage.md docs/ai/quickstart.md TODO.md docs/ai/tasks/git-flow-automation-scaffold/plan.md docs/ai/tasks/git-flow-automation-scaffold/context.md docs/ai/tasks/git-flow-automation-scaffold/checklist.md --task-slug git-flow-automation-scaffold --issue-number 123 --title "Git Flow Automation Scaffold" --pr-body-file /tmp/git-flow-pr-body.md`
- [x] `node scripts/ai/git-flow.mjs --json --files scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts package.json docs/ai/usage.md docs/ai/quickstart.md TODO.md docs/ai/tasks/git-flow-automation-scaffold/plan.md docs/ai/tasks/git-flow-automation-scaffold/context.md docs/ai/tasks/git-flow-automation-scaffold/checklist.md --task-slug git-flow-automation-scaffold --title "Git Flow Automation Scaffold"`
- [x] `npm run lint`
- [x] `npm run ai:check:build`
- [x] `npx prettier --check scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts package.json docs/ai/usage.md docs/ai/quickstart.md docs/ai/tasks/git-flow-automation-scaffold/plan.md docs/ai/tasks/git-flow-automation-scaffold/context.md docs/ai/tasks/git-flow-automation-scaffold/checklist.md TODO.md`
- [x] `npm run ai:self-review -- --files scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts package.json docs/ai/usage.md docs/ai/quickstart.md docs/ai/tasks/git-flow-automation-scaffold/plan.md docs/ai/tasks/git-flow-automation-scaffold/context.md docs/ai/tasks/git-flow-automation-scaffold/checklist.md TODO.md`
- [x] `npm run ai:pr-gate -- --files TODO.md docs/ai/quickstart.md docs/ai/tasks/git-flow-automation-scaffold/checklist.md docs/ai/tasks/git-flow-automation-scaffold/context.md docs/ai/tasks/git-flow-automation-scaffold/plan.md docs/ai/usage.md package.json scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts --pr-body-file /tmp/git-flow-pr-body.md`

## Review

- [x] PR body가 `.github/PULL_REQUEST_TEMPLATE.md` 구조와 맞는다
- [x] large/high-risk와 small/docs-only 출력 차이가 의도대로 동작한다
- [x] task slug와 TODO status가 맞게 연결된다
- [x] 실행형 경로가 issue -> branch -> commit -> push -> PR 순서를 지킨다
- [x] 최종 보고에 변경 파일, 실행한 검증, 남은 리스크를 남긴다
