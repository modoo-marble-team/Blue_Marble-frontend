# Context

## Current Behavior

- `RoomChat`은 received bubble은 정상적으로 줄바꿈되지만, sent bubble은 부모 폭이 shrink-wrap처럼 계산돼 긴 메시지가 한 줄로 길게 보일 수 있다.
- 문제는 입력창이 아니라 공용 `RoomChat`의 `group.isMine` 경로 레이아웃 제약이다.
- 같은 공용 컴포넌트를 대기방과 게임이 함께 쓰므로 한 번 수정하면 두 화면에 같이 반영된다.

## Related Files

- `src/features/room-chat/RoomChat.tsx`
- `src/features/room-chat/RoomChat.test.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.test.tsx`
- `src/pages/GamePage.test.tsx`
- `e2e/chat-flow-waiting-room.spec.ts`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/ai/manuals/lobby.md`
- `docs/ai/manuals/waiting-room.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- `RoomChatProps`, message type, socket payload, controller 반환 shape를 바꾸지 않는다.
- input/composer, DM 패널, optimistic chat, unread, mock/real socket 경로는 건드리지 않는다.
- 기존 wrap 클래스 `whitespace-pre-wrap`, `break-words`, `[overflow-wrap:anywhere]`는 유지한다.

## Decision Notes

- sent path에 `w-full max-w-[85%]` 같은 명시적 폭 제약을 주고, 내부 content/message column도 `w-full items-end`로 정렬해 bubble이 실제 너비 기준을 갖게 한다.
- received path는 현재 avatar + metadata 레이아웃을 유지한다.
- unit test는 sent bubble 래퍼 class 존재를 확인하고, 브라우저 레이아웃 회귀는 waiting-room chat E2E에서 긴 메시지 bounding box로 확인한다.

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/tasks/room-chat-sent-bubble-wrap-fix/*`, `docs/ai/manuals/lobby.md`, `docs/ai/manuals/waiting-room.md`, `docs/testing.md`
- 바로 이어서 할 1개 단계: 없음
- pending decision / blocker: 없음
- 검증 재개 지점: `npx vitest run src/features/room-chat/RoomChat.test.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/GamePage.test.tsx`, `npm run ai:check:lobby`, `npm run ai:check:waiting-room`, `npm run ai:check:chat-e2e`, `npm run lint`, `npm run build`, `npm run ai:self-review -- --files ...` 실행 완료

## Open Risks

- jsdom에서는 실제 레이아웃 폭 계산을 완전히 재현하지 못하므로 DOM class 검증과 Playwright bounding-box 검증을 함께 써야 한다.
- sent bubble 폭을 고정에 가깝게 두면 짧은 메시지 모양이 과도하게 넓어질 수 있으므로 bubble 자체는 `w-fit`을 유지해야 한다.
