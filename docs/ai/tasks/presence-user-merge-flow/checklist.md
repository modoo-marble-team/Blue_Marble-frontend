# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 로비용 현재 사용자 보정 로직을 `presence` helper로 옮겼다
- [x] 대기방용 `room.players` 상태 보정 로직을 `presence` helper로 옮겼다
- [x] `LobbyPage`는 helper 결과만 사용하도록 정리했다
- [x] `WaitingRoomPage`는 helper 결과만 사용하도록 정리했다
- [x] helper 이름과 반환 형태가 기존 `OnlineUser` 규칙과 어긋나지 않게 정리했다

## Testing

- [x] `src/pages/lobby/LobbyPage.test.tsx`를 실행했다
- [x] 필요 시 `src/pages/waiting-room/WaitingRoomPage.test.tsx`를 실행했다
- [x] 필요 시 관련 presence 테스트를 실행했다
- [x] `npm run lint` 또는 범위 lint를 실행했다

## Review

- [x] 페이지가 보정 로직보다 화면 조합 중심으로 더 읽히는지 확인했다
- [x] helper 추출이 과도한 공통화가 아닌지 확인했다
- [x] mock/real 경로에서 같은 사용자 경험을 유지하는지 확인했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
