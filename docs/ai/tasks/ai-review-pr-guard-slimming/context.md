# Context

## Current Behavior

- 현재 `AI Review`는 warning, findings, test gaps, required checks, suggested checks까지 같이 출력한다.
- 하지만 실제 품질 게이트는 CI가 담당하고, 생성형 리뷰는 Gemini가 담당해 역할이 겹친다.
- GitHub PR 화면에도 changed files는 이미 보이므로 코멘트 반복 가치가 낮다.

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- task 문서, 기준 문서, 검증, 리스크 누락 warning은 유지한다.
- 큰 변경 판단 기준은 기존과 동일하게 유지한다.
- 코멘트는 짧고 바로 읽히는 형태여야 한다.

## Decision Notes

- `AI Review`를 진짜 리뷰어처럼 보이게 하기보다, PR Guard로 역할을 축소하는 편이 더 정확하다.
- CI가 이미 하는 검사를 코멘트에서 반복하지 않는다.
- findings/test gaps는 지금 규칙 밀도가 낮아 노이즈 대비 가치가 적으므로 과감히 제거한다.

## Open Risks

- role 수행 흔적 warning도 함께 제거하므로, 역할 분리 강제력은 약해진다.
- 나중에 deterministic finding 규칙이 충분히 쌓이면 다시 확장할 여지는 남는다.
