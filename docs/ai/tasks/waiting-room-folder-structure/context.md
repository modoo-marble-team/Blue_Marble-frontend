# 현재 구조

`src/pages/waiting-room`에는 아래 파일이 한 디렉토리에 많이 섞여 있다.

- `WaitingRoomPage.tsx`, `WaitingRoomPage.test.tsx`, `WaitingRoomFlow.test.tsx`
- `api.ts`, `api.test.ts`, `types.ts`
- `socket.ts`
- `mockGateway.ts`, `mockGateway.test.ts`, `mockSeed.ts`
- `hooks.ts`
- `controller/*`
- `components/*`

현재도 `components/`, `controller/`는 나뉘어 있지만, page root에 여전히 api / socket / mock / test가 함께 있어 파일 탐색 시 맥락 전환이 잦다.

# 정리 방향

- 테스트를 전역 `tests/` 폴더로 이동하지 않는다.
- 대신 waiting-room 내부에 책임 기준 폴더를 추가한다.
- `WaitingRoomPage`는 page entry 성격을 유지한다.
- `controller/`는 현재 구조를 유지한다.
- `api`, `socket/mock`, `page test`를 더 분리해 page root의 밀도를 낮춘다.

# 목표 구조

```text
src/pages/waiting-room/
  page/
    WaitingRoomPage.tsx
    WaitingRoomPage.test.tsx
    WaitingRoomFlow.test.tsx
  components/
    DevControlPanel.tsx
    WaitingRoomActionPanel.tsx
    WaitingRoomChatBox.tsx
    WaitingRoomHeader.tsx
    WaitingRoomSidePanel.tsx
    WaitingSeatCard.tsx
  controller/
    actions.ts
    actions.test.ts
    lifecycle.ts
    lifecycle.test.ts
    socketSync.ts
    socketSync.test.ts
    state.ts
    state.test.ts
  api/
    api.ts
    api.test.ts
    types.ts
  socket/
    socket.ts
    mockGateway.ts
    mockGateway.test.ts
    mockSeed.ts
  hooks/
    hooks.ts
```

# 결정 이유

- `page/`는 화면 조합과 page-level test를 함께 묶어 읽기 쉽게 한다.
- `api/`는 snapshot payload, API 호출, 타입이 함께 바뀌는 경계다.
- `socket/`는 emit/subscribe와 mock gateway가 함께 바뀌는 경계다.
- `controller/`는 이미 잘 나뉘어 있어 유지하는 편이 안전하다.

# 주의할 점

- `WaitingRoomPage`는 presence, auth, lobby 경로와도 연결된다.
- `mockSeed`는 presence mock data와도 연결돼 있어 import 이동 시 상대 경로를 조심해야 한다.
- game start navigate, cleanup leave, preJoinedSnapshot 같은 경계 로직은 구조만 바꾸고 동작은 건드리지 않는다.
