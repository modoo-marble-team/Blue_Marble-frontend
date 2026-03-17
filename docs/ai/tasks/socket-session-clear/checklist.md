# Checklist

## Implementation

- [x] 소켓 정리 helper를 추가했다
- [x] 로비/대기방 로그아웃 경로에서 helper를 호출한다
- [x] bootstrap/카카오 실패 경로에서도 helper를 호출한다

## Testing

- [x] `src/lib/socket.test.ts`
- [x] `src/pages/lobby/LobbyPage.test.tsx`
- [x] 관련 범위 lint

## Review

- [x] 세션 clear와 socket disconnect 책임이 섞이지 않는지 확인했다
- [x] mock/real 모드에서 helper 의미가 같은지 확인했다
