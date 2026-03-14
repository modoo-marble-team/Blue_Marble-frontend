---
name: blue-marble-waiting-room
description: Waiting room lifecycle, ready-start-leave flow, socket sync, and cleanup safety for Blue_Marble-frontend. Use when changing src/pages/waiting-room or behavior around enter_room, leave_room, prejoined snapshots, host readiness rules, game_start navigation, or cleanup timing.
---

# Blue Marble Waiting Room

Use this skill for waiting room behavior where UI, lifecycle, and socket cleanup intersect.
Classify the change before editing.

## Start Sequence

1. Read `docs/ai/manuals/waiting-room.md`.
2. Read `docs/socket-mock-server.md`.
3. Read [references/targets.md](references/targets.md) for file, test, and risk maps.
4. Decide whether the issue belongs to UI, lifecycle, socket sync, or actions.
5. Run `npm run ai:check:waiting-room` after implementation.
6. Run `npm run ai:check:waiting-room-e2e` if room entry, start flow, or leave flow changed.

## Preserve These Boundaries

- Keep `useWaitingRoomController` as the composition layer.
- Keep detailed transitions inside `controller/actions.ts`, `controller/lifecycle.ts`, or `controller/socketSync.ts`.
- Keep `socket.ts` as the waiting room emit/subscribe abstraction.

## Preserve These Invariants

- Do not emit `leave_room` before `leaveWaitingRoom` succeeds.
- Preserve `leaveInFlightRef`, `hasEnteredRoomRef`, and `hasLeftRoomRef` semantics when editing leave flow.
- Keep StrictMode cleanup handling intact.
- Preserve host-only start and non-host ready rules.
- Keep game start navigation aligned to `game_id` and `room_id`.

## Review Risks

- duplicate leave requests
- cleanup and manual leave racing each other
- snapshot bootstrap masking later socket sync bugs
- room flow fixes applied only to mock or only to real socket mode

Use `blue-marble-diff-review` to produce a risk-focused review after implementation.
