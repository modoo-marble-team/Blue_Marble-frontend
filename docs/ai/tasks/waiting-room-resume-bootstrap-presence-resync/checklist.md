# Checklist

- [x] `game_start` 이동 state에 `lastRoomSnapshot` 전달
- [x] game 종료 복귀 state에 `lastRoomSnapshot` 전달
- [x] waiting-room controller/lifecycle에 `resumeBootstrapSnapshot` 추가
- [x] resume bootstrap snapshot이 있으면 loading 없이 room/chat 상태 즉시 복구
- [x] waiting-room `lobby_updated`에서 전역 presence resync 수행
- [x] lifecycle / socketSync / page / game 테스트 보강
