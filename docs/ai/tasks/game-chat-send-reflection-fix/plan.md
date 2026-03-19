# Plan

## Task

- 작업 이름: Game Chat Send Reflection Fix
- 요청 날짜: 2026-03-18
- 담당 범위: 입력 파일 기준 초안 생성

## Goal

- 게임 페이지에서 `send_chat` 송신은 되지만 채팅창에 바로 반영되지 않는 문제를 수정한다.
- 서버 `chat` echo가 지연되거나 누락돼도 사용자가 보낸 메시지는 즉시 보이게 한다.
- 이후 서버 echo가 도착하면 중복 메시지 없이 정리되는 경로를 만든다.
- 대기방에서 게임으로 이동할 때 cleanup `leave_room`가 실행돼 게임 중 room chat 수신이 끊기는 문제를 막는다.

## In Scope

- `src/pages/GamePage.tsx`
- `src/features/room-chat/RoomChat.tsx`
- `src/pages/waiting-room/socket/socket.ts`
- `src/stores/game.store.ts`

## Out Of Scope

- 대기방 채팅 흐름 전반 리팩터링
- 백엔드 `send_chat` / `chat` broadcast 정책 변경
- 게임 채팅 히스토리 영속화 또는 snapshot 계약 확장

## Target Files

- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `src/pages/game/gameChat.ts`
- `src/pages/game/gameChat.test.ts`
- `src/pages/waiting-room/hooks/hooks.ts`
- `src/pages/waiting-room/hooks/hooks.test.ts`

## Completion Criteria

- 게임 페이지에서 메시지를 보내면 서버 `chat` echo를 기다리지 않고 채팅창에 즉시 표시된다.
- 같은 메시지에 대한 서버 `chat` echo가 나중에 도착해도 중복 렌더링되지 않는다.
- 게임 시작 이동으로 대기방이 언마운트될 때 `leave_room` cleanup이 실행되지 않아 room chat 수신이 유지된다.
- 관련 helper 테스트와 게임 페이지 회귀 테스트가 추가된다.
- 게임 런타임 변경 기준에 맞는 최소 Vitest, lint, build 검증이 통과한다.

## Role Plan

- Planner: 범위 / 완료 기준 / 참고 문서 정리
- Implementer: 최소 범위 구현
- Reviewer: diff / self-review / 위험 신호 확인
- Tester: 검증 명령 실행과 결과 정리

## Test Plan

- `npx vitest run src/pages/game/gameChat.test.ts src/pages/GamePage.test.tsx src/pages/waiting-room/hooks/hooks.test.ts`
- `npm run lint`
- `npm run ai:check:game`
- `npm run ai:check:build`
