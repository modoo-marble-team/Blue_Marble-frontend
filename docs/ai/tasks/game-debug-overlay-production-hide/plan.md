# Plan

## Task

- 작업 이름: Game Debug Overlay 배포 숨김
- 작업 slug: `game-debug-overlay-production-hide`
- 요청 날짜: 2026-03-26
- 담당 범위: `GamePage` 오른쪽 상단 디버그 오버레이를 production에서 숨기고 dev에서는 유지

## Goal

- 최종 배포에서는 `Pending action / Action acknowledged / lastError` 박스가 보이지 않는다.
- 개발 환경에서는 기존 디버그 오버레이를 그대로 유지한다.
- fatal fallback, 게임 진행, prompt 처리, store 계약은 바꾸지 않는다.

## In Scope

- `src/config/env.ts`
- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- task 문서와 TODO 상태 정리

## Out Of Scope

- 게임 socket/store 계약 변경
- `DevRoomChatControlPanel` 등 다른 개발용 UI 제거
- 브라우저 console 출력 정리

## Completion Criteria

- production 기준 `GamePage`에서 오른쪽 상단 디버그 오버레이가 렌더링되지 않는다.
- dev 기준에서는 기존 overlay가 그대로 보인다.
- fatal route fallback은 overlay 플래그와 무관하게 기존처럼 동작한다.

## Test Plan

- `npx vitest run src/pages/GamePage.test.tsx`
- `npm run lint`
- `npm run ai:check:game`
- `npm run build`
- `npm run ai:self-review -- --files TODO.md docs/ai/tasks/game-debug-overlay-production-hide/plan.md docs/ai/tasks/game-debug-overlay-production-hide/context.md docs/ai/tasks/game-debug-overlay-production-hide/checklist.md src/config/env.ts src/pages/GamePage.tsx src/pages/GamePage.test.tsx`
