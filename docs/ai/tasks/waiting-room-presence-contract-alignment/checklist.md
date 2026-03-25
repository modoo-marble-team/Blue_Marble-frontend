# Checklist

- [x] `GamePage` 종료 복귀 시 `resumeRoomMembership` route state 추가
- [x] waiting-room lifecycle에 resume room 경로 추가
- [x] resume 경로에서 `joinWaitingRoom()` 제거, `enterWaitingRoomSocket()` + `requestOnlineUsersSnapshotSync()`만 수행
- [x] `room_updated` 수신 시 loading 종료 처리 추가
- [x] waiting-room leave / game leave 성공 후 접속자 snapshot 재동기화 추가
- [x] online users merge helper가 existing status를 보존하도록 조정
- [x] waiting-room / lobby 접속자 목록이 fallback status를 missing user에만 적용하도록 정렬
- [x] lifecycle/actions/model/page 테스트 보강
