# Game Finished Loading Stuck

## 목표

- 게임 종료 상태를 `GamePage` 로딩 분기와 분리한다.
- `players=[]`인 종료 snapshot/patch에서도 결과 화면 렌더 경로를 막지 않는다.
- stale `/game/:gameId` 진입 시 fatal game error를 로딩보다 먼저 처리한다.

## 작업 단계

1. `GamePage`에 종료 상태 판정(`isGameOver`, `phase === 'finished'`, `gameResult`)을 추가한다.
2. `GAME_NOT_FOUND`, `NOT_GAME_MEMBER`, `INVALID_GAME_ID`를 stale game fatal error로 분류한다.
3. room 문맥이 있으면 `/rooms/:roomId`, 없으면 `/lobby`로 fallback 이동을 추가한다.
4. 로딩 분기를 "종료 상태도 아니고 fatal error도 아니고 players가 비어 있는 경우"로 좁힌다.
5. 종료 상태/비종료 상태/fatal error fallback 회귀 테스트를 `GamePage.test.tsx`에 추가한다.
