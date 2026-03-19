# Context

## Current Behavior

- 현재 PR Guard는 `Task 문서`, `참고한 기준 문서`, `실행한 검증`, `남은 리스크` 섹션을 읽어 경고를 띄운다.
- 하지만 PR 템플릿에는 `역할 수행`처럼 현재 guard가 검사하지 않는 섹션이 남아 있고, `남은 리스크`와 `실행한 검증` 예시는 placeholder를 그대로 둬도 충분해 보이게 작성돼 있다.
- 그 결과 팀원 입장에서는 템플릿을 채웠다고 생각해도 PR Guard 경고가 뜨는 혼선이 생긴다.

## Related Files

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `.github/PULL_REQUEST_TEMPLATE.md`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- PR Guard가 찾는 섹션 제목은 유지해야 한다.
- 템플릿은 팀 전체가 바로 이해할 수 있게 한국어 안내 위주로 유지한다.
- workflow 로직을 바꾸지 않고 템플릿만으로 혼선을 줄이는 방향을 우선한다.

## Decision Notes

- `역할 수행` 섹션은 현재 guard가 검사하지 않으므로 템플릿에서 제거해 실제 요구사항과 안내를 맞춘다.
- `실행한 검증`과 `남은 리스크` 예시는 bullet placeholder 대신 blockquote 설명으로 바꿔, 실제 내용을 입력해야 한다는 점을 분명히 한다.
- `참고한 기준 문서`에는 고위험 변경 시 필요한 manual 경로 예시를 명시해, 팀원이 어떤 경로를 넣어야 하는지 바로 이해할 수 있게 한다.
- workflow를 템플릿에 맞춰 다시 넓히는 대안도 있었지만, 현재 목적은 경량 PR Guard 유지이므로 템플릿을 현재 guard에 맞추는 쪽을 선택했다.

## Open Risks

- 팀원이 이미 익숙한 기존 템플릿 흐름과 달라졌다고 느낄 수 있어, 실제 PR 몇 건으로 반응을 한 번 확인할 필요가 있다.
- 이후 PR Guard가 다시 역할 흔적까지 검사하게 되면 템플릿도 함께 다시 맞춰야 한다.
