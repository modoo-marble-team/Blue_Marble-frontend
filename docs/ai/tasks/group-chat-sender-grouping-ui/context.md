# Context

## Current Behavior

- `RoomChat`은 모든 메시지 위에 작은 회색 닉네임을 반복 출력하는 단순 채팅 UI다.
- 대기방/게임 채팅은 같은 공용 `RoomChat`을 쓰지만 sender metadata가 없어 host/현재 턴 플레이어 같은 역할을 메시지에서 바로 구분하기 어렵다.
- 1:1 DM은 상대가 고정이라 헤더만으로도 구분 가능하므로 이번 문제의 직접 대상이 아니다.

## Related Files

- `src/features/room-chat/RoomChat.tsx`
- `src/pages/waiting-room/components/WaitingRoomChatBox.tsx`
- `src/pages/waiting-room/components/WaitingRoomSidePanel.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`
- `src/pages/GamePage.tsx`
- `src/components/avatar/Avatar.tsx`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/ai/manuals/lobby.md`
- `docs/ai/manuals/waiting-room.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 적용 범위는 대기방/게임 공용 채팅만이다.
- 300자 제한과 overflow 방지 규칙은 유지해야 한다.
- `RoomChat`은 공용 컴포넌트로 유지하되, DM 패널은 건드리지 않는다.
- mock/real 채팅 payload shape나 optimistic 채팅 로직은 바꾸지 않는다.

## Decision Notes

- 실무형 그룹 채팅 UX는 `연속 메시지 grouping + 첫 메시지에만 아바타/이름` 패턴으로 구현한다.
- sender별 고정 색상은 말풍선 전체가 아니라 avatar/accent/name에만 쓰고, 말풍선은 현재의 내 메시지/상대 메시지 색 구분을 유지한다.
- 대기방은 host 여부를 기준으로 `HOST` badge를 주고, 게임은 현재 active player만 `TURN` badge를 준다.
- 게임 sender metadata는 이미 계산된 `panelPlayers`의 `color`/`isActive`를 재사용한다.

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/tasks/group-chat-sender-grouping-ui/*`, `docs/ai/manuals/lobby.md`, `docs/ai/manuals/waiting-room.md`, `docs/ai/manuals/game-runtime.md`
- 바로 이어서 할 1개 단계: 없음
- pending decision / blocker: 없음
- 검증 재개 지점: `npx vitest run src/features/room-chat/RoomChat.test.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/GamePage.test.tsx`, `npm run ai:check:lobby`, `npm run ai:check:waiting-room`, `npm run ai:check:game`, `npm run lint`, `npm run build`, `npm run ai:self-review -- --files ...` 실행 완료

## Open Risks

- 현재 턴 badge는 sender identity 기준으로 표시되므로, 과거 메시지도 현재 active player라면 `TURN`을 보일 수 있다.
- 그룹화 기준 5분 window는 UI 판단용이므로 서버 시간이 비정상적이면 그룹 경계가 어색할 수 있다.
- GamePage 테스트에서는 기존 TURN 표시 UI와 채팅 badge를 구분해 스코프 기반으로 검증해야 한다.
