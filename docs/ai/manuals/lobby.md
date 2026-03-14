# Lobby Manual

이 manual은 아래 범위를 수정할 때 먼저 읽는다.

- `src/pages/lobby/**`
- `src/features/presence/**`
- `src/features/room-chat/**`

## 1. 이 영역의 역할

로비는 단순 방 목록 화면이 아니다.
현재 구조에서는 아래 세 가지를 한 화면에서 조합한다.

- 방 조회/필터링/입장
- 접속자 목록 실시간 반영
- DM 및 읽지 않은 메시지 상태 관리

즉, 로비 변경은 REST, socket, local UI state가 같이 얽히기 쉽다.
페이지를 비대하게 만들지 말고 기존 hook/controller 경계를 유지하는 것이 중요하다.

## 2. 현재 구조 기준

- `LobbyPage.tsx`
  - 세션 가드, 로비 필터 상태, modal 표시 여부, 헤더/패널 조합 담당
- `hooks.ts`, `api.ts`
  - 방 목록 조회와 필터 요청
- `useLobbyRoomActions.ts`
  - 방 생성/입장/비공개방 비밀번호 처리
- `useOnlineUsersSocket.ts`
  - 접속자 목록 구독, mock/real socket 분기, 초기 snapshot 처리
- `useDirectMessageController.ts`
  - DM 대상, 메시지 목록, unread count, 전송 처리

페이지에서 로직이 비대해지면 먼저 기존 hook을 확장할지 검토한다.

## 3. 꼭 지켜야 할 규칙

- `useLobbyRoomsQuery`, `useOnlineUsersSocket`의 반환 형태는 유지한다.
- mock 모드에서는 현재 사용자를 로비 접속자로 즉시 반영하는 흐름을 깨뜨리지 않는다.
  - `setMockOnlineUserStatus`
  - `removeMockOnlineUser`
- 게임 중인 유저 DM 차단 정책을 유지한다.
- unread count는 사용자 id 기준 맵 구조를 유지한다.
- 비공개방 입장은 modal + password state를 통해 처리하고, 페이지에 즉흥 로직을 늘리지 않는다.
- 헤더/세션 관련 동작은 기존 auth store와 navigate 흐름을 유지한다.

## 4. 같이 봐야 하는 파일

- `src/pages/lobby/LobbyPage.tsx`
- `src/pages/lobby/useLobbyRoomActions.ts`
- `src/features/presence/useOnlineUsersSocket.ts`
- `src/features/presence/useDirectMessageController.ts`
- `src/features/presence/onlineUsersSocket.ts`
- `src/features/presence/directMessageSocket.ts`

소켓 이벤트나 payload를 바꾸면 `docs/socket-mock-server.md`와 관련 contract도 같이 확인한다.

## 5. 테스트 기준

이 영역 수정 시 우선 검토할 테스트:

- `src/pages/lobby/LobbyPage.test.tsx`
- `src/pages/lobby/CreateRoomModal.test.tsx`
- `src/features/presence/useOnlineUsersSocket.test.tsx`
- `src/features/presence/useDirectMessageController.test.tsx`
- `src/features/presence/components/DirectMessagePanel.test.tsx`
- `src/features/presence/components/UserListPanel.test.tsx`
- `src/features/room-chat/RoomChat.test.tsx`

DM/접속자/채팅 플로우에 영향이 크면 아래 E2E도 검토한다.

- `e2e/chat-flow-direct-message.spec.ts`
- `e2e/chat-flow-game-room.spec.ts`
- `e2e/chat-flow-waiting-room.spec.ts`

## 6. 변경 전 체크 질문

- 이 로직이 로비 페이지에 있어야 하는가, 아니면 hook/controller에 있어야 하는가?
- socket mock 경로와 실제 socket 경로가 동일한 사용자 경험을 유지하는가?
- 접속자 목록, unread badge, DM 차단 규칙 중 하나라도 깨지지 않는가?
- 방 생성/입장 플로우에서 토스트, modal, navigate 흐름이 일관적인가?
