# 현재 구조

`src/features/presence`에는 아래 성격의 파일이 한 층에 섞여 있다.

- online users snapshot / socket / model / status / unread
- direct message socket / controller
- mock data
- UI components

현재는 파일 수가 많고 책임 경계가 바로 드러나지 않는다.

# 정리 방향

- 테스트를 전역 `tests/` 폴더로 몰지 않는다.
- 대신 기능 단위 폴더를 추가해 대상 코드와 테스트를 더 가깝게 묶는다.
- `components/`는 UI 컴포넌트만 남기고, 상태/소켓/모델 코드는 기능 단위 폴더로 정리한다.

# 목표 구조

```text
src/features/presence/
  online-users/
    api.ts
    api.test.ts
    onlineUsersModel.ts
    onlineUsersModel.test.ts
    onlineUsersSocket.ts
    onlineUsersSocket.test.ts
    useOnlineUsersSocket.ts
    useOnlineUsersSocket.test.tsx
  direct-message/
    directMessageSocket.ts
    directMessageSocket.test.ts
    useDirectMessageController.ts
    useDirectMessageController.test.tsx
  mock/
    mockData.ts
    mockData.test.ts
  components/
    DevPresenceControlPanel.tsx
    DirectMessagePanel.tsx
    DirectMessagePanel.test.tsx
    UserListPanel.tsx
    UserListPanel.test.tsx
    UserRow.tsx
  types.ts
  status.ts
  status.test.ts
  unreadBadge.ts
  unreadBadge.test.ts
```

# 결정 이유

- `online-users`와 `direct-message`는 함께 바뀌는 파일이 다르다.
- `mockData`는 실사용 로직보다 mock 경로와 함께 바뀌므로 별도 경계가 낫다.
- UI 컴포넌트 테스트는 컴포넌트와 같은 폴더에 두는 편이 `docs/testing.md` 기준에 맞다.
- `types/status/unreadBadge`는 online users와 direct message 양쪽에서 함께 쓰므로 shared root에 남긴다.

# 주의할 점

- `WaitingRoomPage`, `LobbyPage`, `DevControlPanel`, `mocks/handlers.ts`는 presence 경로를 직접 import한다.
- 상대 경로가 깊어지는 파일이 있어 `../../` 개수가 바뀌는 부분을 특히 조심한다.
- `vi.mock()` 경로도 실제 파일 이동에 맞춰 함께 갱신해야 한다.
