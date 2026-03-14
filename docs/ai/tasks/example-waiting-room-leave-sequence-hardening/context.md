# Context

## Current Behavior

- 대기방은 수동 퇴장 버튼, 로그아웃, 마이페이지 이동, 언마운트 cleanup에서 모두 leave 시퀀스를 사용할 수 있다.
- 현재 구조는 공통 시퀀스를 이미 재사용하지만, lifecycle과 사용자 액션이 겹치면 중복 요청이나 순서 꼬임이 생길 수 있다.
- 특히 실시간 UI에서는 "퇴장 API 성공 후 leave socket emit" 순서를 지키는 것이 중요하다.

## Related Files

- `src/pages/waiting-room/controller/actions.ts`
- `src/pages/waiting-room/controller/actions.test.ts`
- `src/pages/waiting-room/hooks.ts`
- `src/pages/waiting-room/WaitingRoomPage.tsx`
- `src/pages/waiting-room/socket.ts`
- `docs/socket-mock-server.md`
- `docs/ai/manuals/waiting-room.md`

## Constraints

- cleanup 경로는 사용자 의도 없는 자동 종료이므로 과한 부수효과를 만들면 안 된다.
- leave API 성공 이전에 `leave_room` 소켓 이벤트를 먼저 보내면 안 된다.
- mock gateway와 실제 socket path가 같은 순서를 따라야 한다.
- host 여부, room state, session state가 이미 정리된 상황에서도 중복 오류를 만들지 않아야 한다.

## Decision Notes

- 수동/cleanup 퇴장을 분리 구현하지 않고 하나의 공통 시퀀스로 유지한다.
- 중복 요청 방지의 핵심은 in-flight Promise 재사용과 "이미 퇴장 완료" 상태 추적이다.
- 페이지 컴포넌트에서 개별 leave 로직을 늘리기보다 controller에 집중시킨다.

## Open Risks

- 브라우저 종료나 하드 리로드는 현재 테스트만으로 완전 검증하기 어렵다.
- cleanup 타이밍은 환경별로 다를 수 있어 E2E 보강이 필요할 수 있다.
- leave 실패 후 재시도 UX까지 포함하면 범위가 커질 수 있다.

## What This Shows In Review

- 비동기/cleanup/중복 요청 문제를 구조적으로 다룰 수 있는지
- React StrictMode 특성과 실제 사용자 흐름을 함께 고려하는지
- 실패 경로까지 포함해 안전하게 설계하는지
