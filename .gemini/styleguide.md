# Blue Marble Review Guide

Focus on bugs, regressions, missing tests, and contract mismatches first.

- Follow `docs/rules.md` and `docs/testing.md`.
- Keep pages thin; detailed logic belongs in hook/controller/api/socket layers.
- When socket or contract code changes, check types, mocks, tests, and docs together.
- Prefer high-signal findings over style nitpicks.
- For lobby, presence, waiting-room, and game runtime changes, prioritize behavioral regressions.
- Avoid duplicating deterministic workflow warnings when there is no new actionable issue.
