# AI Roles

이 디렉토리는 한 작업을 여러 세션으로 나눠 진행할 때 사용할 역할 문서다.
진짜 멀티 에이전트가 없어도, 세션을 분리하면 역할 충돌을 줄일 수 있다.

권장 순서는 아래와 같다.

1. `planner.md`
2. `implementer.md`
3. `reviewer.md`
4. `tester.md`

각 역할은 아래 공통 규칙을 따른다.

- 시작 전에 `AGENTS.md`와 관련 manual을 읽는다.
- 큰 작업이면 `docs/ai/tasks/<task-slug>/plan.md`, `context.md`, `checklist.md`를 먼저 읽는다.
- 자기 역할 밖의 결정을 멋대로 확장하지 않는다.
- 최종 출력은 짧고 구체적으로 남긴다.
