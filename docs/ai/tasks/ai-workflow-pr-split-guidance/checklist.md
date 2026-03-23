# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] README, quickstart, usage에 repo guardrails와 PR split 기준을 반영했다
- [x] `.gitignore`에 로컬 Claude 자산 ignore를 반영했다
- [x] task workspace와 `TODO.md`를 연결했다

## Testing

- [x] `npm run ai:workflow:audit`
- [x] `npm run ai:session:brief -- ai-workflow-pr-split-guidance`
- [x] `npm run ai:self-review -- --files .gitignore README.md TODO.md docs/ai/quickstart.md docs/ai/usage.md docs/ai/tasks/ai-workflow-pr-split-guidance/plan.md docs/ai/tasks/ai-workflow-pr-split-guidance/context.md docs/ai/tasks/ai-workflow-pr-split-guidance/checklist.md`

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- ai-workflow-pr-split-guidance` 출력이 현재 상태와 맞는다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
