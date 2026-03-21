# Context

- 새 `GAME_OVER` 계약은 winner-only payload와 `players=[]` 상태를 포함할 수 있다.
- `GameBoard`는 `isGameOver || gameResult`만 있으면 결과 모달을 열 수 있다.
- 현재 `GamePage`는 `storePlayers.length === 0`만 보고 `게임 로딩 중...`으로 빠져 종료 상태도 로딩으로 오해한다.
- 종료 직후 stale game route로 진입하면 `game:error(GAME_NOT_FOUND 등)`가 와도 로딩 분기가 먼저 실행될 수 있다.
