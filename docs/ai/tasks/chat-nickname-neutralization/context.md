# Context

## Current Behavior

- `RoomChat`은 non-mine sender 닉네임을 `text-ui-text-strong`으로 고정해 inline 색상 없이 렌더링한다.
- 대기방/게임 sender header는 닉네임만 렌더링하고, `HOST`/`TURN` badge는 더 이상 표시하지 않는다.
- avatarColor는 sender 식별을 위한 아바타 배경색으로만 유지된다.

## Related Files

- `src/features/room-chat/RoomChat.tsx`
- `src/features/room-chat/RoomChat.test.tsx`
- `src/pages/GamePage.tsx`
- `src/pages/waiting-room/components/WaitingRoomChatBox.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.test.tsx`
- `src/pages/GamePage.test.tsx`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/ai/manuals/lobby.md`
- `docs/ai/manuals/waiting-room.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- `RoomChatProps`, socket payload, controller 반환 shape는 유지한다.
- 대기방 `HOST`, 게임 `TURN` badge를 모두 제거한다.
- avatarColor는 sender 식별 수단으로 유지하고, DM 패널은 건드리지 않는다.

## Decision Notes

- 닉네임은 `text-ui-text-strong`으로 고정해 밝은 avatar 팔레트에도 가독성을 보장한다.
- badge는 현재 sender 식별에 필수 정보가 아니므로 `RoomChat` 공용 렌더링에서 제거한다.
- waiting-room / game sender metadata에서는 badge 관련 필드를 제거해 sender header가 닉네임만 렌더링되게 한다.

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/tasks/chat-nickname-neutralization/*`, `docs/ai/manuals/lobby.md`, `docs/ai/manuals/waiting-room.md`, `docs/testing.md`
- 바로 이어서 할 1개 단계: 없음
- pending decision / blocker: 없음
- 검증 재개 지점: `npx vitest run src/features/room-chat/RoomChat.test.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/GamePage.test.tsx`, `npm run ai:check:lobby`, `npm run ai:check:waiting-room`, `npm run ai:check:game`, `npm run lint`, `npm run build`, `npm run ai:self-review -- --files ...` 실행 완료

## Open Risks

- 공용 `RoomChat` 닉네임 색 / badge 제거 변경이므로 게임 채팅 visual tone도 같이 바뀐다.
- `text-ui-text-strong`이 의도보다 무겁게 느껴지면 후속으로 `text-ui-text-primary` 재검토 가능성이 있다.
