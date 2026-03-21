# Context

- 현재 결과 모달은 `GameBoard` 내부에서 열리며 확인 버튼이 `window.location.href = '/'`를 직접 호출한다.
- 게임 종료 후 자동 대기방 복귀는 구현되어 있지 않고, 사용자는 게임 페이지에 머무른다.
- stale `/game/:gameId` 진입 시 `GAME_NOT_FOUND` 같은 fatal error가 올 수 있으므로 이 경로에서도 stale game state를 정리해야 한다.
- `GamePage`는 이미 `activeRoomId`를 알고 있어 결과 확인 시 대기방 복귀 결정을 맡기기에 적합하다.
- 종료 상태에서 fatal game error가 늦게 도착할 수 있으므로, 결과 모달이 열린 이후에는 fatal fallback이 버튼 클릭 복귀를 가로채지 않아야 한다.
