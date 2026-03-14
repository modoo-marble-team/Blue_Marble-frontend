# Plan

## Task

- 작업 이름: Waiting room leave sequence hardening
- 요청 날짜: Example
- 담당 범위: 대기방 수동 퇴장, 언마운트 cleanup, 로그아웃/마이페이지 이동, 중복 leave 방지

## Why This Example Matters

- 사용자 행동과 React lifecycle이 엮인 까다로운 버그를 다루는 예시다.
- "기능 추가"보다 "안전한 종료 시퀀스"를 중시하는 태도를 보여준다.
- 채용자 입장에서는 실서비스에서 자주 발생하는 중복 요청과 cleanup 회귀를 얼마나 조심하는지 볼 수 있다.

## Goal

- 대기방에서 뒤로가기, 로그아웃, 페이지 전환, StrictMode cleanup 상황이 겹쳐도 leave API와 leave socket emit이 한 번만 실행되게 만든다.
- 수동 퇴장과 자동 cleanup 퇴장이 서로 충돌하지 않도록 공통 시퀀스를 강화한다.
- 실패 시 사용자 메시지와 내부 상태가 일관적으로 유지되게 한다.

## In Scope

- `runLeaveRoomSequence` 재진입 방지 규칙 점검
- `leaveInFlightRef`, `hasEnteredRoomRef`, `hasLeftRoomRef` 사용 경계 점검
- cleanup 스킵 조건과 실제 언마운트 흐름 검토
- 관련 controller 테스트 보강

## Out Of Scope

- 대기방 디자인 변경
- 방장 위임 정책 변경
- 서버 leave API 스펙 변경

## Target Files

- `src/pages/waiting-room/controller/actions.ts`
- `src/pages/waiting-room/controller/actions.test.ts`
- `src/pages/waiting-room/WaitingRoomPage.tsx`
- 필요 시 `src/pages/waiting-room/controller/lifecycle.ts`
- 필요 시 `src/pages/waiting-room/socket.ts`

## Completion Criteria

- 수동 퇴장 중 추가 leave 시도가 와도 기존 Promise를 재사용한다.
- StrictMode나 라우트 이동으로 cleanup이 발생해도 중복 leave 요청이 생기지 않는다.
- 실패 메시지는 한 경로에서 일관적으로 처리된다.
- 관련 Vitest와 시작 플로우 검증이 통과한다.

## Test Plan

- `npm run ai:check:waiting-room`
- 필요 시 `npm run ai:check:waiting-room-e2e`
- 변경 범위가 넓으면 `npm run lint`
