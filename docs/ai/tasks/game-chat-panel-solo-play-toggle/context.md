# Context

## Current Behavior

- 게임 페이지의 room chat DEV 패널 문구는 이미 `게임방 채팅 테스트 패널`로 정리됐지만, solo-play 토글까지 패널 내부에 묶여 있어 게임 HUD 기준으로는 눈에 잘 띄지 않는다.
- 우측 상단에는 pending/ack/error 상태를 보여주는 debug overlay가 남아 있어 실제 포트폴리오 데모 화면에서는 다소 개발자용처럼 보인다.
- `GamePage`는 mock 모드에서도 기본적으로 `boardCurPlayer === MOCK_LOCAL_PLAYER_INDEX` 또는 숨은 env 플래그일 때만 내 턴으로 간주한다.
- non-board prompt는 `prompt.playerId === currentUserId` 조건으로만 보이고, BoardGame도 `localPlayerId` 기준으로 로컬 플레이어 이벤트/모달/자산 액션을 판단한다.

## Related Files

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/ai/manuals/lobby.md`
- `src/features/room-chat/DevRoomChatControlPanel.tsx`
- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `src/components/board/GameBoard.tsx`
- `e2e/chat-flow-game-room.spec.ts`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/ai/manuals/lobby.md`

## Constraints

- 실제 서버 경로에서는 기존처럼 현재 사용자 턴에서만 액션 가능해야 한다.
- `game:*` payload, `gameId` canonical 흐름, mock handler 계약은 바꾸지 않는다.
- 패널 문구 변경은 사용자 노출 문자열만 조정하고, 컴포넌트 심볼/파일 경로는 유지한다.
- solo-play는 mock 전용 편의 기능이므로 real socket 경로에서는 노출/영향이 없어야 한다.

## Decision Notes

- `혼자 플레이` 토글 상태는 계속 게임 페이지가 소유하되, UI는 패널 밖 독립 control chip으로 렌더링한다.
- `DevRoomChatControlPanel`은 다시 채팅 주입 전용으로 좁혀 패널 안에서는 발신자 선택과 샘플 채팅 전송만 담당한다.
- `GamePage`는 mock solo-play 여부를 한 곳에서 계산하고, turn control / prompt visibility / BoardGame localPlayerId에 공통 적용한다.
- BoardGame에는 current user id 대신 `effectiveBoardLocalPlayerId`를 넘겨, solo-play ON 시 활성 플레이어 이벤트를 로컬 이벤트처럼 취급하게 만든다.
- 기존 숨은 env 플래그 `VITE_ALLOW_ALL_MOCK_TURNS`는 유지하되, UI 토글과 같은 의미로 합친다.
- pending/ack/error debug overlay는 제거하고, 오류 표시는 기존 modal/toast/fatal-route 처리 경로만 남긴다.

## Open Risks

- solo-play ON 시 BoardGame이 활성 플레이어를 로컬 플레이어처럼 다루므로, 상대 턴 자산 액션까지 열린다. mock 편의 모드 의도에는 맞지만 real 경로에는 절대 새면 안 된다.
- prompt/player ownership 조건을 완화하는 만큼, mock 경로 판정이 빠지면 real 서버 화면에 잘못 노출될 수 있어 테스트로 고정해야 한다.
- GamePage 테스트는 env/mock 분기가 있어 회귀가 생기기 쉬우므로, mock 모드와 real 모드 기대치를 분리해서 검증해야 한다.
