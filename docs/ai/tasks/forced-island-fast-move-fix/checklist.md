# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] `shouldApplyTravelMoveAnimation` fast 판정을 강제 무인도 이동 기준으로 수정했다
- [x] `GameBoard` 카드 무인도 이동 연출에 fast timing을 적용했다
- [x] 일반 무인도 착지/출발 동작을 건드리지 않았다

## Testing

- [x] `npx vitest run src/components/board/gameBoardEventQueueUtils.test.ts`
- [x] `npm run lint`
- [x] `npm run ai:check:game`
- [x] `npm run build`

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] `MOVE_TO_ISLAND -> ISLAND`만 fast인지 회귀 여부를 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- forced-island-fast-move-fix` 출력이 현재 상태와 맞는다
- [x] `npm run ai:self-review -- --files ...`를 실행했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
