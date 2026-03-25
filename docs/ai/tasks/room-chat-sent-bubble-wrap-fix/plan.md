# Plan

## Task

- 작업 이름: Room Chat Sent Bubble Wrap Fix
- 작업 slug: room-chat-sent-bubble-wrap-fix
- 요청 날짜: 2026-03-26
- 담당 범위: 대기방/게임 공용 `RoomChat` sent bubble 폭 제약 수정과 회귀 테스트

## Goal

- 내가 보낸 긴 메시지도 대기방/게임 채팅창 안에서 여러 줄로 감기게 만든다.
- received bubble, sender grouping, badge, input/composer, socket 흐름은 유지한다.
- 브라우저 기준 레이아웃 문제를 unit test + waiting-room chat E2E로 재현/회귀 방지한다.

## WAT Workflow

1. task 문서와 TODO를 만들어 범위 / 완료 기준 / 검증 명령을 고정한다.
2. `RoomChat` sent path에 실제 계산 가능한 폭 제약을 주고 기존 줄바꿈 클래스를 유지한다.
3. 긴 내 메시지 회귀 테스트와 채팅 관련 검증을 실행하고 문서를 완료 상태로 맞춘다.

## In Scope

- `src/features/room-chat/RoomChat.tsx`
- `src/features/room-chat/RoomChat.test.tsx`
- `e2e/chat-flow-waiting-room.spec.ts`
- `docs/ai/tasks/room-chat-sent-bubble-wrap-fix/*`
- `TODO.md`

## Out Of Scope

- DM 패널 레이아웃 수정
- 채팅 입력창 textarea 전환
- socket payload, optimistic chat, unread, mock gateway 변경
- DEV 제어 패널 수정

## Target Files

- `src/features/room-chat/RoomChat.tsx`
- `src/features/room-chat/RoomChat.test.tsx`
- `e2e/chat-flow-waiting-room.spec.ts`
- `docs/ai/tasks/room-chat-sent-bubble-wrap-fix/plan.md`
- `docs/ai/tasks/room-chat-sent-bubble-wrap-fix/context.md`
- `docs/ai/tasks/room-chat-sent-bubble-wrap-fix/checklist.md`
- `TODO.md`

## Task Tracking

- TODO line: - [ ] `room-chat-sent-bubble-wrap-fix` - Room Chat Sent Bubble Wrap Fix (`docs/ai/tasks/room-chat-sent-bubble-wrap-fix/`)
- Session brief: `npm run ai:session:brief -- room-chat-sent-bubble-wrap-fix`
- Reopen docs: `docs/ai/tasks/room-chat-sent-bubble-wrap-fix/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- `RoomChat` sent bubble이 실제 폭 제약 안에서 `w-fit` / `max-w-full` / wrap 규칙을 평가받는다.
- 긴 내 메시지가 대기방/게임 채팅창 안에서 한 줄 overflow 없이 감긴다.
- received bubble, badge, grouping, input, socket 동작은 유지된다.
- 관련 Vitest, waiting-room/lobby 검증, chat E2E, lint/build, self-review가 통과한다.

## Role Plan

- Planner: sent path 원인과 제외 범위 고정
- Implementer: `RoomChat` sent bubble 레이아웃과 회귀 테스트 구현
- Reviewer: shared chat 경로와 대기방 E2E 안정성 점검
- Tester: Vitest / lobby / waiting-room / chat E2E / lint / build 실행

## Test Plan

- `npx vitest run src/features/room-chat/RoomChat.test.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/GamePage.test.tsx`
- `npm run ai:check:lobby`
- `npm run ai:check:waiting-room`
- `npm run ai:check:chat-e2e`
- `npm run lint`
- `npm run build`
- `npm run ai:self-review -- --files TODO.md docs/ai/tasks/room-chat-sent-bubble-wrap-fix/plan.md docs/ai/tasks/room-chat-sent-bubble-wrap-fix/context.md docs/ai/tasks/room-chat-sent-bubble-wrap-fix/checklist.md src/features/room-chat/RoomChat.tsx src/features/room-chat/RoomChat.test.tsx e2e/chat-flow-waiting-room.spec.ts src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/GamePage.test.tsx`
