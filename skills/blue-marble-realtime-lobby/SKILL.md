---
name: blue-marble-realtime-lobby
description: Realtime lobby, presence, direct-message, unread badge, and room chat workflow for Blue_Marble-frontend. Use when changing src/pages/lobby, src/features/presence, or src/features/room-chat, especially for socket subscriptions, online user state, DM unread logic, room join actions, or chat behavior.
---

# Blue Marble Realtime Lobby

Use this skill for lobby-related realtime behavior.
Preserve the boundary between page orchestration and hook/controller logic.

## Start Sequence

1. Read `docs/ai/manuals/lobby.md`.
2. If socket payloads or connection behavior change, also read `docs/socket-mock-server.md`.
3. Read [references/targets.md](references/targets.md) for key files, tests, and invariants.
4. Run `npm run ai:check:lobby` after implementation.
5. If user flows changed, consider `npm run ai:check:chat-e2e`.

## Keep These Boundaries

- `LobbyPage.tsx` should compose state and panels, not absorb deep socket logic.
- `useLobbyRoomsQuery` and `useOnlineUsersSocket` should keep their current return shape.
- DM unread ownership belongs in controller logic, not scattered across UI components.
- Mock and real socket paths must preserve the same visible behavior.

## Preserve These Invariants

- Keep unread counts keyed by user id.
- Keep the "cannot DM a playing user" rule.
- Keep current-user mock presence updates aligned with login/logout.
- Keep private room join behavior in modal state, not ad hoc page branches.

## Review Risks

- unread state being recomputed from the wrong source
- missing `socket.off(...)` cleanup
- mock-only or real-only fixes
- UI components taking over controller responsibilities

Use `blue-marble-diff-review` if the user asks for a review instead of an implementation.
