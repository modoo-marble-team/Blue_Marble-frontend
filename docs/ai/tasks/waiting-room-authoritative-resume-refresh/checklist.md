# Checklist

- [x] resume room 경로에서 bootstrap snapshot 이후 background `joinWaitingRoom()` revalidation 추가
- [x] join 응답보다 먼저 온 `room_updated`가 있으면 join 결과 무시
- [x] presence refresh helper에 follow-up refresh 옵션 추가
- [x] `lobby_updated` / local leave / game leave 성공 경로에 follow-up refresh 적용
- [x] onlineUsersSocket / lifecycle / socketSync / actions / lobby / game 테스트 보강
