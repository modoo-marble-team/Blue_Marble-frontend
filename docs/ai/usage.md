# Team AI Workflow

이 저장소는 특정 도구에 종속되지 않는 팀 공용 workflow만 커밋한다.
어떤 AI를 쓰든 아래 문서와 스크립트를 기준으로 같은 task/TODO/validation/PR 루프를 따른다.

## Canonical Entry Points

1. `README.md`
2. `docs/ai/quickstart.md`
3. `AGENTS.md`
4. `docs/rules.md`
5. `docs/testing.md`
6. `TODO.md`
7. `docs/ai/tasks/README.md`

## Core Loop

1. `AGENTS.md`, 관련 manual, `docs/rules.md`, `docs/testing.md`를 읽는다.
2. 비사소한 작업이면 `docs/ai/tasks/<slug>/`와 `TODO.md` 한 줄을 만든다.
3. 최소 범위로 구현한다.
4. 가장 좁은 `ai:check:*`부터 실행하고, 마지막에 `npm run ai:self-review`를 본다.
5. 결과 보고에는 변경 파일, 실행한 검증, 남은 리스크를 남긴다.

## Task Queue And Handoff

- `TODO.md` 한 줄과 `docs/ai/tasks/<slug>/` 3종 문서는 1:1로 맞춘다.
- 새 task는 `npm run ai:task:new -- <slug> [--files ...]`로 만들 수 있다.
- 다시 시작할 때는 `npm run ai:session:brief -- <slug>`로 읽을 문서, 다음 단계, 검증 후보를 먼저 확인한다.
- 한 세션에는 가능한 한 한 feature만 다룬다.

## Daily Operating Rhythm

### 작업 시작 전

- `README.md`와 `docs/ai/quickstart.md`로 현재 작업이 small / large / high-risk 중 어디에 속하는지 먼저 판단한다.
- 큰 작업이면 issue 단계 또는 구현 시작 직전에 task slug를 정하고 `npm run ai:task:new -- <slug>`를 사용한다.
- 기존 task를 잇는 경우 `npm run ai:session:brief -- <slug>`부터 실행한다.

### 세션 종료 전

- `context.md`, `checklist.md`, `TODO.md` 상태를 현재 구현과 맞춘다.
- handoff가 필요한 작업이면 다음 세션이 바로 이어서 할 1개 단계를 문서에 남긴다.
- `npm run ai:session:brief -- <slug>` 출력이 현재 상태와 어긋나지 않는지 확인한다.

### PR 올리기 전

- 가장 좁은 `ai:check:*`부터 실행하고, 마지막에 `npm run ai:self-review`를 본다.
- 큰 PR/high-risk PR이면 `npm run ai:pr-gate -- --files ... --pr-body-file ...`로 blocking 조건을 로컬에서 먼저 확인한다.
- PR 본문에는 task 문서, TODO/task slug 연결, 참고 문서, 실행한 검증, 남은 리스크를 남긴다.
- 작은 작업이면 `Task 문서`와 `TODO.md 연결`을 `N/A`로 적고, 큰 작업이면 실제 slug와 상태를 적는다.

### 리뷰 시작 전

- Reviewer와 Tester는 `AGENTS.md`, 관련 manual, task 문서, `npm run ai:self-review` 결과를 먼저 본다.
- high-risk 변경은 `planner -> implementer -> reviewer -> tester` 순서를 유지한다.

## Validation And Review

- 큰 변경은 `planner -> implementer -> reviewer/tester` 순서를 기본값으로 둔다.
- `npm run ai:self-review`는 diff 기반 warnings/test gaps/manual/validation 후보를 보는 공용 도구다.
- `npm run ai:workflow:audit`는 queue-managed task workspace와 `TODO.md` 구조 정합성을 주간 점검용으로 보여주는 경고 전용 도구다.
- `npm run ai:pr-gate`는 PR 본문과 changed files를 기준으로 large/high-risk PR blocking 여부를 로컬 dry-run 할 수 있는 도구다.
- PR 본문에는 task 문서, 참고 문서, 실행한 검증, 남은 리스크, TODO/task slug 연결을 남긴다.
- `Workflow Gate`는 큰 PR/high-risk PR에서만 task/TODO/manual/validation 누락을 차단한다.
- `develop` 브랜치에는 `workflow-gate` required check를 유지하고, 상세 운영 기준은 `docs/ai/workflow-gate-rollout.md`를 따른다.
- 초기 도입이나 gate 정책 변경 시에는 smoke + 대표 fail 케이스만 다시 확인한다.
- `AI Review`, Husky, CI는 계속 팀 공용 enforcement이며 특정 AI 도구에 의존하지 않는다.

## Error Handling

- 에러는 해석해서 요약하지 말고 raw log를 그대로 붙인다.
- socket / contract / cleanup / redirect 경계가 바뀌면 문서와 테스트를 같이 움직인다.
- 작업 중 결정이 바뀌면 코드보다 먼저 `context.md`나 `checklist.md`를 갱신한다.

## Second Opinion Review

- 다른 AI에게 비평을 받을 때도 source of truth는 계속 `AGENTS.md`, `docs/*`, `TODO.md`, `scripts/ai/*`다.
- 외부 비평 요청 전에는 task 문서와 `npm run ai:self-review` 결과를 먼저 정리한다.
- 질문은 버그, 회귀, 누락 테스트, 계약 불일치처럼 high-signal 항목으로 제한한다.

## Local Tool Setup

- 개인 `/memory`, IDE 플러그인 설정, 음성 입력, MCP on/off, OS 알림, 개인 hook은 각자 로컬에서 관리한다.
- 저장소에는 tool-specific runtime 파일을 커밋하지 않는다.
