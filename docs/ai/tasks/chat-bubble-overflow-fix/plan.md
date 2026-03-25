# Plan

## Task

- 작업 이름: Chat Bubble Overflow Fix
- 작업 slug: chat-bubble-overflow-fix
- 요청 날짜: 2026-03-25
- 담당 범위: 사용자용 채팅 UI 말풍선 overflow와 테스트 정리

## Goal

- 긴 메시지가 말풍선을 뚫고 한 줄로 늘어나며 채팅창에 가로 스크롤을 만드는 문제를 없앤다.
- RoomChat을 쓰는 대기방/게임 채팅과 DM 패널에 같은 사용자 경험을 맞춘다.
- 소켓 계약이나 메시지 길이 제한 변경 없이 레이아웃 문제만 해결한다.

## WAT Workflow

1. task 문서와 TODO를 만들어 범위 / 완료 기준 / 검증 명령을 고정한다.
2. 공용 채팅과 DM 패널 말풍선에 줄바꿈 / overflow 방어 규칙을 최소 범위로 넣는다.
3. 긴 공백 없는 문자열 회귀 테스트와 최소 검증을 실행하고 문서를 완료 상태로 맞춘다.

## In Scope

- `src/features/room-chat/RoomChat.tsx`
- `src/features/presence/components/DirectMessagePanel.tsx`
- 관련 Vitest 회귀 테스트
- task 문서와 TODO 상태 정리

## Out Of Scope

- 채팅 입력창을 textarea 기반으로 재설계
- 메시지 길이 제한 추가
- 소켓 payload, mock server, unread 규칙 변경
- DEV 전용 제어 패널 UI 수정

## Target Files

- `src/features/room-chat/RoomChat.tsx`
- `src/features/presence/components/DirectMessagePanel.tsx`
- `src/features/room-chat/RoomChat.test.tsx`
- `src/features/presence/components/DirectMessagePanel.test.tsx`
- `docs/ai/tasks/chat-bubble-overflow-fix/*`
- `TODO.md`

## Task Tracking

- TODO line: - [ ] `chat-bubble-overflow-fix` - Chat Bubble Overflow Fix (`docs/ai/tasks/chat-bubble-overflow-fix/`)
- Session brief: `npm run ai:session:brief -- chat-bubble-overflow-fix`
- Reopen docs: `docs/ai/tasks/chat-bubble-overflow-fix/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- 긴 URL / 공백 없는 문자열도 RoomChat과 DM 말풍선 안에서 여러 줄로 감긴다.
- 사용자용 채팅창에 가로 스크롤이 생기지 않는다.
- 대기방/게임/DM이 공통 규칙으로 동작한다.
- 관련 Vitest와 lobby 최소 검증이 통과한다.

## Role Plan

- Planner: 범위 / 완료 기준 / 위험 요소 정리
- Implementer: 공용 채팅과 DM 패널 최소 수정
- Reviewer: overflow, mock/real 영향, 테스트 누락 점검
- Tester: 긴 문자열 회귀 테스트와 최소 검증 실행

## Test Plan

- `npx vitest run src/features/room-chat/RoomChat.test.tsx src/features/presence/components/DirectMessagePanel.test.tsx`
- `npm run ai:check:lobby`
- `npm run ai:self-review -- --files TODO.md docs/ai/tasks/chat-bubble-overflow-fix/plan.md docs/ai/tasks/chat-bubble-overflow-fix/context.md docs/ai/tasks/chat-bubble-overflow-fix/checklist.md src/features/room-chat/RoomChat.tsx src/features/room-chat/RoomChat.test.tsx src/features/presence/components/DirectMessagePanel.tsx src/features/presence/components/DirectMessagePanel.test.tsx`
