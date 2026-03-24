# Context

## Current Behavior

- `scripts/ai/git-flow.mjs`는 branch 생성 전 rebase와 push 전 rebase를 이미 수행하지만, dry-run 출력과 실행 결과에서 그 사실이 충분히 눈에 띄지 않는다
- 문서에는 `--execute` 흐름에 rebase가 포함된다고 적혀 있지만, 수동 issue/commit/push로 진행하면 같은 보장이 없다는 점이 약하게 드러난다
- 실제 사용 중에도 "rebase를 했는지"가 결과 출력에서 바로 보이지 않아 수동 흐름과 스크립트 흐름이 섞이기 쉽다

## Related Files

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `scripts/ai/git-flow.mjs`
- `scripts/ai/git-flow.test.ts`
- `docs/ai/usage.md`
- `docs/ai/quickstart.md`
- `TODO.md`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 기존 `ai:git-flow`의 issue/branch/commit/PR scaffold 구조는 유지한다
- rebase 정책은 `origin/<base>` 기준을 유지하고, 성공/충돌 처리 규칙만 더 명확히 드러낸다
- 기존 테스트 fixture와 템플릿 기반 생성 동작을 깨지 않는다

## Decision Notes

- dry-run scaffold에 `Rebase Policy`를 추가해 실행 전에도 정책을 읽을 수 있게 한다
- 실행 결과에 `Base Branch`, `Rebase Target`, `Rebase Before Branch`, `Rebase Before Push`, `Rebased Before Push`를 출력해 실제 수행 여부를 확인 가능하게 한다
- 문서는 수동 push보다 `npm run ai:git-flow -- --execute`를 권장하도록 강화한다
- 단순 문서 수정만으로 끝내는 대안은 실제 실행 결과에서 rebase 여부가 보이지 않아 제외했다

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `scripts/ai/git-flow.mjs`, `scripts/ai/git-flow.test.ts`, `docs/ai/usage.md`, `docs/ai/quickstart.md`, 이 task 문서 3종
- 바로 이어서 할 1개 단계: 필요하면 `npm run ai:git-flow -- --execute ...` dry-run / 실행 결과를 실제 작업에서 다시 확인한다
- pending decision / blocker: 없음
- 검증 재개 지점: `npm run ai:git-flow -- --files ...`

## Open Risks

- dry-run 출력 텍스트가 바뀌면 관련 테스트 기대값도 함께 맞춰야 한다
- `--execute` 흐름을 실제로 돌릴 때 rebase 충돌 안내 문구가 기존 사용성을 해치지 않는지 self-review에서 다시 확인한다
