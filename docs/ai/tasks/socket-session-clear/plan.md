# Plan

## 목표

- 세션 종료 시 소켓 연결과 auth 컨텍스트를 함께 정리한다.
- 로그아웃 후 다른 클라이언트 접속자 목록에 stale online 상태가 남지 않게 한다.

## 범위

- `src/lib/socket.ts`
- `src/pages/lobby/LobbyPage.tsx`
- `src/pages/waiting-room/WaitingRoomPage.tsx`
- `src/pages/KakaoLoginCallbackPage.tsx`
- `src/features/auth/hooks/useAuthBootstrap.ts`
- 관련 단위 테스트

## 구현 단계

1. 소켓 연결 종료 + auth 초기화 helper를 추가한다.
2. 실제 세션 clear 경로에서 helper를 함께 호출한다.
3. 로비 로그아웃 클릭 테스트와 socket helper 테스트를 추가한다.
