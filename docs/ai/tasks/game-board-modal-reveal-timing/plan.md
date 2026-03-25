# Game Board Modal Reveal Timing

## Summary

- `PLAYER_MOVED` consume 직후 prompt/local board modal이 말 이동 전에 한 프레임 보이는 문제를 막는다.
- `GameBoard`에 보드 액션 modal 전용 barrier를 두고, 이동 시작 전부터 이동 완료 후 다음 프레임까지 modal reveal을 지연한다.

## Implementation

1. `GameBoard`에 `boardActionModalBarrier`와 `requestAnimationFrame` 기반 release 로직을 추가한다.
2. `PLAYER_MOVED` 처리에서 이동 시작 직전에 barrier를 올리고, `movePlayerSequentially()` 완료 후 `handleArrival()` 호출 다음 프레임에 barrier를 내린다.
3. `buy/build/toll/acquisition/sell/card/travel/go_to_island/island` modal visibility를 공통 reveal gate로 통일한다.
4. `isEventQueuePaused`와 `onBlockingModalChange`도 같은 barrier를 반영해 부모와 queue pause 의미를 맞춘다.
5. `GameBoard.test.tsx`에 prompt-driven modal과 local arrival modal 대표 경로 회귀 테스트를 추가한다.

## Validation

- `npx vitest run src/components/board/GameBoard.test.tsx`
- `npm run lint`
- `npm run ai:check:game`
- `npm run build`
