# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] quickstart, usage, task README, showcase에 2차 운영 루프를 반영했다
- [x] issue template에 workflow intake 기준을 추가했다
- [x] workflow audit 스크립트와 helper를 추가했다

## Testing

- [x] `npm run lint`
- [x] `npx vitest run scripts/ai/task-new.test.ts scripts/ai/lib.test.ts`
- [x] `npm run ai:workflow:audit`
- [x] `npm run ai:session:brief -- team-adoption-lightweight-governance`
- [x] `npm run ai:self-review -- --files README.md docs/ai/quickstart.md docs/ai/usage.md docs/ai/tasks/README.md docs/ai/team-memory.md AI_WORKFLOW_SHOWCASE.md .github/ISSUE_TEMPLATE/chore.md .github/ISSUE_TEMPLATE/docs.md .github/ISSUE_TEMPLATE/test.md .github/ISSUE_TEMPLATE/feat.md .github/ISSUE_TEMPLATE/fix.md .github/ISSUE_TEMPLATE/refactor.md .github/ISSUE_TEMPLATE/hotfix.md .github/ISSUE_TEMPLATE/build.md package.json scripts/ai/lib.mjs scripts/ai/lib.test.ts scripts/ai/workflow-audit.mjs docs/ai/tasks/team-adoption-lightweight-governance/plan.md docs/ai/tasks/team-adoption-lightweight-governance/context.md docs/ai/tasks/team-adoption-lightweight-governance/checklist.md TODO.md`

## Review

- [x] Planner 기준 정리 완료
- [x] Implementer 범위 구현 완료
- [x] Reviewer self-review 확인
- [x] Tester 검증 실행
- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] 리다이렉트, cleanup, 중복 구독, 에러 처리 경계를 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- team-adoption-lightweight-governance` 출력이 현재 상태와 맞는다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
