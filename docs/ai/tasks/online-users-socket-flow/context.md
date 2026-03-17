# Context

## Current Behavior

- `useOnlineUsersSocket`는 초기 `/users/online` REST snapshot 조회와 `online_users` socket 이벤트 구독을 함께 담당한다.
- 같은 훅 안에서 `connect`, `disconnect`, `connect_error`, window refresh request까지 같이 처리하고 있다.
- 최근 새로고침/로비 복귀 문제를 수정하면서 reconnect false error 정책이 여기에 추가되어, 현재는 흐름 파악이 다소 어려운 상태다.

## Related Files

- `src/features/presence/useOnlineUsersSocket.ts`
- `src/features/presence/useOnlineUsersSocket.test.tsx`
- `src/features/presence/onlineUsersSocket.ts`
- `src/features/presence/onlineUsersSocket.test.ts`
- `src/features/presence/api.ts`
- `docs/ai/manuals/lobby.md`

## Constraints

- `useOnlineUsersSocket`의 반환 형태는 유지해야 한다.
- mock 모드와 real 모드의 visible behavior는 동일해야 한다.
- reconnect 경계에서의 false error 완화 정책은 유지하되, 로직만 읽기 쉽게 정리한다.
- snapshot source of truth는 여전히 `/users/online` + `online_users` 조합이다.

## Decision Notes

- 이번 작업은 정책 재정의가 아니라, 현재 정책을 더 작은 책임 단위로 나누는 리팩토링이다.
- `connect_error`나 `disconnect`를 언제 hard error로 볼지에 대한 의미는 바꾸지 않고, 그 의도를 함수 이름/배치로 드러내는 쪽이 맞다.
- `onlineUsersSocket.ts`는 socket 연결과 refresh event 이름 같은 transport 경계를 유지하고, `useOnlineUsersSocket.ts`는 state 조합 중심으로 읽히게 정리하는 방향이 적절하다.

## Open Risks

- reconnect 경계는 비동기 타이밍이 많아서, 작은 구조 변경도 테스트 없이 하면 회귀가 나기 쉽다.
- helper 분리를 과도하게 하면 오히려 시점 이동이 늘어 읽기 어려워질 수 있다.
- backend cleanup/stale membership 문제는 이 리팩토링으로 해결되지 않는다.
