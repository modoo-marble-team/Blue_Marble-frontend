# Targets

## Key Files

- `src/pages/waiting-room/WaitingRoomPage.tsx`
- `src/pages/waiting-room/hooks.ts`
- `src/pages/waiting-room/controller/actions.ts`
- `src/pages/waiting-room/controller/lifecycle.ts`
- `src/pages/waiting-room/controller/socketSync.ts`
- `src/pages/waiting-room/socket.ts`

## Key Tests

- `src/pages/waiting-room/WaitingRoomPage.test.tsx`
- `src/pages/waiting-room/WaitingRoomFlow.test.tsx`
- `src/pages/waiting-room/controller/actions.test.ts`
- `src/pages/waiting-room/controller/lifecycle.test.ts`
- `src/pages/waiting-room/controller/socketSync.test.ts`
- `src/pages/waiting-room/controller/state.test.ts`
- `src/pages/waiting-room/mockGateway.test.ts`

## Optional E2E

- `e2e/waiting-room-start-flow.spec.ts`

## High-Risk Areas

- cleanup order
- duplicate leave sequences
- start condition regressions
- mock and real socket divergence
