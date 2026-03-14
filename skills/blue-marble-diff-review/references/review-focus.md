# Review Focus

## Findings First

When the user asks for review:

- list findings before summaries
- order by severity
- reference concrete files
- prefer real regression risk over style comments

## Common Failure Modes In This Repo

- socket `on` added without `off`
- cleanup and manual user action racing
- mock path updated without real path or vice versa
- query or hook return shape drifting silently
- task docs and validation plan missing for risky changes

## Recommended Commands

- `npm run ai:self-review`
- `npm run ai:check:fast -- --plan`
- `npm run ai:check:ui -- --plan`
