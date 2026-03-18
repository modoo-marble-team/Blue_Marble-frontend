# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] PR 템플릿에 기준 문서 / 역할 수행 섹션을 추가했다
- [x] `ai:task:new`에 role plan / relevant manuals / review 역할 체크를 추가했다
- [x] `AI Review`에 기준 문서 / Reviewer/Tester / required checks 증빙 warning을 연결했다

## Testing

- [x] `npx vitest run scripts/ai/task-new.test.ts`
- [x] `npx prettier --check ...`
- [x] `npm run ai:self-review -- --files ...`
- [x] `npm run lint`

## Review

- [x] PR 본문이 과하게 길어지지 않는지 확인했다
- [x] warning이 advisory only로 유지되는지 확인했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
