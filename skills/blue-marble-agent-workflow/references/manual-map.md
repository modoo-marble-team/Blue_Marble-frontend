# Manual Map

Load these documents before implementation:

## Always Read

- `AGENTS.md`
- `docs/rules.md`
- `docs/testing.md`

## Path-Based Manuals

- `src/pages/lobby/**`, `src/features/presence/**`, `src/features/room-chat/**`
  - read `docs/ai/manuals/lobby.md`
- `src/pages/waiting-room/**`
  - read `docs/ai/manuals/waiting-room.md`
- `src/pages/GamePage.tsx`, `src/components/game/**`, `src/components/board/**`, `src/hooks/game/**`, `src/services/socket/game.handler.ts`, `src/stores/game.store.ts`, `src/mocks/handlers/game.handler.ts`
  - read `docs/ai/manuals/game-runtime.md`
- `src/contracts/socket/**`, `mock-socket-server/**`, `src/lib/socket.ts`
  - read `docs/socket-mock-server.md`

## Validation Helpers

- `npm run ai:check:fast -- --plan`
- `npm run ai:check:ui -- --plan`
- `npm run ai:self-review`
