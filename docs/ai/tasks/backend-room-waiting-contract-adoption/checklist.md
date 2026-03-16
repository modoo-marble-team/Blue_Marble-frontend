# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] 로비 방 생성 후 `create -> join -> enter_room` 흐름을 구현했다
- [x] waiting-room 초기 상태를 join 응답 snapshot 기준으로 정리했다
- [x] `lobby_updated` 타입을 `removed` / full payload로 분리했다
- [x] waiting-room에서 방 삭제 이벤트를 구독하고 로비 복귀 흐름을 구현했다
- [x] mock/real 경로를 함께 확인했다
- [x] 관련 테스트 기대값을 계약 기준으로 갱신했다

## Testing

- [x] `src/pages/waiting-room/controller/lifecycle.test.ts`를 실행했다
- [x] `src/pages/waiting-room/controller/socketSync.test.ts`를 실행했다
- [x] `src/pages/lobby/LobbyPage.test.tsx`를 실행했다
- [x] `npm run ai:check:waiting-room`를 실행했다
- [x] 필요 시 `npm run ai:check:lobby`를 실행했다
- [x] `npm run e2e -- e2e/waiting-room-start-flow.spec.ts`를 포함한 waiting-room Playwright를 실행했다
- [x] `npm run e2e -- e2e/chat-flow-waiting-room.spec.ts`를 실행했다

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] cleanup, 중복 join, 방 삭제 이벤트 경계를 확인했다
- [ ] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
