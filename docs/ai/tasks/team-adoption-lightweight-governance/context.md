# Context

## Current Behavior

- 1차에서 vendor-neutral workflow SSOT는 `AGENTS.md`, `docs/*`, `TODO.md`, `scripts/ai/*`로 정리됐다.
- 아직 onboarding 예시가 부족해서 새 팀원이 small / large / high-risk 경로를 빠르게 구분하기 어렵다.
- issue 템플릿에는 task slug / manual / validation 초안이 없어 workflow 진입이 PR 직전으로 늦어진다.
- repo 전체 queue-managed task 구조를 한번에 점검하는 경고용 audit 스크립트도 아직 없다.

## Related Files

- `docs/ai/quickstart.md`
- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `README.md`
- `docs/ai/usage.md`
- `docs/ai/tasks/README.md`
- `AI_WORKFLOW_SHOWCASE.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/chore.md`
- `.github/ISSUE_TEMPLATE/docs.md`
- `.github/ISSUE_TEMPLATE/test.md`
- `.github/ISSUE_TEMPLATE/feat.md`
- `.github/ISSUE_TEMPLATE/fix.md`
- `.github/ISSUE_TEMPLATE/refactor.md`
- `.github/ISSUE_TEMPLATE/hotfix.md`
- `.github/ISSUE_TEMPLATE/build.md`
- `package.json`
- `scripts/ai/lib.mjs`
- `scripts/ai/lib.test.ts`
- `scripts/ai/workflow-audit.mjs`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 저장소에는 계속 vendor-neutral 자산만 남겨야 한다.
- `ai:workflow:audit`는 경고 전용이어야 하고 CI fail gate가 되면 안 된다.
- historical task workspace 전체를 강제로 TODO queue에 넣는 구조는 피하고, 현재 템플릿 기반 queue-managed task만 audit 대상으로 삼는다.
- 기존 `AGENTS.md`는 규칙 문서로 유지하고, 사용법 예시는 `docs/ai/quickstart.md`로 분리한다.

## Decision Notes

- quickstart 문서를 새로 추가해 small / large / high-risk 경로를 한 페이지에서 안내한다.
- non-trivial issue 템플릿에는 공통 workflow 준비 섹션을 넣고, small template에는 짧은 메모만 둔다.
- audit 로직은 `scripts/ai/lib.mjs` helper로 구현해 테스트와 CLI 출력에서 재사용한다.
- task dir without TODO 경고는 `TODO line` / `Session brief`가 있는 queue-managed task에만 적용해 historical task false positive를 피한다.

## Session Handoff Notes

- 다시 읽을 문서: `docs/ai/quickstart.md`, `docs/ai/usage.md`, `docs/ai/tasks/README.md`, `scripts/ai/lib.mjs`
- 바로 이어서 할 단계: lint / Vitest / workflow audit / session brief / self-review 결과를 반영해 checklist와 TODO 상태를 마무리한다.
- pending decision: 없음
- 검증 재개 지점: `npm run ai:workflow:audit`

## Open Risks

- quickstart와 usage 문서가 small / large 기준을 다르게 설명하면 오히려 혼선을 만들 수 있다.
- `ai:workflow:audit` placeholder 규칙이 너무 넓으면 false positive가 날 수 있으므로 현재 템플릿 문구 중심으로만 검사해야 한다.
