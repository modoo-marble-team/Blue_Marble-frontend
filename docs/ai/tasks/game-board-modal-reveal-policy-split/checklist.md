# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] pre-move / post-move reveal policy를 문서에 정리했다
- [x] `gameBoardEventQueueUtils`에 reveal policy 유틸을 추가했다
- [x] `GameBoard` visibility gate를 pre/post surface로 분리했다
- [x] chain move local path(`go_to_island`, fallback island card)에 barrier를 적용했다

## Testing

- [x] `npx vitest run src/components/board/GameBoard.test.tsx src/components/board/gameBoardEventQueueUtils.test.ts`
- [x] `npm run lint`
- [x] `npm run ai:check:game`
- [x] `npm run build`

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] queued future move가 pre-move modal을 가리지 않는지 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:self-review -- --files ...`를 실행했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
