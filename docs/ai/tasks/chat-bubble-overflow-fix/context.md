# Context

## Current Behavior

- RoomChat과 DM 패널의 메시지 말풍선은 `max-w`만 있고 긴 텍스트 줄바꿈 방어 규칙이 없다.
- 긴 URL, 공백 없는 영문 문자열, 매우 긴 토큰이 들어오면 말풍선 높이가 늘지 않고 가로로 밀리며 채팅창에 가로 스크롤이 생긴다.
- RoomChat은 대기방/게임에서 공용으로 쓰이므로 한 번 수정하면 두 채팅창에 같이 반영된다.

## Related Files

- `src/features/room-chat/RoomChat.tsx`
- `src/features/presence/components/DirectMessagePanel.tsx`
- `src/features/room-chat/RoomChat.test.tsx`
- `src/features/presence/components/DirectMessagePanel.test.tsx`
- `src/pages/waiting-room/components/WaitingRoomChatBox.tsx`
- `src/pages/GamePage.tsx`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/ai/manuals/lobby.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- `RoomChat`과 `DirectMessagePanel`의 props / 메시지 타입 / 정렬 규칙은 유지한다.
- DM unread, mock/real socket 경로, 대기방/게임 채팅 송신 계약은 건드리지 않는다.
- 길이 제한은 backend/mock/socket contract와 함께 움직여야 하므로 이번 작업에 포함하지 않는다.
- DEV 제어 패널은 사용자용 채팅창 범위가 아니므로 제외한다.

## Decision Notes

- 새 공용 유틸 없이 RoomChat과 DM 패널에 같은 줄바꿈 클래스를 직접 적용한다.
- 실무형 기본 UX로 `whitespace-pre-wrap`을 사용해 사용자가 입력한 줄바꿈은 보존하고, `break-words`와 `[overflow-wrap:anywhere]`로 공백 없는 문자열도 감기게 한다.
- 가로 스크롤 방지는 메시지 리스트 컨테이너와 메시지 행 모두에 `min-w-0` / `overflow-x-hidden`을 두는 방식으로 처리한다.

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/tasks/chat-bubble-overflow-fix/*`, `docs/ai/manuals/lobby.md`, `docs/testing.md`
- 바로 이어서 할 1개 단계: 없음. 후속이 필요하면 긴 닉네임 overflow나 multiline 입력 UX를 별도 task로 분리
- pending decision / blocker: 없음
- 검증 재개 지점: `npx vitest run src/features/room-chat/RoomChat.test.tsx src/features/presence/components/DirectMessagePanel.test.tsx`, `npm run ai:check:lobby`, `npm run lint`, `npm run ai:self-review -- --files ...` 실행 완료

## Open Risks

- jsdom에서는 실제 줄바꿈 레이아웃을 시각적으로 검증할 수 없으므로 클래스 적용 여부 중심으로 테스트해야 한다.
- 긴 닉네임 overflow와 multiline 입력 UX는 이번 요청 범위 밖이라 후속 UX 개선 여지가 남아 있다.
