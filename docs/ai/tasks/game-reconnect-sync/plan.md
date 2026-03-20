# Plan

## Task

- 작업 이름: game reconnect sync
- 요청 날짜: 2026-03-20
- 담당 범위: game runtime reconnect sync 분기, 관련 테스트, task 문서

## Goal

- 게임 화면 유지 상태에서 소켓이 끊겼다가 다시 연결될 때, 기존 로컬 상태 유무와 관계없이 `game:sync`를 다시 보내 누락 patch를 복구한다.

## In Scope

- `useGameState`의 initial sync / reconnect sync 분기 정리
- reconnect 시 `knownRevision` 기반 재동기화 강제
- `useGameState` 테스트 보강
- task 문서 추가

## Out Of Scope

- 게임 leave/기권 계약 추가
- game socket payload 스키마 변경
- waiting-room / lobby / presence 흐름 수정

## Target Files

- `src/hooks/game/useGameState.ts`
- `src/hooks/game/useGameState.test.tsx`
- `docs/ai/tasks/game-reconnect-sync/*`

## Completion Criteria

- reconnect 시에는 local players 상태가 남아 있어도 `game:sync`를 다시 보낸다.
- initial mount의 중복 sync 생략 규칙은 유지된다.
- 관련 Vitest와 build가 통과한다.

## Test Plan

- `npx vitest run src/hooks/game/useGameState.test.tsx`
- `npm run build`
