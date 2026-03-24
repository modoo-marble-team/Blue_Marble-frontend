# Plan

## Task

- 작업 이름: Game Runtime Warning Cleanup
- 작업 slug: game-runtime-warning-cleanup
- 요청 날짜: 2026-03-25
- 담당 범위: `GameBoard` lint warning과 `GamePage.test` act warning을 기능 변경 없이 정리

## Goal

- `GameBoard.tsx`의 `react-hooks/exhaustive-deps` warning을 제거한다
- `GamePage.test.tsx` 실행 시 `act(...)` warning이 출력되지 않게 한다
- 경고 정리 외에 게임 런타임 동작이나 소켓 계약은 바꾸지 않는다

## WAT Workflow

1. `GameBoard`의 travel token callback deps 누락 경고를 제거한다
2. `GamePage.test`의 store mutation/cleanup 순서를 정리해 act warning을 제거한다
3. lint와 대상 테스트로 warning 제거를 검증한다

## In Scope

- `src/components/board/GameBoard.tsx`
- `src/pages/GamePage.test.tsx`
- `TODO.md`

## Out Of Scope

- 사용자 기능 변경
- 소켓 계약/adapter/store shape 변경
- warning 정리와 무관한 리팩터링

## Completion Criteria

- `npm run lint`에서 `GameBoard.tsx` `react-hooks/exhaustive-deps` warning이 사라진다
- `npx vitest run src/pages/GamePage.test.tsx` 실행 시 `act(...)` warning이 출력되지 않는다
- 관련 변경은 두 커밋으로 분리한다

## Test Plan

- `npm run lint`
- `npx vitest run src/pages/GamePage.test.tsx`
- 필요 시 `npm run ai:check:game`
