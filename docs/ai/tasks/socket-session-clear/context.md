# Context

## 배경

- 현재 `clearSession()`은 zustand 세션만 지우고 socket.io 연결은 그대로 둔다.
- 그 결과 다른 브라우저에서 접속자 목록을 볼 때, 로그아웃한 사용자가 잠시 또는 계속 online으로 남을 수 있다.

## 판단

- 이 문제는 백엔드 cleanup이 아니라 프론트 logout cleanup 경계로 설명된다.
- 소켓 정리는 store 내부보다 `lib/socket` helper와 실제 세션 종료 경로에서 호출하는 방식이 현재 구조에 더 맞다.
