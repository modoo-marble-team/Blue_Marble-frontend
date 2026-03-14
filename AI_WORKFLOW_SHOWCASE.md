# AI Collaboration Showcase

이 문서는 `Blue_Marble-frontend`에서 AI를 단순 코드 생성기가 아니라,
규칙, 작업 기억, 검증 루프를 따르는 협업자로 운영한 방식을 보여주기 위한 요약 문서입니다.

핵심은 "AI를 썼다"가 아니라, **AI가 실수하기 쉬운 지점을 먼저 구조로 통제했다**는 점입니다.

## 1. What I Added

### 1) Manual-First Workflow

- AI가 작업을 시작하기 전에 먼저 읽어야 할 기준 문서를 고정했습니다.
- 경로별로 어떤 manual을 읽어야 하는지 분기 규칙을 만들었습니다.

관련 파일:

- [`AGENTS.md`](./AGENTS.md)
- [`docs/ai/manuals/common.md`](./docs/ai/manuals/common.md)
- [`docs/ai/manuals/lobby.md`](./docs/ai/manuals/lobby.md)
- [`docs/ai/manuals/waiting-room.md`](./docs/ai/manuals/waiting-room.md)
- [`docs/ai/manuals/game-runtime.md`](./docs/ai/manuals/game-runtime.md)

이 구조로 AI가 매번 대화를 다시 해석하는 대신,
프로젝트 규칙과 기능 경계를 먼저 읽고 들어오게 만들었습니다.

### 1-1) Actual SKILL.md Packages

- 위 문서 체계를 실제 `SKILL.md` 패키지로도 분리했습니다.
- 단순 사내 문서가 아니라, 재사용 가능한 에이전트 행동 단위로 만든 구조입니다.

관련 파일:

- [`skills/blue-marble-agent-workflow/SKILL.md`](./skills/blue-marble-agent-workflow/SKILL.md)
- [`skills/blue-marble-realtime-lobby/SKILL.md`](./skills/blue-marble-realtime-lobby/SKILL.md)
- [`skills/blue-marble-waiting-room/SKILL.md`](./skills/blue-marble-waiting-room/SKILL.md)
- [`skills/blue-marble-game-runtime/SKILL.md`](./skills/blue-marble-game-runtime/SKILL.md)
- [`skills/blue-marble-diff-review/SKILL.md`](./skills/blue-marble-diff-review/SKILL.md)

이 구조로 "매번 긴 프롬프트를 쓰는 방식"이 아니라,
프로젝트 전용 작업 지식을 skill 단위로 로드하는 흐름을 만들었습니다.

### 2) Document-Based Working Memory

- 긴 작업에서 AI가 목표를 잃지 않도록 `plan / context / checklist` 3종 문서 구조를 만들었습니다.
- 구현 전에 범위, 결정 근거, 테스트 계획을 먼저 문서화하는 흐름입니다.

관련 파일:

- [`docs/ai/tasks/README.md`](./docs/ai/tasks/README.md)
- [`docs/ai/tasks/_template/plan.md`](./docs/ai/tasks/_template/plan.md)
- [`docs/ai/tasks/_template/context.md`](./docs/ai/tasks/_template/context.md)
- [`docs/ai/tasks/_template/checklist.md`](./docs/ai/tasks/_template/checklist.md)

이 구조의 목적은 "대화 기억"에 의존하지 않고,
AI가 다음 세션에서도 문서를 읽고 같은 기준으로 작업하게 만드는 것입니다.

### 3) Targeted Quality Checks

- 전체 테스트를 매번 돌리는 대신, 변경 범위별 빠른 검증 스크립트를 추가했습니다.
- 로비, 대기방, 게임 런타임처럼 실제 기능 경계에 맞춘 검증 단위를 만들었습니다.

관련 파일:

- [`package.json`](./package.json)
- [`scripts/ai/check-fast.mjs`](./scripts/ai/check-fast.mjs)
- [`scripts/ai/check-ui.mjs`](./scripts/ai/check-ui.mjs)
- [`scripts/ai/self-review.mjs`](./scripts/ai/self-review.mjs)
- [`.husky/pre-push`](./.husky/pre-push)
- [`docs/testing.md`](./docs/testing.md)

추가한 스크립트:

- `npm run ai:check:fast`
- `npm run ai:check:lobby`
- `npm run ai:check:waiting-room`
- `npm run ai:check:game`
- `npm run ai:check:ui`
- `npm run ai:check:chat-e2e`
- `npm run ai:check:waiting-room-e2e`
- `npm run ai:check:build`
- `npm run ai:self-review`

이렇게 해서 AI가 "끝났다"고 말하기 전에,
수정한 범위에 맞는 검증을 빠르게 다시 돌릴 수 있게 했습니다.

### 4) Role-Split Sessions

- 한 세션에 기획, 구현, 검토, 테스트를 몰아넣지 않고 역할을 나눌 수 있게 했습니다.
- 실제 멀티 에이전트가 없어도, 세션 분리만으로 자기 검증 편향을 줄이도록 설계했습니다.

관련 파일:

- [`docs/ai/roles/README.md`](./docs/ai/roles/README.md)
- [`docs/ai/roles/planner.md`](./docs/ai/roles/planner.md)
- [`docs/ai/roles/implementer.md`](./docs/ai/roles/implementer.md)
- [`docs/ai/roles/reviewer.md`](./docs/ai/roles/reviewer.md)
- [`docs/ai/roles/tester.md`](./docs/ai/roles/tester.md)

