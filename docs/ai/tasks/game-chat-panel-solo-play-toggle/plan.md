# Plan

## Task

- 작업 이름: Game Chat Panel Solo Play Toggle
- 요청 날짜: 2026-03-27
- 담당 범위: 게임 페이지 mock solo-play + 게임방 채팅 테스트 패널 UX 정리

## Goal

- 게임 페이지의 `DevRoomChatControlPanel` 사용자 노출 문구를 `게임방 채팅 테스트 패널` 기준으로 바꾼다.
- mock 전용 `혼자 플레이` 토글을 패널 밖 독립 UI로 배치해, 현재 사용자 턴이 아니어도 상대 턴의 주사위, 턴 종료, prompt 응답을 진행할 수 있게 한다.
- solo-play ON일 때 보드가 활성 플레이어를 로컬 플레이어처럼 다뤄, 상대 턴 모달과 자산 액션도 자연스럽게 테스트할 수 있게 한다.
- 우측 상단 pending/ack/error debug overlay는 제거하고 게임 HUD를 더 자연스럽게 정리한다.

## In Scope

- `src/features/room-chat/DevRoomChatControlPanel.tsx`
- `src/pages/GamePage.tsx`
- `src/components/board/GameBoard.tsx`로 전달하는 local control props 정리
- 관련 Vitest / Playwright 회귀 테스트

## Out Of Scope

- 실제 서버 game 계약 또는 payload shape 변경
- 대기방 DEV 패널 구조 변경
- 게임 mock handler 자체의 턴 판정 규칙 변경

## Target Files

- `src/features/room-chat/DevRoomChatControlPanel.tsx`
- `src/features/room-chat/DevRoomChatControlPanel.test.tsx`
- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `e2e/chat-flow-game-room.spec.ts`
- `TODO.md`

## Completion Criteria

- 게임 페이지에서 열기 버튼/패널 헤더가 모두 `게임방 채팅 테스트 패널` 문구로 보인다.
- mock 게임에서만 `혼자 플레이` 토글이 라운드 배지 위 독립 UI로 노출되고, OFF일 때는 기존처럼 내 턴에서만 조작 가능하다.
- solo-play ON일 때 상대 턴에서도 `주사위`, `턴 종료`, prompt 응답이 가능하다.
- BoardGame이 solo-play ON 시 활성 플레이어 기준으로 prompt/modal/asset action을 다뤄 상대 턴 테스트가 끊기지 않는다.
- 우측 상단 debug overlay가 더 이상 렌더링되지 않는다.
- 관련 Vitest와 게임 E2E가 통과한다.

## Role Plan

- Planner: 범위 / 완료 기준 / 검증 계획 문서화
- Implementer: 패널/게임 페이지 최소 범위 구현
- Reviewer: mock/real 경계와 prompt 제어 경로 셀프 리뷰
- Tester: Vitest, game check, lint, build, game E2E 실행

## Test Plan

- `npx vitest run src/features/room-chat/DevRoomChatControlPanel.test.tsx src/pages/GamePage.test.tsx`
- `npm run ai:check:game`
- `npm run ai:check:lobby`
- `npm run build`
- `npm run lint`
- `npx playwright test e2e/chat-flow-game-room.spec.ts`
- `npm run ai:self-review -- --files src/features/room-chat/DevRoomChatControlPanel.tsx src/features/room-chat/DevRoomChatControlPanel.test.tsx src/pages/GamePage.tsx src/pages/GamePage.test.tsx e2e/chat-flow-game-room.spec.ts TODO.md docs/ai/tasks/game-chat-panel-solo-play-toggle/plan.md docs/ai/tasks/game-chat-panel-solo-play-toggle/context.md docs/ai/tasks/game-chat-panel-solo-play-toggle/checklist.md`
