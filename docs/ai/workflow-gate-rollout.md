# Workflow Gate Rollout

이 문서는 `Workflow Gate`를 `develop` 브랜치 운영에 유지할 때
팀이 따라야 하는 최소 운영 기준을 고정한다.

## Goal

- 큰 PR/high-risk PR만 blocking 한다.
- 작은 PR과 docs-only PR은 계속 warning-only로 유지한다.
- `AI Review`는 comment-only로 남기고, 실제 차단은 `Workflow Gate`가 맡는다.

## Gate Policy

`Workflow Gate`는 아래 조건에서만 blocking 대상이 된다.

- changed files가 8개 이상
- 또는 high-risk 경로 변경:
  - `src/pages/lobby/**`
  - `src/features/presence/**`
  - `src/features/room-chat/**`
  - `src/pages/waiting-room/**`
  - `src/pages/GamePage.tsx`
  - `src/components/game/**`
  - `src/components/board/**`
  - `src/hooks/game/**`
  - `src/services/socket/game.handler.ts`
  - `src/stores/game.store.ts`
  - `src/lib/socket.ts`

docs-only PR은 파일 수가 커도 blocking 대상에서 제외한다.

## Hard Fail Conditions

큰 PR/high-risk PR에서 아래 5개가 없으면 `Workflow Gate`가 실패한다.

1. task 문서 근거
2. `TODO.md 연결`
3. branch `TODO.md`에 실제 slug 존재
4. 필요한 manual 근거
5. 실행한 검증

## Warning-Only Conditions

아래 항목은 4차에서도 blocking으로 올리지 않는다.

- `남은 리스크` placeholder 또는 누락
- 여러 task slug가 한 PR에 섞인 경우

## Local Dry Run

PR 올리기 전에는 아래 명령으로 gate를 로컬에서 먼저 확인한다.

```bash
npm run ai:pr-gate -- --files src/pages/waiting-room/page/WaitingRoomPage.tsx src/pages/waiting-room/page/WaitingRoomFlow.test.tsx --pr-body-file /tmp/pr-body.md
```

CI와 동일하게 enforce 모드로 보고 싶으면 아래를 사용한다.

```bash
npm run ai:pr-gate -- --mode enforce --changed-files-file /tmp/pr-gate-changed-files.txt --pr-body-file /tmp/pr-body-invalid.md
```

## Sample PR Bodies

### Pass Example

```md
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
```

### Fail Example: Missing Task/TODO

```md
## 🧠 Task 문서 (큰 작업이면 필수)

- plan:
- context:
- checklist:

## 📋 TODO.md 연결

- task slug:
- TODO status:
- TODO entry 확인:
```

### Fail Example: Missing Manual/Validation

```md
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

## 🧪 실행한 검증
```

## Activation And Verification

### 1. Enable Required Check

- 대상 브랜치: `develop`
- GitHub 저장소 설정에서 `workflow-gate`를 `develop`의 required check로 유지한다.
- `AI Review`는 comment-only로 유지하고 required check에는 추가하지 않는다.

### 2. Initial Or Policy-Change Verification

초기 도입이나 gate 정책 변경 시에는 아래 대표 케이스만 다시 확인한다.

- small/docs-only PR: pass
- high-risk PR + 정상 본문: pass
- high-risk PR + 대표 fail 케이스 1건: fail

### 3. Branch Protection Setup

GitHub 저장소 설정에서 아래 순서로 적용하거나 확인한다.

1. GitHub 저장소 `Settings`
2. `Branches`
3. `Branch protection rules`
4. `develop` 규칙 선택 또는 생성
5. `Require status checks to pass before merging` 활성화
6. required checks 목록에 `Workflow Gate` 추가
7. `AI Review`는 required check에 추가하지 않는다

## Operator Checklist

운영 담당자는 아래 순서만 따르면 된다.

1. 팀 공지에 runbook 링크와 dry-run 예시를 공유한다.
2. 초기 도입이나 gate 정책 변경 시에는 smoke PR과 대표 fail 케이스를 실제로 확인한다.
3. 필요하면 아래 초기 도입 기록 표를 참고하거나 업데이트한다.
4. repeated false positive나 unblock 요청이 이어지면 required check를 잠시 해제하고 후속 task slug를 만든다.

## Team Announcement Template

아래 문안을 그대로 복사해 팀 채널에 공유할 수 있다.

```md
`Workflow Gate` rollout을 시작합니다.

- 대상 브랜치: `develop`
- blocking 대상: large PR 또는 high-risk 경로 변경
- hard fail 조건: task 문서, `TODO.md 연결`, TODO actual slug, required manual, validation
- `AI Review`는 comment-only 유지

PR 올리기 전에는 아래 dry-run을 먼저 실행해 주세요.

`npm run ai:pr-gate -- --files ... --pr-body-file ...`

운영 기준과 rollback 절차:
`docs/ai/workflow-gate-rollout.md`
```

## Initial Adoption Reference

아래 표는 2026-03-23 초기 도입 시 representative verification 결과다.
이 표를 매 운영 주기마다 다시 채울 필요는 없고, gate 정책을 크게 바꿀 때만 참고하거나 갱신한다.

| Date       | PR / Branch                               | Case                                  | Expected | Actual | Result | Notes                         |
| ---------- | ----------------------------------------- | ------------------------------------- | -------- | ------ | ------ | ----------------------------- |
| 2026-03-23 | `chore/workflow-gate-smoke-pr`            | small/docs-only                       | pass     | pass   | OK     | smoke PR pass 확인            |
| 2026-03-23 | `chore/workflow-gate-high-risk-valid`     | high-risk + valid body                | pass     | pass   | OK     | 정상 high-risk 본문 통과 확인 |
| 2026-03-23 | `chore/workflow-gate-fail-missing-task`   | high-risk + missing task docs         | fail     | fail   | OK     | task 문서 누락 fail 확인      |
| 2026-03-23 | `chore/workflow-gate-fail-slug-mismatch`  | high-risk + TODO slug mismatch        | fail     | fail   | OK     | TODO slug mismatch fail 확인  |
| 2026-03-23 | `chore/workflow-gate-fail-missing-manual` | high-risk + missing manual/validation | fail     | fail   | OK     | manual 누락 fail 확인         |

## Problem Handling

- repeated false positive나 unblock 요청이 이어지면 `Workflow Gate` required check를 잠시 해제한다.
- 해제와 동시에 새 task slug를 만들고, gate 기준 수정 작업으로 넘긴다.
- large/high-risk 기준과 hard fail 조건은 후속 task에서만 조정한다.
- 이 작업 환경에서 `gh auth status`가 invalid token이면 GitHub UI에서 수동으로 check 결과와 branch protection을 확인한다.
