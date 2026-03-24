# Context

## Current Behavior

- 우측 플레이어 패널은 기존에 `money` 중심으로 정렬되고 왕관도 보유금 기준으로 표시됐다
- 백엔드와의 확인 결과 진행 중 총자산은 `players[].totalAssets` patch/snapshot으로 내려오고, 게임 종료 자산은 `gameResult.rankings[].final_assets` 또는 `gameResult.winner.assets`가 authoritative 값이다
- 추가 확인 결과 live 종료의 canonical source는 `game:patch.events[].type === "GAME_OVER"`이며, reconnect snapshot에는 `gameResult`가 없을 수 있다
- 기존 종료 모달은 `isGameOver`만 켜져도 먼저 열리고, authoritative `gameResult`가 없으면 로컬 fallback 계산으로 결과를 보여줄 수 있었다
- 따라서 우측 패널과 종료 결과 모달이 서로 다른 기준을 쓰면 사용자 입장에서 누가 앞서는지 헷갈릴 수 있다

## Related Files

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`
- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `src/components/board/GameBoard.tsx`
- `src/components/game/panels/PlayerPanel.tsx`
- `src/services/socket/gameContractAdapters.ts`
- `src/services/socket/gameContractAdapters.test.ts`
- `TODO.md`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`

## Constraints

- 프론트가 로컬 계산값을 canonical source로 승격하지 않는다
- 진행 중에는 서버 `totalAssets`가 있으면 그것을 우선 사용하고, 없을 때만 기존 fallback을 유지한다
- 종료 후에는 패널과 결과 모달 모두 authoritative 종료 payload를 우선하되, reconnect snapshot에서는 server field 조합으로 최소 결과를 재구성한다
- `GamePage.tsx`, `GameBoard.tsx`는 game-runtime high-risk 경로이므로 테스트와 build 근거를 남긴다

## Decision Notes

- `GamePage` 안에 패널 전용 view model을 만들어 표시값, 정렬 기준, 왕관 기준을 한 번에 계산한다
- `rankings`가 있으면 패널도 ranking 순서와 `final_assets`를 그대로 따른다
- `winner`만 있는 종료 payload는 승자 행 자산만 `winner.assets`로 보정하고 승자를 최상단으로 배치한다
- 종료 모달은 authoritative `gameResult`가 있을 때만 열고, 로컬 fallback 자산 계산은 socket runtime 결과 source로 쓰지 않는다
- adapter가 `GAME_OVER` event를 synthetic `gameResult` patch로 승격해 UI가 raw event를 직접 읽지 않게 한다
- reconnect finished snapshot에 `gameResult`가 없으면 `winnerId + players[].totalAssets` 기준 최소 `gameResult`를 합성한다
- `PlayerPanel` UI 컴포넌트는 동작 변경 없이 총자산 기준 주석만 정리한다

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/manuals/game-runtime.md`, `src/pages/GamePage.tsx`, 이 task 문서 3종
- 바로 이어서 할 1개 단계: 필요하면 reconnect finished state 전용 안내 문구/배너를 추가 보정한다
- pending decision / blocker: 없음
- 검증 재개 지점: `npx vitest run src/services/socket/gameContractAdapters.test.ts src/pages/GamePage.test.tsx`

## Open Risks

- `src/pages/GamePage.test.tsx` 실행 시 기존 `act(...)` warning은 계속 출력된다
- `src/components/board/GameBoard.tsx`의 기존 `react-hooks/exhaustive-deps` warning은 이번 범위 밖이라 그대로 남는다
