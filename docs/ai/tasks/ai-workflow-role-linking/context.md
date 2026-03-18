# Context

## Current Behavior

- PR 본문에는 task 문서, 실행한 검증, 남은 리스크 섹션은 있지만 참고한 기준 문서와 역할 수행 흔적은 없다.
- `ai:task:new`는 target files와 validation 초안은 채우지만 role plan / relevant manuals / review 역할 체크는 아직 없다.
- `AI Review`는 task 문서, 검증, 리스크 누락은 보지만 기준 문서와 Reviewer/Tester 흔적, required check 증빙은 보지 않는다.

## Related Files

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ai-review.yml`
- `scripts/ai/task-new.mjs`
- `package.json`
- `docs/ai/tasks/README.md`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 큰 변경이어도 PR 본문이 지나치게 길어지지 않도록 해야 한다.
- Reviewer/Tester warning은 advisory only로 유지해야 한다.
- task 생성기는 초안을 만드는 도구이므로 실제 작업 맥락을 과도하게 추론하지 않는다.

## Decision Notes

- PR 템플릿 -> task 생성기 -> AI Review warning 순서로 연결하는 편이 가장 덜 꼬인다.
- roles 전용 별도 시스템보다, 기존 task 문서와 PR 본문에 역할 흔적을 남기는 방식이 현재 단계에 더 적합하다.

## Open Risks

- required checks와 PR 본문 `실행한 검증` 비교는 문자열 기반이라 완전하지 않을 수 있다.
- 역할 수행 체크가 형식적 체크박스로만 남지 않도록 실제 팀 운영에서 사례가 더 필요하다.
