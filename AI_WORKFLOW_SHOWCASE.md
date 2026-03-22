# AI Collaboration Showcase

이 문서는 `Blue_Marble-frontend`에서 AI 활용을 특정 도구 기능이 아니라,
**팀이 공유하는 workflow와 enforcement 구조**로 운영한 방식을 요약한다.

핵심은 “어떤 AI를 쓰느냐”보다,
**모든 AI-assisted 작업이 같은 task/TODO/validation/PR 루프를 따르게 만드는 것**이다.

## 1. Team-Wide Entry Points

- 공용 source of truth는 `AGENTS.md`, `docs/ai/manuals/*`, `docs/rules.md`, `docs/testing.md`, `docs/ai/usage.md`다.
- 온보딩 entrypoint는 `README.md -> docs/ai/quickstart.md -> AGENTS.md -> docs/ai/usage.md -> TODO.md -> docs/ai/tasks/README.md`로 고정한다.
- 저장소에는 tool-specific runtime file을 두지 않고, 각 도구 사용자는 이 공용 문서를 로컬에서 참조하게 한다.

관련 파일:

- [`README.md`](./README.md)
- [`docs/ai/quickstart.md`](./docs/ai/quickstart.md)
- [`AGENTS.md`](./AGENTS.md)
- [`docs/ai/manuals/common.md`](./docs/ai/manuals/common.md)
- [`docs/rules.md`](./docs/rules.md)
- [`docs/testing.md`](./docs/testing.md)
- [`docs/ai/usage.md`](./docs/ai/usage.md)

## 2. Task Memory And Handoff

- 긴 작업은 `docs/ai/tasks/<slug>/plan.md`, `context.md`, `checklist.md`로 남긴다.
- task마다 루트 `TODO.md`에 정확히 한 줄을 유지해 `Ready / In Progress / Blocked / Done` 상태를 추적한다.
- 큰 작업은 issue 단계에서 예상 task slug와 manual/validation 초안을 먼저 적는다.
- `npm run ai:task:new -- <slug> [--files ...]`는 task scaffold와 TODO entry를 함께 만든다.
- `npm run ai:session:brief -- <slug>`는 다음 세션에서 다시 읽을 문서, 다음 단계, validation 후보를 보여준다.

관련 파일:

- [`TODO.md`](./TODO.md)
- [`docs/ai/tasks/README.md`](./docs/ai/tasks/README.md)
- [`docs/ai/tasks/_template/plan.md`](./docs/ai/tasks/_template/plan.md)
- [`docs/ai/tasks/_template/context.md`](./docs/ai/tasks/_template/context.md)
- [`docs/ai/tasks/_template/checklist.md`](./docs/ai/tasks/_template/checklist.md)
- [`scripts/ai/task-new.mjs`](./scripts/ai/task-new.mjs)
- [`scripts/ai/session-brief.mjs`](./scripts/ai/session-brief.mjs)
- [`.github/ISSUE_TEMPLATE/feat.md`](./.github/ISSUE_TEMPLATE/feat.md)
- [`.github/ISSUE_TEMPLATE/fix.md`](./.github/ISSUE_TEMPLATE/fix.md)

## 3. Validation And Enforcement

- 변경 범위별 빠른 검증은 `ai:check:*` 스크립트로 유지한다.
- `npm run ai:self-review`는 changed files 기준으로 manuals, warnings, test gaps, validation 후보를 다시 보여준다.
- `npm run ai:workflow:audit`는 queue-managed task workspace와 `TODO.md` 정합성을 주간 점검용으로 보여주는 경고 전용 스크립트다.
- PR template과 PR Guard는 task 문서, TODO/task slug 연결, 실행한 검증, 남은 리스크가 빠지지 않았는지 확인한다.
- Husky, CI, Gemini Code Assist는 팀 공용 enforcement다.

관련 파일:

- [`package.json`](./package.json)
- [`scripts/ai/check-fast.mjs`](./scripts/ai/check-fast.mjs)
- [`scripts/ai/check-ui.mjs`](./scripts/ai/check-ui.mjs)
- [`scripts/ai/self-review.mjs`](./scripts/ai/self-review.mjs)
- [`scripts/ai/workflow-audit.mjs`](./scripts/ai/workflow-audit.mjs)
- [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md)
- [`.github/workflows/ai-review.yml`](./.github/workflows/ai-review.yml)
- [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)
- [`.husky/pre-commit`](./.husky/pre-commit)
- [`.husky/pre-push`](./.husky/pre-push)

## 4. Why This Matters In This Repo

이 프로젝트는 아래 특성이 강하다.

- realtime socket 상태와 화면 상태가 같이 움직인다
- mock 환경과 실제 runtime 경로를 함께 맞춰야 한다
- cleanup, 중복 요청, 이벤트 순서 같은 비동기 경계 조건이 많다
- 로비, 대기방, 게임 런타임이 이어져 있어 작은 수정도 회귀를 만들기 쉽다

그래서 AI 활용의 핵심도 프롬프트 기교보다 아래에 있다.

- 먼저 공용 규칙을 읽게 만들 것
- 범위를 task 문서와 TODO queue로 고정할 것
- 다음 세션 handoff를 스크립트로 보조할 것
- 가장 좁은 검증부터 빠르게 다시 돌릴 것
- 외부 AI 비평도 공용 문서 위에서만 쓰게 만들 것

## 5. Representative Examples And Team Use

- [`docs/ai/tasks/example-lobby-dm-unread-stability/plan.md`](./docs/ai/tasks/example-lobby-dm-unread-stability/plan.md)
- [`docs/ai/tasks/example-waiting-room-leave-sequence-hardening/plan.md`](./docs/ai/tasks/example-waiting-room-leave-sequence-hardening/plan.md)
- [`docs/ai/tasks/example-game-prompt-contract-normalization/plan.md`](./docs/ai/tasks/example-game-prompt-contract-normalization/plan.md)

이 예시들은 unread state, leave sequence, runtime contract처럼
실시간 프론트엔드에서 AI가 가장 실수하기 쉬운 지점을 task 문서와 targeted validation으로 다루는 방식을 보여준다.

2차 운영 정착 이후에는 아래 사용 방식도 같은 문서 집합 위에서 반복한다.

- issue 단계에서 task slug와 manual 후보를 먼저 적는 방식
- 작은 작업은 `N/A`, 큰 작업은 task/TODO 링크를 남기는 PR 작성 방식
- 주간 `npm run ai:workflow:audit`로 queue-managed task 구조를 점검하는 방식

## 6. Suggested Review Path

짧게 보려면 아래 순서가 가장 빠르다.

1. [`README.md`](./README.md)
2. [`docs/ai/quickstart.md`](./docs/ai/quickstart.md)
3. [`AGENTS.md`](./AGENTS.md)
4. [`docs/ai/usage.md`](./docs/ai/usage.md)
5. [`TODO.md`](./TODO.md)
6. [`docs/ai/tasks/README.md`](./docs/ai/tasks/README.md)
7. [`scripts/ai/session-brief.mjs`](./scripts/ai/session-brief.mjs)

이 순서만 봐도,
“AI를 어떻게 팀 공용 workflow로 통제하고, 다음 세션으로 이어지게 만들었는지”를 빠르게 확인할 수 있다.
