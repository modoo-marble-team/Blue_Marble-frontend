# Plan

## Task

- 작업 이름: Panel Total Assets Authoritative
- 작업 slug: panel-total-assets-authoritative
- 요청 날짜: 2026-03-24
- 담당 범위: 우측 플레이어 패널 총자산과 종료 결과 모달이 모두 서버 권위 종료 payload 기준으로 맞도록 정렬하고, `GAME_OVER` event 계약을 프론트 `gameResult` 상태로 복구

## Goal

- 우측 플레이어 패널이 진행 중에는 서버 `players[].totalAssets`를 우선 사용해 현재 우세 플레이어를 보여준다
- 게임 종료 후에는 `gameResult.rankings[].final_assets` 또는 `gameResult.winner.assets`와 같은 값으로 패널을 맞춘다
- 종료 결과 모달은 authoritative `gameResult`가 있을 때만 열어 패널과 결과 숫자가 서로 어긋나지 않게 정리한다
- live 종료는 `game:patch.events[].GAME_OVER`, reconnect 종료는 finished snapshot 기준으로도 같은 `gameResult` 상태를 복구한다

## WAT Workflow

1. 현재 우측 패널과 종료 결과 모달의 데이터 source 차이를 정리한다
2. adapter가 `GAME_OVER` event와 reconnect finished snapshot을 `gameResult`로 정규화하도록 보강한다
3. UI는 계속 `store.gameResult`만 읽도록 유지하고 회귀 테스트와 최소 검증을 실행한다

## In Scope

- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `src/components/board/GameBoard.tsx`
- `src/components/game/panels/PlayerPanel.tsx`
- `src/services/socket/gameContractAdapters.ts`
- `src/services/socket/gameContractAdapters.test.ts`
- `TODO.md`

## Out Of Scope

- 게임 소켓 계약 자체 변경
- store 타입 구조 변경
- 결과 모달 레이아웃 또는 문구 개편

## Target Files

- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `src/components/board/GameBoard.tsx`
- `src/components/game/panels/PlayerPanel.tsx`
- `src/services/socket/gameContractAdapters.ts`
- `src/services/socket/gameContractAdapters.test.ts`
- `TODO.md`

## Task Tracking

- TODO line: - [x] `panel-total-assets-authoritative` - Panel Total Assets Authoritative (`docs/ai/tasks/panel-total-assets-authoritative/`)
- Session brief: `npm run ai:session:brief -- panel-total-assets-authoritative`
- Reopen docs: `docs/ai/tasks/panel-total-assets-authoritative/plan.md`, `context.md`, `checklist.md`

## Completion Criteria

- 우측 패널 총자산 숫자가 `money`가 아니라 서버 `totalAssets`를 우선 사용한다
- 우측 패널 정렬과 왕관 기준이 총자산 기준으로 동작한다
- 게임 종료 시 패널이 `rankings.final_assets` 또는 `winner.assets`와 일치한다
- `isGameOver=true`만으로는 종료 모달이 열리지 않고 authoritative `gameResult`가 있을 때만 열린다
- `GAME_OVER` event만 와도 adapter가 `gameResult`를 복구해 종료 모달 source를 만든다
- reconnect finished snapshot에 `gameResult`가 없어도 최소 종료 결과를 재구성한다
- `npx vitest run src/services/socket/gameContractAdapters.test.ts src/pages/GamePage.test.tsx`, `npm run ai:check:game`, `npm run ai:check:build`, `npm run lint`, `npm run ai:self-review` 결과를 남긴다

## Role Plan

- Planner: authoritative source와 종료 payload 우선순위 정리
- Implementer: `gameContractAdapters`가 종료 event/snapshot을 `gameResult`로 복구하도록 구현
- Reviewer: 총자산 정렬/왕관/종료 모달 authoritative source 정합성 확인
- Tester: 회귀 테스트와 game/build/lint/self-review 실행

## Test Plan

- `npx vitest run src/services/socket/gameContractAdapters.test.ts src/pages/GamePage.test.tsx`
- `npm run ai:check:game`
- `npm run ai:check:build`
- `npm run lint`
- `npm run ai:self-review -- --files src/pages/GamePage.tsx src/pages/GamePage.test.tsx src/components/board/GameBoard.tsx src/components/game/panels/PlayerPanel.tsx src/services/socket/gameContractAdapters.ts src/services/socket/gameContractAdapters.test.ts TODO.md docs/ai/tasks/panel-total-assets-authoritative/plan.md docs/ai/tasks/panel-total-assets-authoritative/context.md docs/ai/tasks/panel-total-assets-authoritative/checklist.md`
