# Plan

## Task

- 작업 이름: Current Round Badge Style
- 작업 slug: current-round-badge-style
- 요청 날짜: 2026-03-24
- 담당 범위: `GamePage` 현재 라운드 뱃지의 시각적 밸런스를 더 자연스럽게 다듬고, high-risk PR gate 근거를 함께 정리

## Goal

- 게임 화면 우측 하단의 현재 라운드 뱃지가 주변 HUD와 더 자연스럽게 어우러지도록 스타일을 정리한다
- 숫자, `/ 20`, `Round` 텍스트의 비중과 간격을 조정해 정보 인지가 더 직관적으로 되게 한다
- `GamePage.tsx`가 high-risk 경로인 만큼 task 문서, TODO 연결, game-runtime manual 근거, 검증 결과를 같이 남긴다

## WAT Workflow

1. 범위와 완료 기준을 문서로 고정한다
2. 최소 범위 구현과 필요한 문서/테스트 수정 범위를 정리한다
3. 가장 좁은 검증부터 실행하고 handoff 상태를 남긴다

## In Scope

- `src/pages/GamePage.tsx`
- `TODO.md`

## Out Of Scope

- 게임 로직, 소켓 계약, store 상태 구조 변경
- 라운드 값 계산 방식이나 최대 라운드 규칙 변경
- 다른 HUD 요소의 스타일 개편

## Target Files

- `src/pages/GamePage.tsx`
- `TODO.md`

## Task Tracking

- TODO line: - [ ] `current-round-badge-style` - Current Round Badge Style (`docs/ai/tasks/current-round-badge-style/`)
- Session brief: `npm run ai:session:brief -- current-round-badge-style`
- Reopen docs: `docs/ai/tasks/current-round-badge-style/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- 현재 라운드 배지가 숫자 중심으로 더 간결하고 자연스럽게 보인다
- `src/pages/GamePage.tsx` 외 게임 런타임 동작은 변경하지 않는다
- task 문서와 `TODO.md`가 현재 상태와 맞는다
- `npm run lint`, `npm run ai:check:game`, `npm run ai:check:build`가 통과한다

## Role Plan

- Planner: 범위 / 완료 기준 / 참고 문서 정리
- Implementer: 최소 범위 구현
- Reviewer: diff / self-review / 위험 신호 확인
- Tester: 검증 명령 실행과 결과 정리

## Test Plan

- `npm run lint`
- `npm run ai:check:game`
- `npm run ai:check:build`
