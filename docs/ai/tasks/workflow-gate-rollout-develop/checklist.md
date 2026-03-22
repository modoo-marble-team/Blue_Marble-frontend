# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] workflow gate rollout runbook를 추가했다
- [x] quickstart, usage, team-memory에 develop rollout 기준을 반영했다
- [x] GitHub external setting blocker를 문서에 남겼다
- [x] rollback 기준을 runbook에 반영했다
- [x] team announcement template과 verification / observation log 형식을 runbook에 반영했다
- [x] `develop` branch protection에 `workflow-gate` required check가 추가됐다 (GitHub UI 수동 확인)
- [x] smoke 검증용 branch `chore/workflow-gate-smoke-pr`를 origin에 push했다
- [ ] smoke PR을 제출하고 `workflow-gate` pass 결과를 확인했다
- [ ] grace period sample PR 5종 결과를 runbook log에 기록했다
- [ ] required check 적용 후 3영업일 observation log를 채웠다

## Testing

- [x] `npm run lint`
- [x] `npx vitest run scripts/ai/task-new.test.ts scripts/ai/lib.test.ts scripts/ai/pr-gate.test.ts`
- [x] `npm run ai:pr-gate -- --files src/pages/waiting-room/page/WaitingRoomPage.tsx --pr-body-file /tmp/pr-body-valid.md`
- [x] `npm run ai:pr-gate -- --mode enforce --changed-files-file /tmp/pr-gate-changed-files.txt --pr-body-file /tmp/pr-body-invalid.md`
- [x] `npm run ai:self-review -- --files docs/ai/workflow-gate-rollout.md docs/ai/quickstart.md docs/ai/usage.md docs/ai/team-memory.md docs/ai/tasks/workflow-gate-rollout-develop/plan.md docs/ai/tasks/workflow-gate-rollout-develop/context.md docs/ai/tasks/workflow-gate-rollout-develop/checklist.md TODO.md`

## Review

- [x] Planner 기준 정리 완료
- [x] Implementer 범위 구현 완료
- [x] Reviewer self-review 확인
- [x] Tester 검증 실행
- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] 리다이렉트, cleanup, 중복 구독, 에러 처리 경계를 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- workflow-gate-rollout-develop` 출력이 현재 상태와 맞는다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
