# Context

## Current Behavior

- 현재 `AI Review` workflow는 deterministic warning / validation / self-review / UI check plan에 더해 OpenAI 기반 summary 생성까지 같은 PR 코멘트에 넣도록 확장된 상태다.
- 이 구조는 repo 전용 검증 흐름은 유지하지만, 생성형 summary를 위해 별도 script, secret, model variable 관리가 필요하다.
- 이번 단계 목표는 repo 전용 deterministic workflow는 남기고, 생성형 summary/code review는 GitHub App 기반 Gemini Code Assist로 이관하는 것이다.

## Related Files

- `.github/workflows/ai-review.yml`
- `package.json`
- `scripts/ai/review-summary.mjs`
- `scripts/ai/review-summary.test.ts`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/tasks/pr-ai-review-summary/*`

## Constraints

- 기존 PR 코멘트의 warning / validation / self-review / UI check plan 구조는 유지한다.
- 생성형 review 제거가 deterministic workflow 실패나 comment 누락으로 이어지면 안 된다.
- 팀이 보게 되는 생성형 review는 GitHub PR 화면에서 Gemini Code Assist가 담당하게 해야 한다.

## Decision Notes

- workflow 전체를 교체하지 않고 summary 관련 step과 comment section만 제거한다.
- OpenAI script 대신 repo 루트 `.gemini/` 설정을 추가해 GitHub App 설정 지점을 명확히 둔다.
- secret 정리는 GitHub 설정 작업이므로 repo patch 범위에서는 제외한다.

## Open Risks

- Gemini Code Assist 설치 전까지는 생성형 PR summary가 잠시 비어 있을 수 있다.
- Gemini summary/comment 톤은 실제 팀 운영 후 `config.yaml` 임계치와 `styleguide.md`를 추가 조정할 수 있다.
