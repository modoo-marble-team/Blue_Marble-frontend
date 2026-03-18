# Context

## 현재 상태

- `AI Review` 코멘트는 changed files, workflow warnings, self-review, UI check plan을 표시한다.
- `scripts/ai/lib.mjs`는 changed files 기준으로 추천 스크립트를 계산할 수 있지만, PR 코멘트에는 `required`와 `suggested` 구분이 없다.
- 현재 `ai:check:ui -- --plan` 출력은 유용하지만, 팀원이 "이번 변경에서 꼭 봐야 하는 검증"을 빠르게 파악하기에는 다소 간접적이다.

## 판단

- 이 단계에서는 기존 추천 로직을 재사용해, code-first 검증을 `required`, UI/e2e/build 성격의 추가 검증을 `suggested`로 나누는 것이 적절하다.
- 생성형 리뷰보다 먼저 deterministic한 검증 계획을 구조적으로 보여주는 것이 팀 적용력과 신뢰도 측면에서 낫다.
- 별도 스크립트로 계획 출력을 분리하면 workflow와 로컬 확인에 모두 재사용할 수 있다.

## 제외 범위

- 실제 검증을 workflow에서 강제 실행
- branch protection 필수 체크
- OpenAI API 기반 생성형 리뷰
- inline code comment

이번 단계는 "어떤 검증이 필요한지 더 명확하게 보여주는 것"에 집중한다.
