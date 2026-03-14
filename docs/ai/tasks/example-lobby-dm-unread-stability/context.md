# Context

## Current Behavior

- 로비는 방 목록, 접속자 목록, DM 상태를 한 페이지에서 함께 관리한다.
- DM unread count는 사용자 id 기준 맵으로 관리되고, `UserListPanel`에서 badge로 렌더링된다.
- 실시간 메시지 수신, DM 패널 open/close, 접속자 목록 재수신이 동시에 일어날 수 있어 race condition이 생기기 쉽다.

## Related Files

- `src/pages/lobby/LobbyPage.tsx`
- `src/features/presence/useDirectMessageController.ts`
- `src/features/presence/useDirectMessageController.test.tsx`
- `src/features/presence/components/UserListPanel.tsx`
- `src/features/presence/components/UserListPanel.test.tsx`
- `src/features/presence/directMessageSocket.ts`
- `docs/ai/manuals/lobby.md`

## Constraints

- unread count는 사용자 id 기준 구조를 유지해야 한다.
- 게임 중인 유저 DM 차단 규칙은 그대로 둔다.
- mock 소켓과 실제 소켓 모두 같은 사용 경험을 유지해야 한다.
- 페이지에 임시 상태를 덕지덕지 올리지 않고 controller에서 해결하는 방향을 우선한다.

## Decision Notes

- unread 계산 책임은 UI가 아니라 `useDirectMessageController`에 둔다.
- "현재 열려 있는 대상이면 unread를 올리지 않는다" 규칙을 단일 경로로 관리한다.
- 접속자 목록 데이터는 presence 정보일 뿐 unread 진실 소스가 아니므로, 목록 재수신으로 unread를 재계산하지 않는다.

## Open Risks

- 빠르게 패널을 닫고 여는 동안 마지막 메시지 타이밍이 꼬일 수 있다.
- mock 데이터 갱신 함수가 unread state와 간접 충돌할 수 있다.
- DM 패널 외부에서 상대 변경이 일어날 때 unread reset 타이밍을 추가 확인해야 한다.

## What This Shows In Review

- 단순 UI 버그도 상태 소유권과 이벤트 순서 문제로 해석할 수 있는지
- 실시간 기능에서 source of truth를 분리하는 감각이 있는지
- 테스트를 동반해 회귀를 막는 습관이 있는지
