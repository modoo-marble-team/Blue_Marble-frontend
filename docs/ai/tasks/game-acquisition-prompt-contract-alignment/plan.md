# Plan

## Task

- 작업 이름: Game Acquisition Prompt Contract Alignment
- 작업 slug: `game-acquisition-prompt-contract-alignment`
- 요청 날짜: 2026-03-26
- 담당 범위: 게임 acquisition prompt 분류를 백엔드 canonical 계약에 맞추고 malformed prompt fallback을 방어

## Goal

- 프론트는 `ACQUISITION_OR_SKIP` prompt가 왔을 때만 acquisition UI를 연다.
- 랜드마크 여부를 `buildingLevel`로 추론하지 않는다.
- acquisition prompt choice가 비정상이더라도 잘못된 fallback choice를 전송하지 않는다.

## WAT Workflow

1. task 문서와 TODO를 만들어 범위 / 완료 기준 / 검증 명령을 고정한다.
2. `promptModalMapping`에서 acquisition modal 분류와 choice fallback을 canonical 계약으로 축소한다.
3. `GameBoard` 회귀 테스트와 mapping unit test를 추가해 non-canonical prompt 오분류를 막는다.

## In Scope

- `src/components/game/modals/promptModalMapping.ts`
- `src/components/game/modals/promptModalMapping.test.ts`
- `src/components/board/GameBoard.test.tsx`
- task 문서와 TODO 상태 정리

## Out Of Scope

- backend contract 변경
- mock runtime acquisition prompt 신규 추가
- `gameContractAdapters` prompt 정규화 규칙 변경
- 랜드마크 인수 불가를 `buildingLevel === 3` 프론트 가드로 중복 구현

## Target Files

- `src/components/game/modals/promptModalMapping.ts`
- `src/components/game/modals/promptModalMapping.test.ts`
- `src/components/board/GameBoard.test.tsx`
- `docs/ai/tasks/game-acquisition-prompt-contract-alignment/*`
- `TODO.md`

## Task Tracking

- TODO line: - [ ] `game-acquisition-prompt-contract-alignment` - Game Acquisition Prompt Contract Alignment (`docs/ai/tasks/game-acquisition-prompt-contract-alignment/`)
- Session brief: `npm run ai:session:brief -- game-acquisition-prompt-contract-alignment`
- Reopen docs: `docs/ai/tasks/game-acquisition-prompt-contract-alignment/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- `ACQUISITION_OR_SKIP`만 acquisition modal로 분류된다.
- `CITY_ACQUISITION`과 choice heuristic만 있는 prompt는 acquisition으로 분류되지 않는다.
- acquisition confirm/cancel choice는 각각 `ACQUIRE` / `SKIP`일 때만 반환된다.
- malformed acquisition prompt에서 confirm 버튼 클릭이 잘못된 fallback choice를 보내지 않는다.

## Role Plan

- Planner: 백엔드 canonical acquisition 계약을 프론트 구현 기준으로 정리
- Implementer: mapping과 tests를 canonical prompt 기준으로 축소
- Reviewer: malformed prompt fallback과 board-handled 경계 점검
- Tester: mapping unit + board UI 회귀 + game/build 검증 실행

## Test Plan

- `npx vitest run src/components/game/modals/promptModalMapping.test.ts src/components/board/GameBoard.test.tsx`
- `npm run lint`
- `npm run ai:check:game`
- `npm run build`
- `npm run ai:self-review -- --files TODO.md docs/ai/tasks/game-acquisition-prompt-contract-alignment/plan.md docs/ai/tasks/game-acquisition-prompt-contract-alignment/context.md docs/ai/tasks/game-acquisition-prompt-contract-alignment/checklist.md src/components/game/modals/promptModalMapping.ts src/components/game/modals/promptModalMapping.test.ts src/components/board/GameBoard.test.tsx`
