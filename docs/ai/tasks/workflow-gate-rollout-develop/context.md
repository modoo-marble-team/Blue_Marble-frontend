# Context

## Current Behavior

- `Workflow Gate` workflow와 `AI Review` comment-only workflow는 이미 repo에 있다.
- quickstart와 usage에는 gate 사용법이 있지만, `develop` branch protection에 언제 어떻게 연결하는지에 대한 운영 runbook는 없다.
- 사용자 확인 기준으로 `develop` branch protection에는 `workflow-gate` required check가 이미 추가되었다.
- smoke 검증용 branch `chore/workflow-gate-smoke-pr`는 origin에 push되었고, PR 생성 URL도 준비되었다.
- smoke PR 생성 URL: `https://github.com/modoo-marble-team/Blue_Marble-frontend/pull/new/chore/workflow-gate-smoke-pr`
- 추가 검증용 branch도 origin에 push되었다.
  - `chore/workflow-gate-high-risk-valid`
  - `chore/workflow-gate-fail-missing-task`
  - `chore/workflow-gate-fail-slug-mismatch`
  - `chore/workflow-gate-fail-missing-manual`
- 로컬 `ai:pr-gate` preflight 결과는 아래 기대값과 일치한다.
  - smoke/docs-only: pass
  - high-risk valid body: pass
  - high-risk missing task docs: fail
  - high-risk TODO slug mismatch: fail
  - high-risk missing manual evidence: fail
- 사용자 확인 기준으로 초기 도입 sample PR 5종도 실제 GitHub에서 expected/actual 일치로 검증 완료됐다.
  - `chore/workflow-gate-smoke-pr`: pass
  - `chore/workflow-gate-high-risk-valid`: pass
  - `chore/workflow-gate-fail-missing-task`: fail
  - `chore/workflow-gate-fail-slug-mismatch`: fail
  - `chore/workflow-gate-fail-missing-manual`: fail
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
- repeated false positive가 이어지면 required check를 잠시 해제하고 후속 task로 넘긴다.
- 이 환경에서 GitHub branch protection 직접 변경은 불가능하므로 수동 적용 절차를 문서화해야 한다.

## Decision Notes

- repo 안에는 rollout runbook를 유지하되, quickstart/usage/team-memory에는 required check와 dry-run 같은 durable rule만 남긴다.
- 운영 담당자가 바로 쓸 수 있도록 runbook 안에 team announcement template, local dry-run, representative verification 기준을 포함한다.
- branch protection 적용은 사용자가 GitHub UI에서 수동으로 완료한 것으로 간주하고, 이후 smoke/fail PR 검증 단계로 진행한다.
- branch protection 적용과 sample PR 5종 검증은 모두 끝났고, 추가 고정 observation 단계는 두지 않는다.
- `gh` 인증 문제 때문에 PR 생성은 브라우저 URL을 여는 방식으로 우회한다.
- 검증용 PR 본문 초안은 `/tmp/workflow-gate-*.md` 파일로 준비되어 있다.
- gate 정책 자체는 유지하고 운영 문서만 간소화한다.

## Session Handoff Notes

- 다시 읽을 문서: `docs/ai/workflow-gate-rollout.md`, `docs/ai/usage.md`, `docs/ai/quickstart.md`, `docs/ai/team-memory.md`
- 바로 이어서 할 1개 단계: repeated false positive가 생길 때만 새 task를 열어 gate 기준 조정 여부를 판단한다.
- pending decision / blocker: PR 자동 조회는 막혀 있으므로 GitHub check 확인이 필요하면 운영 담당자가 GitHub UI를 본다.
- 검증 재개 지점: false positive나 unblock 요청이 반복될 때 runbook의 problem handling 기준을 적용

## Open Risks

- 자동 운영 로그를 강제하지 않기 때문에 repeated false positive 판단은 팀 운영자가 직접 해야 한다.
