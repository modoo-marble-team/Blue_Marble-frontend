# Plan

## Task

- 작업 이름: Chat Message Limit 300
- 작업 slug: chat-message-limit-300
- 요청 날짜: 2026-03-25
- 담당 범위: 사용자용 room chat / DM 300자 제한과 계약/테스트 정리

## Goal

- 공용 채팅과 DM에 같은 300자 하드 제한을 적용한다.
- 입력 UI, local optimistic state, mock/real socket 송신, send contract가 모두 같은 정규화 규칙을 사용하게 만든다.
- 수신 계약과 DEV 제어 패널은 건드리지 않고 사용자용 채팅 경계만 안정화한다.

## WAT Workflow

1. task 문서와 TODO를 만들어 범위 / 완료 기준 / 검증 명령을 고정한다.
2. 공통 상수와 송신 정규화 규칙을 입력 UI / room chat / DM / waiting-room socket 경계에 적용한다.
3. send contract, mock server, 문서를 300자 기준으로 맞추고 관련 Vitest + repo 검증으로 마감한다.

## In Scope

- `src/constants/chat.ts`
- `src/features/room-chat/RoomChat.tsx`
- `src/features/presence/components/DirectMessagePanel.tsx`
- `src/features/presence/direct-message/useDirectMessageController.ts`
- `src/features/presence/direct-message/directMessageSocket.ts`
- `src/pages/waiting-room/socket/socket.ts`
- `src/pages/waiting-room/socket/mockGateway.ts`
- `src/pages/GamePage.tsx`
- `src/contracts/socket/schemas.ts`
- 관련 Vitest와 socket mock server 문서
- task 문서와 TODO 상태 정리

## Out Of Scope

- textarea 전환, 글자 수 카운터, 경고 색상 추가
- `chat` / `dm_receive` 수신 스키마 제한 강화
- DEV 제어 패널 입력창 제한
- 채팅 기능/구독 흐름/DM unread 정책 재설계

## Target Files

- `src/constants/chat.ts`
- `src/features/room-chat/RoomChat.tsx`
- `src/features/room-chat/RoomChat.test.tsx`
- `src/features/presence/components/DirectMessagePanel.tsx`
- `src/features/presence/components/DirectMessagePanel.test.tsx`
- `src/features/presence/direct-message/useDirectMessageController.ts`
- `src/features/presence/direct-message/useDirectMessageController.test.tsx`
- `src/features/presence/direct-message/directMessageSocket.ts`
- `src/features/presence/direct-message/directMessageSocket.test.ts`
- `src/pages/waiting-room/socket/socket.ts`
- `src/pages/waiting-room/socket/socket.test.ts`
- `src/pages/waiting-room/socket/mockGateway.ts`
- `src/pages/waiting-room/socket/mockGateway.test.ts`
- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `src/contracts/socket/schemas.ts`
- `docs/socket-mock-server.md`
- `docs/ai/tasks/chat-message-limit-300/*`
- `TODO.md`

## Task Tracking

- TODO line: - [ ] `chat-message-limit-300` - Chat Message Limit 300 (`docs/ai/tasks/chat-message-limit-300/`)
- Session brief: `npm run ai:session:brief -- chat-message-limit-300`
- Reopen docs: `docs/ai/tasks/chat-message-limit-300/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- RoomChat과 DirectMessagePanel 입력창이 300자를 초과 입력하지 않는다.
- room chat / DM 송신 경계가 `trim() + 300자 제한`으로 정규화되어 local state와 emit payload가 일치한다.
- `send_chat`, `dm_send` send contract와 mock server가 300자 제한을 따른다.
- 관련 Vitest, `ai:check:lobby`, `lint`, `build`가 통과한다.

## Role Plan

- Planner: 범위 / 정규화 위치 / 제외 범위 정리
- Implementer: 입력/송신 경계와 contract/mock/doc 반영
- Reviewer: local state, mock/real, contract 불일치 여부 점검
- Tester: 관련 Vitest와 repo 검증 실행

## Test Plan

- `npx vitest run src/features/room-chat/RoomChat.test.tsx src/features/presence/components/DirectMessagePanel.test.tsx src/features/presence/direct-message/useDirectMessageController.test.tsx src/features/presence/direct-message/directMessageSocket.test.ts src/pages/waiting-room/socket/mockGateway.test.ts src/pages/GamePage.test.tsx src/pages/waiting-room/socket/socket.test.ts`
- `npm run ai:check:lobby`
- `npm run lint`
- `npm run build`
- `npm run ai:self-review -- --files TODO.md docs/ai/tasks/chat-message-limit-300/plan.md docs/ai/tasks/chat-message-limit-300/context.md docs/ai/tasks/chat-message-limit-300/checklist.md docs/socket-mock-server.md src/constants/chat.ts src/features/room-chat/RoomChat.tsx src/features/room-chat/RoomChat.test.tsx src/features/presence/components/DirectMessagePanel.tsx src/features/presence/components/DirectMessagePanel.test.tsx src/features/presence/direct-message/useDirectMessageController.ts src/features/presence/direct-message/useDirectMessageController.test.tsx src/features/presence/direct-message/directMessageSocket.ts src/features/presence/direct-message/directMessageSocket.test.ts src/pages/waiting-room/socket/socket.ts src/pages/waiting-room/socket/socket.test.ts src/pages/waiting-room/socket/mockGateway.ts src/pages/waiting-room/socket/mockGateway.test.ts src/pages/GamePage.tsx src/pages/GamePage.test.tsx src/contracts/socket/schemas.ts`
