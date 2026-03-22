# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] 최소 범위로 구현했다
- [x] mock/real 경로를 함께 확인했다
- [x] 타입/contract 변경이 있으면 관련 코드도 같이 수정했다

## Testing

- [x] `npm run lint`
- [x] `npx vitest run scripts/ai/task-new.test.ts scripts/ai/lib.test.ts`
- [x] `npm run ai:session:brief -- vendor-neutral-team-workflow-standardization`
- [x] `npm run ai:self-review -- --files AGENTS.md README.md docs/ai/usage.md docs/ai/team-memory.md docs/ai/tasks/README.md .github/PULL_REQUEST_TEMPLATE.md .github/workflows/ai-review.yml AI_WORKFLOW_SHOWCASE.md scripts/ai/lib.mjs scripts/ai/lib.test.ts TODO.md docs/ai/tasks/vendor-neutral-team-workflow-standardization/plan.md docs/ai/tasks/vendor-neutral-team-workflow-standardization/context.md docs/ai/tasks/vendor-neutral-team-workflow-standardization/checklist.md package.json`

## Review

- [x] Planner 기준 정리 완료
- [x] Implementer 범위 구현 완료
- [x] Reviewer self-review 확인
- [x] Tester 검증 실행
- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] 리다이렉트, cleanup, 중복 구독, 에러 처리 경계를 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- vendor-neutral-team-workflow-standardization` 출력이 현재 상태와 맞는다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
