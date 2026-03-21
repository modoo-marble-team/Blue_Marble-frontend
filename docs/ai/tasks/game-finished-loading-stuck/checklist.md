# Checklist

- [ ] 종료 상태(`isGameOver`, `phase === 'finished'`, `gameResult`)에서는 `players=[]`여도 로딩 화면을 띄우지 않는다.
- [ ] `GAME_NOT_FOUND`, `NOT_GAME_MEMBER`, `INVALID_GAME_ID` 발생 시 room 또는 lobby fallback 이동을 시작한다.
- [ ] 종료 상태가 아니고 `players=[]`인 경우는 기존처럼 로딩 화면을 유지한다.
- [ ] 관련 `GamePage` 테스트와 build가 통과한다.
