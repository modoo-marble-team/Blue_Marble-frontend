# Context

## Background

- waiting-room presence contract 정렬 이후에도 game 종료 복귀 시 resume 경로가 첫 `room_updated`만 기다려 loading에 고착될 수 있었다.
- waiting-room 접속자 목록은 현재 room 참가자 override는 수행하지만, 다른 room의 membership 변화는 waiting-room에서 전역 resync하지 않아 stale 상태가 남을 수 있었다.

## Current Problems

- game 종료 후 `대기방으로 돌아가기`를 눌러도 waiting-room이 계속 로딩 상태로 남는다.
- waiting-room에서 다른 사용자가 방을 만들거나 나가도 접속자 목록이 바로 갱신되지 않는다.

## Key Files

- `src/pages/GamePage.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`
- `src/pages/waiting-room/hooks/hooks.ts`
- `src/pages/waiting-room/controller/lifecycle.ts`
- `src/pages/waiting-room/controller/socketSync.ts`

## Constraints

- backend 추가 엔드포인트 없이 현재 route state와 socket 이벤트만으로 해결한다.
- bootstrap snapshot은 초기 렌더 용도이며, 이후 authoritative source는 `room_updated`와 `online_users`다.
- 현재 room `removed` cleanup semantics는 유지한다.