이 구조로 같은 AI를 써도 역할을 나눠서,
"구현자가 자기 코드를 그냥 통과시키는 문제"를 줄이도록 했습니다.

## 2. Why This Matters In This Repo

이 프로젝트는 일반적인 정적 UI보다 아래 성격이 강합니다.

- 실시간 socket 상태와 화면 상태가 같이 움직입니다.
- mock 환경과 실제 runtime 경로를 함께 고려해야 합니다.
- cleanup, 중복 요청, 이벤트 순서 같은 비동기 경계 조건이 많습니다.
- 로비, 대기방, 게임 런타임이 서로 이어져 있어 작은 수정도 회귀를 만들기 쉽습니다.

그래서 AI를 잘 쓰려면 "프롬프트를 잘 쓰는 것"보다 아래가 더 중요했습니다.

- 먼저 규칙을 읽게 만들 것
- 구현 전에 범위를 문서로 고정할 것
- mock/real 계약을 같이 볼 것
- 좁은 테스트부터 빠르게 검증할 것

즉, AI 활용을 생산성 문제가 아니라 **신뢰 가능한 개발 프로세스 문제**로 다뤘습니다.

## 3. Representative Examples

### Example A. Real-Time DM State Stability

예시 문서:

- [`docs/ai/tasks/example-lobby-dm-unread-stability/plan.md`](./docs/ai/tasks/example-lobby-dm-unread-stability/plan.md)
- [`docs/ai/tasks/example-lobby-dm-unread-stability/context.md`](./docs/ai/tasks/example-lobby-dm-unread-stability/context.md)
- [`docs/ai/tasks/example-lobby-dm-unread-stability/checklist.md`](./docs/ai/tasks/example-lobby-dm-unread-stability/checklist.md)

이 예시는 unread badge를 단순 UI 문제가 아니라,
**실시간 이벤트 순서와 state ownership 문제**로 다루는 방식입니다.

보여주는 역량:

- socket 기반 UI 상태 해석
- source of truth 분리
- controller 중심 설계
- targeted test 설계

### Example B. Waiting Room Leave Sequence Hardening

예시 문서:

- [`docs/ai/tasks/example-waiting-room-leave-sequence-hardening/plan.md`](./docs/ai/tasks/example-waiting-room-leave-sequence-hardening/plan.md)
- [`docs/ai/tasks/example-waiting-room-leave-sequence-hardening/context.md`](./docs/ai/tasks/example-waiting-room-leave-sequence-hardening/context.md)
- [`docs/ai/tasks/example-waiting-room-leave-sequence-hardening/checklist.md`](./docs/ai/tasks/example-waiting-room-leave-sequence-hardening/checklist.md)

이 예시는 뒤로가기, 로그아웃, cleanup이 겹치는 상황에서
**중복 요청과 비동기 종료 시퀀스**를 어떻게 통제할지 보여줍니다.

보여주는 역량:

- React lifecycle 이해
- race condition 방지
- cleanup 안전성 설계
- 실패 경로까지 포함한 품질 관리

### Example C. Game Runtime Contract Normalization

예시 문서:

- [`docs/ai/tasks/example-game-prompt-contract-normalization/plan.md`](./docs/ai/tasks/example-game-prompt-contract-normalization/plan.md)
- [`docs/ai/tasks/example-game-prompt-contract-normalization/context.md`](./docs/ai/tasks/example-game-prompt-contract-normalization/context.md)
- [`docs/ai/tasks/example-game-prompt-contract-normalization/checklist.md`](./docs/ai/tasks/example-game-prompt-contract-normalization/checklist.md)

이 예시는 `game:prompt` payload를 정규화하고,
`mock / real runtime`을 같은 계약으로 맞추는 과정을 다룹니다.

보여주는 역량:

- 어댑터/정규화 설계
- 타입/계약 중심 사고
- mock과 실제 경로 동기화
- UI와 runtime 경계 유지

## 4. What This Demonstrates

이 문서와 예시들이 보여주는 것은 다음입니다.

- AI를 즉흥적으로 쓰지 않고, 프로젝트 규칙에 묶어 운영했다
- 작업을 시작하기 전에 범위와 완료 기준을 먼저 정의했다
- 실시간 프론트엔드의 어려운 경계 조건을 문서와 테스트 기준으로 통제했다
- mock, contract, runtime, UI를 함께 보는 구조적 사고를 적용했다
- 역할 분리를 통해 자기 검증 편향을 줄이도록 설계했다

즉, 이 시스템은 "AI로 빨리 만들었다"는 증명이 아니라,
**AI를 써도 품질이 무너지지 않게 만드는 개발 습관**의 증명입니다.

## 5. Suggested Review Path

짧게 보려면 아래 순서로 보면 됩니다.

1. [`AGENTS.md`](./AGENTS.md)
2. [`docs/ai/manuals/waiting-room.md`](./docs/ai/manuals/waiting-room.md)
3. [`docs/ai/tasks/example-waiting-room-leave-sequence-hardening/plan.md`](./docs/ai/tasks/example-waiting-room-leave-sequence-hardening/plan.md)
4. [`package.json`](./package.json)

이 순서만 봐도,
"AI를 어떻게 프로젝트 구조 안에서 통제했는지"를 빠르게 확인할 수 있습니다.
