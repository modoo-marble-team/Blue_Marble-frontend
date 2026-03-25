# Plan

## Task

- 작업 이름: Manual Sell Selection Restore
- 작업 slug: `manual-sell-selection-restore`
- 요청 날짜: 2026-03-26
- 담당 범위: 내 턴 자산 액션 구간에서 보유 토지 클릭 수동 매각을 복구하고 서버 sell prompt 경로와 충돌하지 않게 정리

## Goal

- 내 턴의 자산 액션 가능 구간에서는 본인 소유 타일을 클릭해 수동 매각 모달을 열 수 있다.
- 서버 `SELL_OR_BANKRUPT` prompt가 떠 있을 때는 기존 prompt-driven sell modal 경로를 그대로 유지한다.
- build/buy/toll/travel/island prompt와 겹치는 상태에서는 로컬 매각 modal을 열지 않는다.

## WAT Workflow

1. task 문서와 TODO를 만들어 범위 / 완료 기준 / 검증 명령을 고정한다.
2. `GameBoard`에 owned-tile click 기반 수동 매각 경로를 복구하되 prompt/travel 경계와 충돌하지 않게 제한한다.
3. UI interaction test와 emit 회귀 테스트를 추가해 수동 매각 open/confirm 경로를 검증한다.

## In Scope

- `src/components/board/GameBoard.tsx`
- 관련 보드 테스트
- task 문서와 TODO 상태 정리

## Out Of Scope

- backend contract 변경
- 새 prompt type 추가
- build cancel 후 자동 매각 reopen
- 파산 강제 매각 정책 변경

## Target Files

- `src/components/board/GameBoard.tsx`
- `src/components/board/GameBoard.test.tsx`
- `src/components/board/gameBoardActionHandlers.test.ts`
- `docs/ai/tasks/manual-sell-selection-restore/*`
- `TODO.md`

## Task Tracking

- TODO line: - [ ] `manual-sell-selection-restore` - Manual Sell Selection Restore (`docs/ai/tasks/manual-sell-selection-restore/`)
- Session brief: `npm run ai:session:brief -- manual-sell-selection-restore`
- Reopen docs: `docs/ai/tasks/manual-sell-selection-restore/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- 내 턴 + 자산 액션 허용 상태에서 본인 소유 타일을 클릭하면 `CitySellModal`이 열린다.
- prompt가 떠 있는 동안에는 로컬 클릭으로 sell modal이 열리지 않는다.
- `CitySellModal` confirm은 기존처럼 `SELL_PROPERTY`를 emit한다.
- 다른 사람 땅, 비허용 phase, travel selection 중에는 클릭 매각이 열리지 않는다.

## Role Plan

- Planner: manual sell 허용 범위와 prompt 우선 정책 정리
- Implementer: `GameBoard` click/open 경로 복구
- Reviewer: prompt/travel과의 충돌 여부 점검
- Tester: UI interaction + game 검증 실행

## Test Plan

- `npx vitest run src/components/board/GameBoard.test.tsx src/components/board/gameBoardActionHandlers.test.ts`
- `npm run lint`
- `npm run ai:check:game`
- `npm run build`
- `npm run ai:self-review -- --files TODO.md docs/ai/tasks/manual-sell-selection-restore/plan.md docs/ai/tasks/manual-sell-selection-restore/context.md docs/ai/tasks/manual-sell-selection-restore/checklist.md src/components/board/GameBoard.tsx src/components/board/GameBoard.test.tsx src/components/board/gameBoardActionHandlers.test.ts`
