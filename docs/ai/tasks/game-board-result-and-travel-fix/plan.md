# Plan

## Task

- 작업 이름: Game Board Result And Travel Fix
- 작업 slug: `game-board-result-and-travel-fix`
- 요청 날짜: 2026-03-25
- 담당 범위: 게임 결과 모달의 보유도시 표시 복구와 이벤트칸 오인 travel 애니메이션 수정

## Goal

- 게임 종료 결과 모달이 각 플레이어의 보유도시 수를 `-`가 아니라 종료 시점 타일 소유 정보 기준으로 표시한다
- 광주-이벤트-춘천 사이 이벤트칸(`id: 20`) 출발 이동에 잘못 붙던 빠른 travel 애니메이션을 제거한다
- `src/components/board/**` high-risk 경로 변경에 필요한 task 문서, TODO 연결, manual, 검증 근거를 함께 남긴다

## In Scope

- `src/components/board/GameBoard.tsx`
- `src/components/board/gameBoardResultUtils.ts`
- `src/components/board/gameBoardResultUtils.test.ts`
- `src/components/board/gameBoardEventQueueUtils.ts`
- `src/components/board/gameBoardEventQueueUtils.test.ts`
- `TODO.md`

## Out Of Scope

- `GameResult` / socket contract / backend payload 변경
- 대기방, 로비, 게임 패널 등 다른 UI 경로 수정
- travel prompt 자체의 흐름이나 서버 이벤트 shape 변경

## Completion Criteria

- 결과 모달의 `보유도시`가 `PROPERTY` 타일 소유 개수를 `n개` 형식으로 표시한다
- `winner`만 있는 종료 payload에서도 `0개` 포함 정상 표기한다
- 빠른 travel 이동은 `trigger === 'travel'` 또는 출발 타일이 `TRAVEL` / `ISLAND`일 때만 적용된다
- 이벤트칸(`EVENT`) 출발 이동은 일반 이동 속도를 유지한다
- `npm run lint`, 관련 Vitest, `npm run ai:check:game`, `npm run ai:check:build`가 통과한다

## Test Plan

- `npx vitest run src/components/board/gameBoardResultUtils.test.ts`
- `npx vitest run src/components/board/gameBoardEventQueueUtils.test.ts`
- `npm run lint`
- `npm run ai:check:game`
- `npm run ai:check:build`
