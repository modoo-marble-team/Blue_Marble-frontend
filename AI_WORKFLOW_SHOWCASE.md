# Blue Marble AI Workflow Cheat Sheet

이 문서는 일반적인 Claude Code 팁을 `Blue_Marble-frontend` 운영 기준에 맞게 다시 쓴 치트시트다.

핵심은 “Claude 기능을 얼마나 많이 쓰느냐”가 아니라,
**팀 공용 source of truth를 기준으로 AI-assisted 작업을 안전하게 반복하게 만드는 것**이다.

## 1. Blue Marble에서 먼저 지켜야 할 것

### 1-1. 팀 공용 규칙이 먼저다

- 팀 공용 workflow SSOT는 `AGENTS.md`, `docs/*`, `TODO.md`, `scripts/ai/*`다.
- 개인 도구 설정이나 특정 AI 제품 기능은 팀 규칙을 대체하지 않는다.
- 큰 작업은 설명만 듣고 바로 구현하지 말고, 먼저 manual과 기존 문서를 읽는다.

### 1-2. 개인 도구와 팀 문서를 섞지 않는다

- 개인 메모, `/memory`, 음성 입력, MCP on/off, 개인 hook은 각자 로컬에서 관리한다.
- `CLAUDE.md`, `.claude/*`, 프로젝트별 personal skill/agent 설정은 로컬 전용으로 취급한다.
- 팀이 공유해야 하는 durable한 사실은 `AGENTS.md`, `docs/*`, `TODO.md`, task 문서에 남긴다.

### 1-3. `In Progress` task는 ownership부터 확인한다

- `TODO.md`에서 `In Progress`인 항목은 누군가 이미 진행 중일 가능성이 크다.
- 다른 팀원 작업이면 임의로 이어서 구현하지 말고, owner 또는 handoff 여부를 먼저 확인한다.
- 이어받을 때도 `npm run ai:session:brief -- <slug>`와 task 문서를 먼저 본다.

## 2. 실제 작업 루프

### 2-1. 시작 순서

작업 시작 시 이 순서를 기본값으로 둔다.

1. `README.md`
2. `docs/ai/quickstart.md`
3. `AGENTS.md`
4. `docs/rules.md`
5. `docs/testing.md`
6. `TODO.md`
7. 필요 시 `docs/ai/tasks/<slug>/`

### 2-2. 작업 크기 분류

- `small`: 단일 파일 또는 아주 좁은 범위 수정, 같은 세션에서 끝남
- `large`: 여러 파일/여러 단계, handoff 가능성 있음
- `high-risk`: realtime socket, waiting-room, game runtime, contract, cleanup, redirect 영향이 큼

이 분류에 따라 task 문서, 검증, PR guard가 달라진다.

### 2-3. 비사소한 작업은 task workspace를 만든다

- 비사소한 작업은 `docs/ai/tasks/<slug>/plan.md`, `context.md`, `checklist.md`를 만든다.
- `TODO.md` 한 줄과 task slug를 1:1로 맞춘다.
- 새 task는 `npm run ai:task:new -- <slug> [--files ...]`로 시작할 수 있다.

### 2-4. 세션 재개는 `session:brief`부터

- 이전 task를 이어서 할 때는 구현 전에 `npm run ai:session:brief -- <slug>`부터 실행한다.
- session brief는 다시 읽을 문서, 다음 단계, validation 후보를 보여준다.
- handoff가 필요한 작업은 `context.md`, `checklist.md`, `TODO.md`, `session:brief` 출력이 서로 맞아야 한다.

### 2-5. 구현 전 기준 문서

- 항상 함께 읽기: `docs/ai/manuals/common.md`, `docs/rules.md`, `docs/testing.md`
- path-based manual loading은 `AGENTS.md`를 따른다.
- lobby / waiting-room / game-runtime / socket-contract 경로는 관련 manual을 추가로 읽는다.

### 2-6. 검증 순서

가장 좁은 검증부터 시작한다.

1. 관련 Vitest
2. 필요 시 `npm run lint`
3. 필요 시 `npm run build`
4. 사용자 플로우가 크면 Playwright
5. 마지막에 `npm run ai:self-review`

large / high-risk PR이면:

- `npm run ai:pr-gate -- --files ... --pr-body-file ...`
- `workflow-gate` required check 기준까지 함께 본다.

## 3. Claude 일반 팁 중 이 프로젝트에서 그대로 유효한 것

### 3-1. Plan 먼저

- 큰 변경은 먼저 범위, 완료 기준, 영향 파일, 검증을 고정한다.
- 이 프로젝트에서는 Plan의 결과를 task 문서와 TODO queue에 남기는 것이 중요하다.
- 단순히 생각만 정리하는 데서 끝내지 않고, 다음 세션도 따라갈 수 있는 형태로 남겨야 한다.

### 3-2. 한 세션 = 한 feature

- 여러 기능을 한 세션에 섞으면 handoff 품질이 급격히 떨어진다.
- 가능하면 한 세션에 한 feature 또는 한 task만 다룬다.
- 중간에 방향이 바뀌면 코드보다 먼저 `context.md`나 `checklist.md`를 갱신한다.

