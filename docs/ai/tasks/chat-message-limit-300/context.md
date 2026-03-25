# Context

## Current Behavior

- RoomChat과 DirectMessagePanel은 현재 공백 입력만 막고, 최대 길이 제한 없이 단일 line input으로 메시지를 받는다.
- room chat / DM 송신 경계마다 `trim()` 처리 여부가 제각각이라 길이 제한을 추가하면 local optimistic state, socket emit, mock path가 쉽게 어긋날 수 있다.
- `send_chat`, `dm_send` send schema에는 최대 길이 제한이 없어 mock server도 초장문 payload를 그대로 허용한다.

## Related Files

- `src/features/room-chat/RoomChat.tsx`
- `src/features/presence/components/DirectMessagePanel.tsx`
- `src/features/presence/direct-message/useDirectMessageController.ts`
- `src/features/presence/direct-message/directMessageSocket.ts`
- `src/pages/waiting-room/socket/socket.ts`
- `src/pages/waiting-room/socket/mockGateway.ts`
- `src/pages/GamePage.tsx`
- `src/contracts/socket/schemas.ts`
- `docs/socket-mock-server.md`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/ai/manuals/lobby.md`
- `docs/ai/manuals/waiting-room.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/socket-mock-server.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- room chat / DM 모두 300자 하드 제한을 같은 기준으로 적용한다.
- 입력창은 기존 single-line input을 유지하고, 글자 수 카운터나 textarea 전환은 하지 않는다.
- 수신 스키마(`chat`, `dm_receive`)는 이번 변경 범위 밖이다.
- DEV 제어 패널 입력창과 backend 별도 예외 경로는 이번 범위에서 제외한다.

## Decision Notes

- 최대 길이와 trim/slice 규칙이 여러 레이어에서 반복되므로 공통 상수 파일에 300자와 정규화 함수를 둔다.
- local optimistic message가 socket emit payload와 다르면 echo dedupe가 흔들리므로 `GamePage`와 `useDirectMessageController`에서 socket helper 호출 전에 먼저 정규화한다.
- mock/real contract 드리프트를 줄이기 위해 `send_chat`, `dm_send` send schema와 mock gateway도 같은 300자 기준을 사용한다.

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/tasks/chat-message-limit-300/*`, `docs/ai/manuals/lobby.md`, `docs/ai/manuals/waiting-room.md`, `docs/ai/manuals/game-runtime.md`
- 바로 이어서 할 1개 단계: 없음. 후속이 필요하면 수신 schema 제한 강화나 visible counter를 별도 task로 분리한다.
- pending decision / blocker: 없음
- 검증 재개 지점: `npx vitest run src/features/room-chat/RoomChat.test.tsx src/features/presence/components/DirectMessagePanel.test.tsx src/features/presence/direct-message/useDirectMessageController.test.tsx src/features/presence/direct-message/directMessageSocket.test.ts src/pages/waiting-room/socket/mockGateway.test.ts src/pages/GamePage.test.tsx src/pages/waiting-room/socket/socket.test.ts`, `npm run ai:check:lobby`, `npm run lint`, `npm run build`, `npm run ai:self-review -- --files ...` 실행 완료

## Open Risks

- 입력 `maxLength`만으로는 programmatic send를 막을 수 없으므로 송신 경계에서도 같은 300자 정규화가 필요하다.
- receive schema를 그대로 두므로 외부 서버가 300자 초과 수신 메시지를 보내면 화면에서는 그대로 보일 수 있다.
- jsdom 입력 테스트는 실제 모바일 IME 동작까지 보장하지 않으므로 브라우저 수동 확인이 추가로 유효하다.
