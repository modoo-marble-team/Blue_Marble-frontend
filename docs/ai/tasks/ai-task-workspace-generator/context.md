# Context

## Current Behavior

- 현재 task 문서는 `docs/ai/tasks/_template/`를 수동 복사해서 시작한다.
- 경로를 만들고 템플릿을 복사한 뒤, 목표/대상 파일/검증 계획을 직접 채워야 해서 실제 사용 마찰이 있다.
- 문서 기반 AI 워크플로우를 강조하고 있지만, 작업 시작 자동화는 아직 없다.

## Related Files

- `docs/ai/tasks/README.md`
- `docs/ai/tasks/_template/*`
- `scripts/ai/lib.mjs`
- `package.json`

## Constraints

- `_template/`는 원본으로 유지해야 한다.
- 생성기는 기존 문서 구조(`plan.md`, `context.md`, `checklist.md`)를 그대로 따라야 한다.
- 입력 파일이 있으면 관련 manual과 최소 검증 명령을 자동으로 제안하되, 과도한 추론은 피한다.

## Decision Notes

- 스크립트는 `scripts/ai/task-new.mjs` 하나로 시작하고, 테스트 가능한 helper를 같이 export한다.
- 파일 분류와 검증 추천은 기존 `scripts/ai/lib.mjs`의 manual / suggested scripts 로직을 재사용한다.
- 이미 같은 slug 폴더가 있으면 기본적으로 실패시키고, 의도적 덮어쓰기는 `--force`로만 허용한다.

## Open Risks

- 자동 생성 문구가 실제 작업 맥락을 완전히 대체할 수는 없다. 생성 후 직접 수정이 필요하다.
- `--files`를 주지 않으면 manual/검증 추천은 비어 있을 수 있다.
