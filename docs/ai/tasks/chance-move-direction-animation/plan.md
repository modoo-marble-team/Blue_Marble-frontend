# Plan - chance-move-direction-animation

## 작업 목표

- `CHANCE_RESOLVED`의 `MOVE_FORWARD`/`MOVE_BACKWARD` 정보를 `PLAYER_MOVED(trigger=chance)` 애니메이션 방향에 반영한다.
- 기존 기본 이동(일반 주사위 이동)은 그대로 시계 방향 순차 애니메이션을 유지한다.

## 범위

- `src/components/board/GameBoard.tsx`
- `src/components/board/gameBoardEventQueueUtils.ts`
- `src/components/board/gameBoardEventQueueUtils.test.ts`

## 구현 단계

1. `CHANCE_RESOLVED`에서 방향/칸수 힌트를 추출하는 유틸을 추가한다.
2. `GameBoard`에서 플레이어별 임시 힌트 저장소(ref)를 추가한다.
3. `PLAYER_MOVED` 처리 시 `trigger=chance`인 경우 힌트를 우선 적용해 방향을 결정한다.
4. 힌트가 누락된 경우 `from/to/steps` 기반으로 방향을 보정 추론한다.
5. 이동 완료 후 힌트를 소비(삭제)해 다음 이벤트에 영향이 없게 한다.

## 검증 계획

- `npm run test -- src/components/board/gameBoardEventQueueUtils.test.ts`
- `npm run test -- src/components/board/gameBoardActionHandlers.test.ts`
- `npm run lint`
- `npm run build`
