# Context

## Current Behavior

- `Workflow Gate` workflow와 `AI Review` comment-only workflow는 이미 repo에 있다.
- quickstart와 usage에는 gate 사용법이 있지만, `develop` branch protection에 언제 어떻게 연결하는지에 대한 운영 runbook는 없다.
- 사용자 확인 기준으로 `develop` branch protection에는 `workflow-gate` required check가 이미 추가되었다.
- smoke 검증용 branch `chore/workflow-gate-smoke-pr`는 origin에 push되었고, PR 생성 URL도 준비되었다.
- smoke PR 생성 URL: `https://github.com/modoo-marble-team/Blue_Marble-frontend/pull/new/chore/workflow-gate-smoke-pr`
- `gh auth status` 결과 기본 계정 토큰이 invalid라, 이 환경에서 `gh pr create`로 PR을 자동 생성하는 것은 불가능하다.
- `GH_TOKEN`, `GITHUB_TOKEN` 환경 변수도 비어 있고, `gh auth login -h github.com` 재시도 후에도 유효한 로그인 상태로 전환되지 않았다.

## Related Files

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/workflow-gate-rollout.md`
- `docs/ai/quickstart.md`
- `docs/ai/usage.md`
- `docs/ai/team-memory.md`
- `.github/workflows/workflow-gate.yml`
- `.github/workflows/ai-review.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- `develop`만 대상이고 다른 보호 브랜치는 이번 단계에서 건드리지 않는다.
- 유예 기간은 1 영업일로 고정한다.
- false positive 2건 이상이면 required check를 잠시 해제하고 후속 task로 넘긴다.
- 이 환경에서 GitHub branch protection 직접 변경은 불가능하므로 수동 적용 절차를 문서화해야 한다.

## Decision Notes

- repo 안에는 rollout runbook를 추가하고, quickstart/usage/team-memory에는 짧은 링크와 durable rule만 남긴다.
- 운영 담당자가 바로 쓸 수 있도록 runbook 안에 team announcement template과 verification / observation log 형식까지 포함한다.
- branch protection 적용은 사용자가 GitHub UI에서 수동으로 완료한 것으로 간주하고, 이후 smoke/fail PR 검증 단계로 진행한다.
- `gh` 인증 문제 때문에 PR 생성은 브라우저 URL을 여는 방식으로 우회한다.
- gate 정책 자체는 4차에서 바꾸지 않고 운영 전환 절차만 고정한다.

## Session Handoff Notes

- 다시 읽을 문서: `docs/ai/workflow-gate-rollout.md`, `docs/ai/usage.md`, `docs/ai/quickstart.md`, `docs/ai/team-memory.md`
- 바로 이어서 할 1개 단계: 브라우저에서 smoke PR을 제출하고 `workflow-gate` required check가 pass하는지 확인한다.
- pending decision / blocker: `gh pr create`는 막혀 있으므로 브라우저에서 PR 제출/확인이 필요하다.
- 검증 재개 지점: smoke PR 제출 후 `Workflow Gate` pass 여부를 runbook의 verification log 첫 줄에 기록

## Open Risks

- smoke PR이 제출되지 않으면 required check가 실제로 merge gate로 동작하는지 아직 검증되지 않는다.
- 실제 required check 전환 후 첫 3 영업일 false positive 기록이 없으면 운영 품질을 판단하기 어렵다.
- 운영 담당자가 runbook의 log를 남기지 않으면 rollback 판단 근거가 약해진다.
