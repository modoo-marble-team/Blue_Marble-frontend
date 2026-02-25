# Game Team Ownership (FE-B / FE-C)

이 문서는 게임 영역만 FE-B/FE-C가 분업한다는 기준을 고정합니다.

## Scope

- 포함: 게임 플레이 화면, 게임 상태, 게임 소켓, 보드 렌더링
- 제외: 로비, 메신저, 랜딩페이지, 로그인

## FE-B Owner (Game Logic Layer)

- `src/stores/game.store.ts`
- `src/stores/useGameStore.ts` (legacy wrapper)
- `src/stores/legacy.useGameStore.ts`
- `src/services/socket/game.handler.ts`
- `src/hooks/game/*`
- `src/components/game/*`
- `src/pages/GamePage.tsx`
- `src/features/game/useGameState.ts` (legacy wrapper)

## FE-C Owner (Game Rendering Layer)

- `src/components/board/*`
- `src/styles/board.css`
- `src/game/phaserConfig.tsx` (legacy wrapper for board)

## Shared Contract (Change by Agreement)

- `src/types/domain.ts`

## Out of Scope for FE-B/FE-C Game Split

- `src/pages/lobby/*`
- lobby 관련 hooks/api/types
- 메신저/랜딩페이지/로그인 관련 전체 코드
