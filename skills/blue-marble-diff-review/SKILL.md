---
name: blue-marble-diff-review
description: Diff review and targeted validation workflow for Blue_Marble-frontend. Use when reviewing changes in this repository, selecting the smallest ai:check commands for a diff, running repo-specific self-review, or critiquing changes against docs/rules.md, docs/testing.md, and realtime contract risks.
---

# Blue Marble Diff Review

Use this skill when the task is review-first rather than implementation-first.
Default to bug, regression, and missing-test detection.

## Start Sequence

1. Run `npm run ai:self-review`.
2. Read the relevant manuals listed by that output.
3. If you need command selection, run `npm run ai:check:fast -- --plan`.
4. If UI flow changed, run `npm run ai:check:ui -- --plan`.
5. Read [references/review-focus.md](references/review-focus.md) before writing findings.

## Review Output Contract

- Put findings first.
- Order findings by severity.
- Include file references.
- Focus on behavioral regressions, race conditions, cleanup mismatches, contract drift, and missing tests.
- Keep summary short and secondary.

## Domain-Specific Review Focus

- Lobby and presence: unread ownership, missing socket cleanup, mock and real behavior drift
- Waiting room: duplicate leave, cleanup order, start-condition regressions
- Game runtime: prompt normalization drift, mock and real contract mismatch, `gameId` fallback leaks
- Global: `docs/rules.md` violations, test coverage gaps, hidden side effects

## Required Questions

- Did the change increase R5-style context switching or make the core flow harder to read?
- Did a hook or adapter change its return shape or semantic contract?
- Did a socket subscription or cleanup path lose its pair?
- Did mock, contract, and tests move together?
- Does at least one test directly cover the changed behavior?

Use the domain skills when you need implementation details, but keep this skill focused on review quality.
