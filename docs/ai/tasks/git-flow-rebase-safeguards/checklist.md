# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] 최소 범위로 구현했다
- [x] mock/real 경로를 함께 확인했다
- [x] 타입/contract 변경이 있으면 관련 코드도 같이 수정했다

## Testing

- [x] `npx vitest run scripts/ai/git-flow.test.ts`
- [x] `npx prettier --check scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts docs/ai/usage.md docs/ai/quickstart.md docs/ai/tasks/git-flow-rebase-safeguards TODO.md`
- [x] `npm run ai:self-review -- --files scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts docs/ai/usage.md docs/ai/quickstart.md docs/ai/tasks/git-flow-rebase-safeguards/plan.md docs/ai/tasks/git-flow-rebase-safeguards/context.md docs/ai/tasks/git-flow-rebase-safeguards/checklist.md TODO.md`
- [x] `npm run lint`

## Review

- [x] Planner 기준 정리 완료
- [x] Implementer 범위 구현 완료
- [x] Reviewer self-review 확인
- [x] Tester 검증 실행
- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] 리다이렉트, cleanup, 중복 구독, 에러 처리 경계를 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- git-flow-rebase-safeguards` 출력이 현재 상태와 맞는다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
