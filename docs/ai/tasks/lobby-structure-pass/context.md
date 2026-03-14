# Context

## Current Behavior

- `LobbyPage.tsx`는 로비 방 목록, 접속자 목록, DM 패널, 헤더 메뉴, 방 생성/입장 모달을 한 페이지에서 조합한다.
- 현재 페이지는 아래 흐름을 모두 직접 들고 있다.
  - 세션 조회와 logout 처리
  - 검색/필터/패널 열림 상태
  - room query와 online users socket 구독
  - DM controller 연결
  - mock 모드 사용자 상태 반영
  - 마이페이지 이동과 헤더 메뉴 구성
- 기능은 이미 분리된 훅이 많지만, 페이지 상단에서 읽어야 할 상태와 이벤트가 많아 `R5 시점 이동 최소화` 관점에서 개선 여지가 있다.

## Related Files

- `src/pages/lobby/LobbyPage.tsx`
- `src/pages/lobby/LobbyPage.test.tsx`
- `src/pages/lobby/useLobbyRoomActions.ts`
- `src/features/presence/useOnlineUsersSocket.ts`
- `src/features/presence/useDirectMessageController.ts`
- `docs/ai/manuals/lobby.md`
- `docs/rules.md`
- `docs/testing.md`
- 필요 시 `docs/socket-mock-server.md`

## Constraints

- `useLobbyRoomsQuery`, `useOnlineUsersSocket`, `useDirectMessageController`의 기존 반환 계약을 깨지 않는다.
- unread count는 사용자 id 기준 맵 구조를 유지한다.
- 게임 중인 유저 DM 차단 규칙은 유지한다.
- mock 모드의 현재 사용자 접속 반영과 logout 시 제거 흐름을 유지한다.
- 페이지를 "모든 것을 아는 controller"로 더 키우지 않는다.
- `vercel-react-best-practices`는 보조 기준으로만 사용한다.
  - 무의미한 `useMemo`/`useCallback` 추가보다 책임 분리와 읽기 흐름을 우선한다.

## Decision Notes

- 우선순위는 성능 미세 최적화보다 `가독성`과 `상태 소유권` 정리다.
- 페이지에 남겨야 할 것은 "조합/의도"이고, 반복되거나 세부 정책이 붙는 로직은 기존 hook 또는 로컬 전용 hook/helper로 이동하는 방향을 우선 검토한다.
- 후보 이동 대상:
  - 헤더 메뉴/프로필 관련 계산
  - mock logout / my-page 이동 / logout 핸들러 묶음
  - 로컬 UI 상태와 setter 묶음
- 버린 대안:
  - `LobbyPage` 전체를 감싸는 거대한 `useLobbyPageController` 도입
    - 이유: 페이지가 하는 일의 의도까지 숨겨서 오히려 읽기 흐름이 나빠질 수 있다.
  - 성능을 이유로 `useMemo`/`useCallback`를 광범위하게 추가
    - 이유: 현재 task 목표와 맞지 않고 React/Vite 구조에서 오히려 복잡도만 키울 수 있다.

## Open Risks

- 로컬 UI 상태를 분리하다가 필터/토글/모달 흐름이 테스트와 어긋날 수 있다.
- mock 모드 side effect를 옮기는 과정에서 login/logout 동작이 꼬일 수 있다.
- 페이지 밖으로 너무 많이 빼면 `LobbyPage`의 의도 파악이 더 어려워질 수 있다.
- DM controller와 접속자 목록 패널 경계를 잘못 잡으면 unread/패널 열기 흐름이 숨을 수 있다.
