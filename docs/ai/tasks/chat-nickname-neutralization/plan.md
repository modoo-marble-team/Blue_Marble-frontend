# Plan

## Task

- 작업 이름: Chat Nickname Neutralization
- 작업 slug: chat-nickname-neutralization
- 요청 날짜: 2026-03-26
- 담당 범위: 공용 RoomChat 닉네임 색 통일과 채팅 sender badge 제거

## Goal

- 대기방/게임 채팅 닉네임 색을 아바타색 연동 대신 기본 검은색 계열로 통일한다.
- 대기방 `HOST`, 게임 `TURN` badge를 모두 제거한다.
- socket/controller/message type 변경 없이 `RoomChat` sender metadata와 렌더링만 정리한다.

## WAT Workflow

1. task 문서와 TODO를 만들어 범위 / 완료 기준 / 검증 명령을 고정한다.
2. `RoomChat` 닉네임 스타일과 sender metadata/badge 렌더링을 최소 범위로 수정한다.
3. RoomChat / WaitingRoomPage / GamePage 회귀 테스트와 repo 검증으로 마감한다.

## In Scope

- `src/features/room-chat/RoomChat.tsx`
- `src/pages/waiting-room/components/WaitingRoomChatBox.tsx`
- 관련 Vitest
- `docs/ai/tasks/chat-nickname-neutralization/*`
- `TODO.md`

## Out Of Scope

- DM 패널 변경
- 메시지 버블 색상 변경
- avatar fallback 색상 변경
- socket payload, optimistic chat, unread, mock gateway 변경

## Target Files

- `src/features/room-chat/RoomChat.tsx`
- `src/features/room-chat/RoomChat.test.tsx`
- `src/pages/GamePage.tsx`
- `src/pages/waiting-room/components/WaitingRoomChatBox.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.test.tsx`
- `src/pages/GamePage.test.tsx`
- `docs/ai/tasks/chat-nickname-neutralization/plan.md`
- `docs/ai/tasks/chat-nickname-neutralization/context.md`
- `docs/ai/tasks/chat-nickname-neutralization/checklist.md`
- `TODO.md`

## Task Tracking

- TODO line: - [ ] `chat-nickname-neutralization` - Chat Nickname Neutralization (`docs/ai/tasks/chat-nickname-neutralization/`)
- Session brief: `npm run ai:session:brief -- chat-nickname-neutralization`
- Reopen docs: `docs/ai/tasks/chat-nickname-neutralization/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- non-mine sender 닉네임이 대기방/게임 공용 `RoomChat`에서 기본 어두운 텍스트 색으로 렌더링된다.
- 대기방/게임 채팅 header에서 sender badge가 더 이상 보이지 않는다.
- 관련 Vitest, `ai:check:lobby`, `ai:check:waiting-room`, `ai:check:game`, `lint`, `build`, `ai:self-review`가 통과한다.

## Role Plan

- Planner: 범위 / badge 유지 정책 / 검증 기준 확정
- Implementer: `RoomChat` 닉네임 스타일과 waiting-room / game metadata 정리
- Reviewer: 대기방/게임 공용 경계와 badge 제거 회귀 여부 점검
- Tester: 관련 Vitest와 repo 검증 실행

## Test Plan

- `npx vitest run src/features/room-chat/RoomChat.test.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/GamePage.test.tsx`
- `npm run ai:check:lobby`
- `npm run ai:check:waiting-room`
- `npm run ai:check:game`
- `npm run lint`
- `npm run build`
- `npm run ai:self-review -- --files TODO.md docs/ai/tasks/chat-nickname-neutralization/plan.md docs/ai/tasks/chat-nickname-neutralization/context.md docs/ai/tasks/chat-nickname-neutralization/checklist.md src/features/room-chat/RoomChat.tsx src/features/room-chat/RoomChat.test.tsx src/pages/waiting-room/components/WaitingRoomChatBox.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/GamePage.tsx src/pages/GamePage.test.tsx`
