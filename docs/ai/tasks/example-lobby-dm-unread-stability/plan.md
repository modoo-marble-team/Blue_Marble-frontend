# Plan

## Task

- 작업 이름: Lobby DM unread stability hardening
- 요청 날짜: Example
- 담당 범위: 로비 접속자 목록, DM 패널, unread badge, socket 재연결 경계

## Why This Example Matters

- 실시간 상태 동기화 문제를 단순 UI 수정이 아니라 state contract 문제로 다룬다.
- AI에게 구현만 맡기지 않고 범위, 테스트, 회귀 포인트를 먼저 고정한다.
- 채용자 관점에서 "React + socket + 테스트"를 함께 다루는 사고 방식을 보여주기 좋다.

## Goal

- 로비에서 DM을 읽은 뒤에도 unread badge가 남거나, 재연결 이후 count가 꼬이는 문제를 안정적으로 정리한다.
- 현재 사용자가 DM 패널을 열고 있는 동안에는 해당 상대의 unread count가 즉시 0으로 유지되도록 만든다.
- socket 재연결이나 사용자 목록 갱신이 와도 unread state가 의도치 않게 복구되지 않도록 한다.

## In Scope

- `useDirectMessageController`의 unread count 계산 규칙 정리
- 현재 열려 있는 DM 대상과 unread count 동기화
- 접속자 목록 재수신 시 unread state 유지 규칙 확인
- 관련 컴포넌트 테스트 보강

## Out Of Scope

- 서버 영속 unread 동기화
- 알림 센터/푸시 알림
- DM UI 디자인 변경

## Target Files

- `src/features/presence/useDirectMessageController.ts`
- `src/features/presence/useDirectMessageController.test.tsx`
- `src/features/presence/components/UserListPanel.tsx`
- `src/features/presence/components/UserListPanel.test.tsx`
- 필요 시 `src/features/presence/unreadBadge.ts`

## Completion Criteria

- DM 패널을 열면 해당 사용자 unread badge가 즉시 제거된다.
- 같은 사용자의 새 메시지가 올 때만 unread count가 다시 증가한다.
- 접속자 목록 재수신, 재렌더, mock 데이터 갱신으로 unread 상태가 역행하지 않는다.
- 관련 Vitest가 통과한다.

## Test Plan

- `npm run ai:check:lobby`
- 필요 시 `npm run ai:check:chat-e2e`
- 변경 범위가 넓으면 `npm run lint`
