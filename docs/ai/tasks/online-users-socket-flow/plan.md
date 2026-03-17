# Plan

## Task

- 작업 이름: useOnlineUsersSocket 책임 분리
- 요청 날짜: 2026-03-17
- 담당 범위: presence snapshot / socket / reconnect 흐름 정리

## Goal

- `useOnlineUsersSocket`가 동시에 들고 있는 초기 REST snapshot, socket 구독, reconnect 이벤트 처리, refresh request 처리를 읽기 쉬운 구조로 정리한다.
- 현재 반환 형태(`{ data, isLoading, isError }`)와 사용자 경험은 유지하되, 이후 reconnect 정책 수정이 쉬운 형태로 바꾼다.
- mock/real 모드 모두 현재와 같은 visible behavior를 유지한다.

## In Scope

- `useOnlineUsersSocket.ts` 내부 helper 함수 또는 작은 상태 전이 단위 분리
- snapshot sync 흐름과 `online_users` 이벤트 반영 경계 명확화
- `connect`, `disconnect`, `connect_error` 처리 의도 정리
- refresh request 이벤트 처리 흐름 정리
- 관련 테스트 보강 및 구조 정리

## Out Of Scope

- `/users/online` API contract 변경
- 접속자 상태 보정 helper 정책 변경
- DM 정책 또는 unread badge 규칙 변경
- room cleanup / stale membership 서버 이슈 대응

## Target Files

- `src/features/presence/useOnlineUsersSocket.ts`
- `src/features/presence/useOnlineUsersSocket.test.tsx`
- 필요 시 `src/features/presence/onlineUsersSocket.ts`
- 필요 시 `src/features/presence/onlineUsersSocket.test.ts`

## Completion Criteria

- `useOnlineUsersSocket`의 핵심 흐름이 위에서 아래로 자연스럽게 읽힌다.
- snapshot / socket event / reconnect 처리 / refresh request가 서로 다른 책임으로 구분된다.
- mock/real 분기와 기존 반환 형태는 유지된다.
- 관련 Vitest, 최소 lint, 필요 시 build가 통과한다.

## Test Plan

- 최소 실행 테스트
  - `npx vitest run src/features/presence/useOnlineUsersSocket.test.tsx`
- 추가 검증
  - 필요 시 `npx vitest run src/features/presence/onlineUsersSocket.test.ts`
  - `npm run lint -- src/features/presence/useOnlineUsersSocket.ts src/features/presence/useOnlineUsersSocket.test.tsx`
  - 필요 시 `npm run build`
