---
name: blue-marble-agent-workflow
description: Project-specific workflow for planning and executing non-trivial changes in Blue_Marble-frontend. Use when working in this repository and you need to load the right manuals, create or update docs/ai/tasks plan-context-checklist files, choose the smallest validation commands, or split work into planner, implementer, reviewer, and tester sessions.
---

# Blue Marble Agent Workflow

Use this skill to turn a vague repo task into a documented, validated workflow.
Do not start coding immediately on multi-step work.

## Start Sequence

1. Read `AGENTS.md`.
2. Read `docs/rules.md` and `docs/testing.md`.
3. Read the path-specific manual map in [references/manual-map.md](references/manual-map.md).
4. If the task touches more than one logical step, create or update `docs/ai/tasks/<task-slug>/plan.md`, `context.md`, and `checklist.md`.
5. Before implementation, summarize:
   - the target files
   - the completion criteria
   - the smallest validation commands
6. Before final output, run `npm run ai:self-review`.

## Decide Whether To Create A Task Workspace

Create or update `docs/ai/tasks/<task-slug>/` when any of the following is true:

- the change crosses multiple folders
- the change has distinct planning and implementation phases
- the task involves contracts, socket flows, cleanup, or multiple tests
- the task is important enough that another session may continue it later

Skip the task workspace only for very small, single-file changes with obvious validation.

Read [references/task-memory.md](references/task-memory.md) when you need exact expectations for `plan.md`, `context.md`, or `checklist.md`.

## Choose The Smallest Validation Set

- Use `npm run ai:check:fast -- --plan` to preview the narrowest code-first checks for the current diff.
- Use `npm run ai:check:ui -- --plan` when page flow or end-to-end user behavior may have changed.
- Use `npm run ai:self-review` before finalizing to print relevant manuals, review questions, warnings, and suggested commands.
- If the diff is documentation-only, prefer consistency review over full runtime validation.

## Split Roles When The Task Is Risky

Use role-split sessions when the task has high regression risk or multiple decisions:

- Planner: use `docs/ai/roles/planner.md`
- Implementer: use `docs/ai/roles/implementer.md`
- Reviewer: use `docs/ai/roles/reviewer.md`
- Tester: use `docs/ai/roles/tester.md`

Do not let the implementer session be the only reviewer on socket, cleanup, or contract-heavy changes.

## Escalate To Domain Skills

After the global workflow is clear, load the matching domain skill:

- `blue-marble-realtime-lobby` for `src/pages/lobby/**`, `src/features/presence/**`, `src/features/room-chat/**`
- `blue-marble-waiting-room` for `src/pages/waiting-room/**`
- `blue-marble-game-runtime` for `src/pages/GamePage.tsx`, `src/components/game/**`, `src/components/board/**`, `src/hooks/game/**`, `src/services/socket/game.handler.ts`, `src/stores/game.store.ts`, `src/mocks/handlers/game.handler.ts`
- `blue-marble-diff-review` for code review, risk scanning, and validation planning

Keep this skill focused on workflow orchestration, not domain implementation details.
