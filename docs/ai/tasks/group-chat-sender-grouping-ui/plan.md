# Plan

## Task

- 작업 이름: Group Chat Sender Grouping UI
- 작업 slug: group-chat-sender-grouping-ui
- 요청 날짜: 2026-03-25
- 담당 범위: 대기방/게임 공용 채팅을 실무형 그룹 채팅 패턴으로 개선

## Goal

- `RoomChat`을 대기방/게임 공용 그룹 채팅에 맞는 sender grouping UI로 바꾼다.
- 수신 메시지에서 누가 말했는지 아바타, 이름, 역할 badge로 즉시 구분되게 만든다.
- DM 패널은 유지하고, 기존 overflow/300자 제한/낙관적 채팅 동작은 그대로 보존한다.

## WAT Workflow

1. task 문서와 TODO를 만들어 범위 / 완료 기준 / 검증 명령을 고정한다.
2. `RoomChat`에 sender metadata와 message grouping 로직을 추가하고 실무형 그룹 채팅 레이아웃으로 정리한다.
3. 대기방/게임에서 sender metadata를 주입하고 관련 테스트 + repo 검증으로 마감한다.

## In Scope

- `src/features/room-chat/RoomChat.tsx`
- `src/pages/waiting-room/components/WaitingRoomChatBox.tsx`
- `src/pages/waiting-room/components/WaitingRoomSidePanel.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`
- `src/pages/GamePage.tsx`
- 관련 Vitest
- task 문서와 TODO 상태 정리

## Out Of Scope

- 1:1 DM 패널 UI 재설계
- 메시지 시간 표시, 읽음 상태, read receipt
- 유저별 말풍선 색상 분기
- 멀티 badge stacking, 멘션, 리액션

## Target Files

- `src/features/room-chat/RoomChat.tsx`
- `src/features/room-chat/RoomChat.test.tsx`
- `src/pages/waiting-room/components/WaitingRoomChatBox.tsx`
- `src/pages/waiting-room/components/WaitingRoomSidePanel.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.test.tsx`
- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `docs/ai/tasks/group-chat-sender-grouping-ui/*`
- `TODO.md`

## Task Tracking

- TODO line: - [ ] `group-chat-sender-grouping-ui` - Group Chat Sender Grouping UI (`docs/ai/tasks/group-chat-sender-grouping-ui/`)
- Session brief: `npm run ai:session:brief -- group-chat-sender-grouping-ui`
- Reopen docs: `docs/ai/tasks/group-chat-sender-grouping-ui/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- `RoomChat`이 연속된 동일 sender 메시지를 5분 window 기준으로 그룹화한다.
- 수신 그룹 첫 메시지에만 아바타 + 닉네임 + 역할 badge가 보이고, 후속 메시지는 이름 반복 없이 이어진다.
- 대기방에서는 host 메시지에 `HOST`, 게임에서는 현재 턴 플레이어 메시지에 `TURN` badge가 보인다.
- overflow/300자 제한/낙관적 echo dedupe 관련 기존 동작이 유지된다.

## Role Plan

- Planner: 범위 / sender metadata 규칙 / badge 정책 정리
- Implementer: `RoomChat` 그룹 채팅 UI와 대기방/게임 연결 구현
- Reviewer: grouping / badge / 기존 채팅 회귀 여부 점검
- Tester: RoomChat / WaitingRoomPage / GamePage 관련 Vitest와 repo 검증 실행

## Test Plan

- `npx vitest run src/features/room-chat/RoomChat.test.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/GamePage.test.tsx`
- `npm run ai:check:lobby`
- `npm run ai:check:waiting-room`
- `npm run ai:check:game`
- `npm run lint`
- `npm run ai:self-review -- --files TODO.md docs/ai/tasks/group-chat-sender-grouping-ui/plan.md docs/ai/tasks/group-chat-sender-grouping-ui/context.md docs/ai/tasks/group-chat-sender-grouping-ui/checklist.md src/features/room-chat/RoomChat.tsx src/features/room-chat/RoomChat.test.tsx src/pages/waiting-room/components/WaitingRoomChatBox.tsx src/pages/waiting-room/components/WaitingRoomSidePanel.tsx src/pages/waiting-room/page/WaitingRoomPage.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/GamePage.tsx src/pages/GamePage.test.tsx`
