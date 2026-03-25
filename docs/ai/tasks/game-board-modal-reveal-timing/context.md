# Context

## Why

- 현재 `shouldDelayPromptModalByMovement()`는 `pendingMovePlayerIdSet`와 `isMoving`만 본다.
- `PLAYER_MOVED`를 consume하는 순간 queue에서는 이동 이벤트가 빠지지만 `isMoving`은 다음 렌더에 반영되어, modal reveal이 먼저 되는 짧은 틈이 생긴다.
- `GamePage`의 턴 종료 버튼보다 더 근본적인 원인은 `GameBoard` 자체의 modal reveal 타이밍 경계가 빠진 상태다.

## Scope

- `GameBoard` modal reveal timing
- `GameBoard.test.tsx` 회귀 테스트
- 기존 slug 문서 복구

## Non-Goals

- prompt contract 변경
- `GamePage`의 턴 종료 버튼 모드 정책 변경
- 무인도 이동 UX 단계 축소