### 3-3. 에러 로그는 원문 그대로

- 에러를 요약하거나 해석해서 전달하지 않는다.
- raw log, stack trace, 실행 명령을 그대로 남긴다.
- 외부 AI에게 비평을 요청할 때도 source of truth는 여전히 repo 문서와 task 문서다.

### 3-4. 무거운 작업은 스크립트로 분리

- 대량 로그 분석, 대규모 비교, 반복 검증은 대화 안에서 직접 처리하지 않는다.
- 스크립트를 만들고 결과는 `summary.json`, `report.md`처럼 구조화해 받는다.
- 대화에는 결과 요약만 남기고, 근거는 파일로 저장한다.

### 3-5. 다른 AI 비평은 가능하지만 기준은 고정

- ChatGPT, Gemini 등 다른 AI에게 비평을 받을 수 있다.
- 다만 질문은 버그, 회귀 위험, 누락 테스트, 계약 불일치 같은 high-signal 항목으로 제한한다.
- 외부 비평 전에는 task 문서와 `npm run ai:self-review` 결과를 먼저 정리한다.

## 4. Claude 전용 기능은 어디까지 써도 되는가

### 4-1. 개인 생산성 기능은 허용된다

- `/memory`, 개인 skill, 개인 sub-agent, voice, 개인 hook은 써도 된다.
- 다만 저장소 workflow SSOT로 승격시키지는 않는다.
- 팀원이 같은 도구를 쓰지 않아도 동일한 문서와 스크립트만으로 작업을 재현할 수 있어야 한다.

### 4-2. Skills / Sub-Agent / Hooks는 선택적 고급 활용이다

- 반복 작업을 위한 skill, 대량 출력 격리를 위한 sub-agent, 알림용 hook은 도움이 될 수 있다.
- 하지만 이 저장소는 vendor-neutral 원칙을 우선하므로 `.claude/*`를 repo-managed 기본 방식으로 두지 않는다.
- “개인 도구 사용”과 “팀 공용 규칙”은 항상 분리해서 설명한다.

### 4-3. MCP는 core workflow가 아니다

- 외부 연동이 필요하면 MCP를 쓸 수 있다.
- 그러나 이 저장소의 공용 workflow는 MCP 유무와 무관하게 성립해야 한다.
- 가능한 경우 로컬 스크립트와 repo 문서 기반 루프를 먼저 유지한다.

## 5. PR을 어떻게 나누는가

- workflow 설명, onboarding, task template, showcase 문서 같은 문서 변경은 docs-only PR로 묶는다.
- `scripts/ai/*`, `package.json`, `.github/workflows/*`가 바뀌면 자동화 PR로 분리한다.
- `AGENTS.md`, `docs/ai/manuals/*`, `docs/socket-mock-server.md`처럼 규칙/도메인 manual이 바뀌면 manual PR로 분리한다.
- `CLAUDE.md`, `.claude/*`, 개인 MCP/hook/IDE 설정은 PR에 넣지 않는다.

핵심은 “팀 전체에 적용되는 것”과 “내 개인 도구 설정”을 같은 PR에 넣지 않는 것이다.

## 6. 한눈에 보는 체크리스트

### 작업 시작 전

- `README.md`, `docs/ai/quickstart.md`, `AGENTS.md`를 확인했다
- 작업이 `small / large / high-risk` 중 어디인지 판단했다
- `In Progress` task owner/handoff 여부를 확인했다
- 비사소한 작업이면 task slug와 `TODO.md`를 맞췄다
- 관련 manual, `docs/rules.md`, `docs/testing.md`를 읽었다

### 작업 중

- 한 세션에 한 feature만 다뤘다
- 방향이 바뀌면 코드보다 먼저 task 문서를 갱신했다
- raw error log와 실제 변경 파일을 기준으로 판단했다
- mock / real / contract / test / doc이 함께 움직여야 하는지 확인했다

### PR 전

- 가장 좁은 Vitest부터 실행했다
- 필요 시 `npm run lint`, `npm run build`, Playwright를 실행했다
- `npm run ai:self-review`를 돌렸다
- large / high-risk PR이면 `npm run ai:pr-gate`를 확인했다
- PR 본문에 task 문서, TODO 연결, 참고 문서, 검증, 남은 리스크를 적었다

## 7. 결론

이 프로젝트에서 AI 활용의 핵심은 Claude의 고유 기능을 많이 쓰는 것이 아니다.

핵심은 아래 5가지를 지키는 것이다.

- 팀 공용 source of truth를 먼저 읽게 할 것
- task slug와 TODO queue로 범위를 고정할 것
- session brief로 다음 세션 handoff를 보조할 것
- 가장 좁은 검증부터 빠르게 다시 돌릴 것
- 개인 도구 설정과 팀 공용 규칙을 절대 섞지 않을 것

Claude 전용 생산성 기능은 “개인 가속 장치”로는 유효하다.
하지만 `Blue_Marble-frontend`의 기준에서는 언제나
**`AGENTS.md`, `docs/*`, `TODO.md`, `scripts/ai/*`가 먼저다.**
