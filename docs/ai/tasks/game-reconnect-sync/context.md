# Context

## Current Behavior

- `useGameState`는 mount 시 `game:sync`와 `game:sync_timer`를 요청한다.
- 같은 `gameId`에서 이미 `players.length > 0`이면 초기 동기화를 생략한다.
- socket `connect` 이벤트에서도 같은 `syncGameState` 분기를 그대로 사용한다.

## Problem

- 같은 게임 화면을 유지한 상태에서 소켓이 끊겼다가 다시 연결되면, 로컬 store에 기존 player state가 남아 있다는 이유로 `game:sync`가 재요청되지 않을 수 있다.
- 이 경우 끊긴 동안 놓친 patch를 다시 못 받아 화면이 stale 상태로 남을 수 있다.
- 새로고침은 보통 store가 비어 `knownRevision: 0` snapshot 경로를 타지만, reconnect는 다른 조건으로 다뤄야 한다.

## Related Files

- `src/hooks/game/useGameState.ts`
- `src/hooks/game/useGameState.test.tsx`
- `src/services/socket/game.handler.ts`
- `src/stores/game.store.ts`
- `docs/ai/manuals/common.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- initial mount에서 같은 게임 상태를 이미 들고 있을 때 불필요한 sync 반복은 피한다.
- reconnect에서는 local state 유무보다 서버 재동기화를 우선한다.
- `knownRevision`은 reconnect 시 현재 store revision을 사용한다.
- mock/real runtime 경로의 visible behavior를 깨지 않는다.

## Decision Notes

- `syncGameState`에 force 옵션을 추가해 reconnect 분기만 별도로 강제 sync 처리한다.
- gameId가 바뀐 경우는 기존처럼 `knownRevision: 0` full sync로 유지한다.

## Open Risks

- reconnect 직후 revision이 오래된 상태면 서버가 diff 대신 snapshot을 줄 수 있다.
- leave/기권과 disconnect 의미 분리는 이번 범위에 포함하지 않는다.
