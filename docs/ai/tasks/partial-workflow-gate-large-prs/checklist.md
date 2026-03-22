# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] shared PR gate helper와 CLI를 추가했다
- [x] comment workflow와 blocking workflow를 분리했다
- [x] quickstart, usage, PR template에 large PR gate 설명을 반영했다

## Testing

- [x] `npm run lint`
- [x] `npx vitest run scripts/ai/task-new.test.ts scripts/ai/lib.test.ts scripts/ai/pr-gate.test.ts`
- [x] `npm run ai:pr-gate -- --files src/pages/waiting-room/page/WaitingRoomPage.tsx --pr-body-file /tmp/pr-body-valid.md`
- [x] `npm run ai:pr-gate -- --mode enforce --changed-files-file /tmp/pr-gate-changed-files.txt --pr-body-file /tmp/pr-body-invalid.md`
- [x] `npm run ai:self-review -- --files .github/workflows/ai-review.yml .github/workflows/workflow-gate.yml .github/PULL_REQUEST_TEMPLATE.md docs/ai/quickstart.md docs/ai/usage.md package.json scripts/ai/lib.mjs scripts/ai/lib.test.ts scripts/ai/pr-gate.mjs scripts/ai/pr-gate.test.ts docs/ai/tasks/partial-workflow-gate-large-prs/plan.md docs/ai/tasks/partial-workflow-gate-large-prs/context.md docs/ai/tasks/partial-workflow-gate-large-prs/checklist.md TODO.md`

## Review

- [x] Planner 기준 정리 완료
- [x] Implementer 범위 구현 완료
- [x] Reviewer self-review 확인
- [x] Tester 검증 실행
- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] 리다이렉트, cleanup, 중복 구독, 에러 처리 경계를 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- partial-workflow-gate-large-prs` 출력이 현재 상태와 맞는다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
