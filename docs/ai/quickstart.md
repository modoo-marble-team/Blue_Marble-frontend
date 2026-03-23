# Team AI Quickstart

이 문서는 새 팀원이 구두 설명 없이도
`README -> quickstart -> AGENTS -> TODO -> task workspace -> PR`
루프를 한 번 완주할 수 있게 만드는 3분짜리 시작 가이드다.

## Start Here

1. `README.md`
2. `docs/ai/quickstart.md`
3. `AGENTS.md`
4. `docs/ai/usage.md`
5. `TODO.md`
6. `docs/ai/tasks/README.md`

## Repository Guardrails

- 공용 workflow SSOT는 `AGENTS.md`, `docs/*`, `TODO.md`, `scripts/ai/*`다.
- 비사소한 작업은 `TODO.md` 한 줄과 `docs/ai/tasks/<slug>/` 3종 문서를 1:1로 맞춘다.
- 기존 task를 이어서 할 때는 구현 전에 `npm run ai:session:brief -- <slug>`부터 실행한다.
- 경로별 manual loading은 `AGENTS.md`를 기준으로 하고, 항상 `docs/rules.md`, `docs/testing.md`를 함께 읽는다.
- `CLAUDE.md`, `.claude/`, 개인 MCP/hook/IDE 설정은 로컬 전용이며 저장소 PR에 포함하지 않는다.

## Scenario 1: Small Change

아래 조건이면 task 문서 없이 시작해도 된다.

- 단일 파일 또는 아주 좁은 범위 수정
- handoff가 필요 없고 같은 세션에서 끝나는 작업
- socket / contract / cleanup / redirect 회귀 위험이 낮은 작업

먼저 읽을 문서:

- `AGENTS.md`
- 관련 manual 1개
- `docs/rules.md`
- `docs/testing.md`

실행 순서:

```bash
# 관련 문서 확인
# 최소 범위 수정
npx vitest run src/path/to/target.test.tsx
npm run lint
npm run ai:self-review -- --files src/path/to/target.tsx src/path/to/target.test.tsx
```

PR 본문은 아래처럼 간단히 적는다.

```md
## 🧠 Task 문서 (큰 작업이면 필수)

- plan: N/A
- context: N/A
- checklist: N/A

## 📋 TODO.md 연결

- task slug: N/A
- TODO status: N/A
- TODO entry 확인: N/A
```

## Scenario 2: Non-Trivial Feature Or Bug

아래 조건이면 task 문서와 `TODO.md` 연결이 필요하다.

- 여러 파일 또는 여러 단계가 함께 바뀜
- 다음 세션이나 다른 리뷰어가 이어받을 수 있음
- 완료 기준과 검증 범위를 먼저 고정해야 함

실행 순서:

```bash
npm run ai:task:new -- waiting-room-host-transfer --files src/pages/waiting-room/page/WaitingRoomPage.tsx src/pages/waiting-room/page/WaitingRoomFlow.test.tsx

# plan/context/checklist를 채우고 TODO 상태를 In Progress로 옮긴다

npm run ai:session:brief -- waiting-room-host-transfer
npm run ai:self-review -- --files src/pages/waiting-room/page/WaitingRoomPage.tsx src/pages/waiting-room/page/WaitingRoomFlow.test.tsx docs/ai/tasks/waiting-room-host-transfer/plan.md docs/ai/tasks/waiting-room-host-transfer/context.md docs/ai/tasks/waiting-room-host-transfer/checklist.md
```

PR 본문은 큰 작업 기준으로 채운다.

```md
## 🧠 Task 문서 (큰 작업이면 필수)

- plan: docs/ai/tasks/waiting-room-host-transfer/plan.md
- context: docs/ai/tasks/waiting-room-host-transfer/context.md
- checklist: docs/ai/tasks/waiting-room-host-transfer/checklist.md

## 📋 TODO.md 연결

- task slug: waiting-room-host-transfer
- TODO status: In Progress 또는 Done
- TODO entry 확인: TODO.md와 docs/ai/tasks/waiting-room-host-transfer/가 1:1로 연결됨

## 📚 참고한 기준 문서

- AGENTS.md
- docs/rules.md
- docs/testing.md
- docs/ai/manuals/waiting-room.md
```

큰 PR/high-risk PR은 아래 dry-run으로 미리 확인할 수 있다.

```bash
cat >/tmp/pr-body.md <<'EOF'
## 🧠 Task 문서 (큰 작업이면 필수)
- plan: docs/ai/tasks/waiting-room-host-transfer/plan.md
- context: docs/ai/tasks/waiting-room-host-transfer/context.md
- checklist: docs/ai/tasks/waiting-room-host-transfer/checklist.md

## 📋 TODO.md 연결
- task slug: waiting-room-host-transfer
- TODO status: In Progress
- TODO entry 확인: TODO.md와 docs/ai/tasks/waiting-room-host-transfer/가 1:1로 연결됨

## 📚 참고한 기준 문서
- `AGENTS.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/waiting-room.md`

## 🧪 실행한 검증
- `npm run lint`
- `npm run ai:check:waiting-room`

## ⚠️ 남은 리스크
- 현재 확인된 추가 리스크는 없습니다.
EOF

npm run ai:pr-gate -- --files src/pages/waiting-room/page/WaitingRoomPage.tsx src/pages/waiting-room/page/WaitingRoomFlow.test.tsx --pr-body-file /tmp/pr-body.md
```

## PR Split Rule Of Thumb

