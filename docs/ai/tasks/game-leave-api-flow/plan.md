# Plan

## Task

- 작업 이름: game leave api flow
- 요청 날짜: 2026-03-20
- 담당 범위: game leave API 계층, GamePage 종료 흐름, exit modal pending 상태, 관련 테스트, task 문서

## Goal

- 게임 페이지의 `나가기` 버튼이 단순 페이지 이동이 아니라 `POST /api/games/{game_id}/leave` 성공 이후에만 로비로 이동하도록 만든다.

## In Scope

- `src/pages/game/api.ts` leave API helper 추가
- mock 모드 leave fallback 추가
- `GamePage.tsx` exit confirm async 흐름 적용
- `ExitGameModal.tsx` pending 상태 지원
- `GamePage` / game api 테스트 추가
- task 문서 추가

## Out Of Scope

- leave 이후 서버 socket broadcast 정책 변경
- disconnect timeout / reconnect 의미 분리 구현
- game socket payload 스키마 변경

## Target Files

- `src/pages/game/api.ts`
- `src/pages/game/api.test.ts`
- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `src/components/game/modals/ExitGameModal.tsx`
- `docs/ai/tasks/game-leave-api-flow/*`

## Completion Criteria

- 게임 나가기 버튼 클릭 시 leave API가 호출된다.
- leave 성공 시 game store를 초기화하고 `/lobby`로 이동한다.
- leave 실패 시 토스트를 띄우고 현재 게임 화면을 유지한다.
- mock/real 경로 모두 leave helper가 동작한다.

## Test Plan

- `npx vitest run src/pages/game/api.test.ts src/pages/GamePage.test.tsx`
- `npm run build`