- workflow 설명이나 onboarding 정리는 `README.md`, `docs/ai/*`, task 문서 중심의 docs-only PR로 묶는다.
- `scripts/ai/*`, `package.json`, `.github/workflows/*`처럼 실행 동작이나 gate를 바꾸는 변경은 docs-only PR과 분리한다.
- `AGENTS.md`, `docs/ai/manuals/*`, `docs/socket-mock-server.md`처럼 manual loading이나 도메인 규칙을 바꾸는 변경은 문서/자동화 변경과 분리한다.
- `CLAUDE.md`, `.claude/`, 개인 MCP/hook/IDE 설정은 로컬에만 두고 어떤 PR에도 포함하지 않는다.
- 한 작업이 문서와 스크립트를 모두 건드리면, 동작 의존성이 없을 때는 docs PR을 먼저 올리고 자동화 PR을 후속으로 나눈다.

git-flow 초안이 필요할 때는 로컬 `.claude/skills/git-flow/SKILL.md`를 커밋하지 말고 아래처럼 저장소 공용 scaffold 명령을 사용한다.

```bash
npm run ai:git-flow -- \
  --files src/pages/waiting-room/page/WaitingRoomPage.tsx docs/ai/tasks/waiting-room-host-transfer/plan.md docs/ai/tasks/waiting-room-host-transfer/context.md docs/ai/tasks/waiting-room-host-transfer/checklist.md \
  --task-slug waiting-room-host-transfer \
  --issue-number 123 \
  --title "Waiting Room Host Transfer" \
  --pr-body-file /tmp/pr-body.md
```

위 명령은 issue/branch/commit/PR 초안을 만들고, 큰 PR/high-risk PR이면 `Workflow Gate`를 통과하는 데 필요한 task/TODO/manual/validation 섹션까지 채워준다.

실제로 issue 생성부터 PR 생성까지 진행하려면 `--execute`를 추가한다.

```bash
npm run ai:git-flow -- \
  --execute \
  --files src/pages/waiting-room/page/WaitingRoomPage.tsx docs/ai/tasks/waiting-room-host-transfer/plan.md docs/ai/tasks/waiting-room-host-transfer/context.md docs/ai/tasks/waiting-room-host-transfer/checklist.md \
  --task-slug waiting-room-host-transfer \
  --title "Waiting Room Host Transfer" \
  --pr-body-file /tmp/pr-body.md
```

이 실행형 모드는 아래 순서를 따른다.

- issue 생성 또는 기존 issue 번호 재사용
- base 브랜치 fetch/rebase 후 새 branch 생성, 또는 기존 feature branch 유지
- 명시 파일만 스테이징 후 commit
- push 전 rebase, 필요 시 `--force-with-lease` push
- large/high-risk면 `ai:pr-gate` 확인 후 PR 생성

## Scenario 3: High-Risk Realtime Change

아래 변경은 항상 큰 작업으로 취급한다.

- `src/pages/lobby/**`, `src/features/presence/**`, `src/features/room-chat/**`
- `src/pages/waiting-room/**`
- `src/pages/GamePage.tsx`, `src/components/game/**`, `src/components/board/**`, `src/hooks/game/**`
- socket contract, mock socket server, cleanup/redirect 흐름

추가 원칙:

- `planner -> implementer -> reviewer -> tester` 순서로 역할을 분리한다.
- 관련 manual을 먼저 읽고 task 문서에 완료 기준과 validation을 고정한다.
- 최소 검증은 관련 `ai:check:*`와 `npm run ai:self-review`까지 포함한다.

예시 명령:

```bash
npm run ai:task:new -- lobby-dm-unread-stability --files src/features/presence/useDirectMessageController.ts src/features/presence/useDirectMessageController.test.tsx
npm run ai:session:brief -- lobby-dm-unread-stability
npm run ai:check:lobby
npm run ai:check:build
npm run ai:self-review -- --files src/features/presence/useDirectMessageController.ts src/features/presence/useDirectMessageController.test.tsx docs/ai/tasks/lobby-dm-unread-stability/plan.md docs/ai/tasks/lobby-dm-unread-stability/context.md docs/ai/tasks/lobby-dm-unread-stability/checklist.md
npm run ai:pr-gate -- --files src/features/presence/useDirectMessageController.ts src/features/presence/useDirectMessageController.test.tsx --pr-body-file /tmp/pr-body.md
```

`Workflow Gate` check는 큰 PR/high-risk PR에서만 blocking 된다.
작은 PR과 docs-only PR은 계속 warning-only 운영을 유지한다.

운영 전환 절차와 `develop` required check 적용 순서는
`docs/ai/workflow-gate-rollout.md`를 기준으로 본다.
운영 담당자는 같은 문서의 dry-run 예시와 problem handling 기준을 그대로 사용한다.

## Weekly Audit

주 1회 또는 PR 전 정리 단계에서 아래 명령을 사용한다.

```bash
npm run ai:workflow:audit
```

이 명령은 현재 템플릿 기반의 queue-managed task workspace만 검사한다.
즉, `TODO.md`와 연결된 task, 또는 `TODO line` / `Session brief`가 있는 task에 대해서만 아래 항목을 경고한다.

- `TODO.md`에 있는데 task 디렉토리가 없는 항목
- task 디렉토리는 있는데 `TODO.md`에 없는 queue-managed task
- `plan/context/checklist` triplet 누락
- placeholder가 남아 있는 task 문서
- `TODO.md` 중복 slug
