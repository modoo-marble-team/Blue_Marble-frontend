# 현재 구조

`src/features/auth`에는 아래 성격의 파일이 한 층에 섞여 있다.

- session/store 성격
  - `store.ts`
  - `types.ts`
- API 성격
  - `api.ts`
  - `api.test.ts`
  - `mockApi.ts`
- nickname setup / validation 성격
  - `nicknameSetupRules.ts`
  - `nicknameSetupRules.test.ts`
  - `validation.ts`
  - `hooks/useNicknameAvailability.ts`
  - `hooks/useNicknameAvailability.test.tsx`
  - `hooks/useNicknameSetupForm.ts`
- session bootstrap / guard 성격
  - `hooks/useAuthBootstrap.ts`
  - `hooks/useAuthBootstrap.test.tsx`
  - `hooks/useRequireActiveSession.ts`
  - `hooks/useRequireNicknameSetupSession.ts`
  - `hooks/useRedirectAuthenticatedToLobby.ts`
  - `hooks/useRedirectAuthenticatedToLobby.test.tsx`
- profile query 성격
  - `hooks/useMyPageProfileQuery.ts`
- mock 성격
  - `mock/*`

현재도 `hooks/`, `mock/`는 분리돼 있지만, auth root에 여전히 session / api / nickname 규칙이 함께 있어 기능 경계가 바로 보이지 않는다.

# 정리 방향

- 테스트를 전역 `tests/` 폴더로 이동하지 않는다.
- `mock/` 폴더는 현재 구조를 최대한 유지한다.
- `session`, `api`, `nickname`, `profile` 책임이 root에서 더 잘 드러나도록 재배치한다.
- `types.ts`는 session 전용이면 `session/`으로 이동하는 쪽을 우선 검토한다.
- nickname validation과 nickname form 흐름은 너무 잘게 쪼개지 않고 함께 읽히는 범위로 유지한다.

# 목표 구조

```text
src/features/auth/
  api/
    api.ts
    api.test.ts
    mockApi.ts
  session/
    store.ts
    types.ts
    hooks/
      useAuthBootstrap.ts
      useAuthBootstrap.test.tsx
      useRequireActiveSession.ts
      useRequireNicknameSetupSession.ts
      useRedirectAuthenticatedToLobby.ts
      useRedirectAuthenticatedToLobby.test.tsx
  nickname/
    nicknameSetupRules.ts
    nicknameSetupRules.test.ts
    validation.ts
    hooks/
      useNicknameAvailability.ts
      useNicknameAvailability.test.tsx
      useNicknameSetupForm.ts
  profile/
    hooks/
      useMyPageProfileQuery.ts
  mock/
    constants.ts
    helpers.ts
    myPage.ts
    nickname.ts
    session.ts
    storage.ts
```

# 결정 이유

- `session/`은 store, 타입, bootstrap/guard 훅이 함께 바뀌는 경계다.
- `api/`는 auth API 호출과 mockApi 연결이 함께 바뀌는 경계다.
- `nickname/`은 규칙, validation, form, availability 훅이 함께 움직이는 경계다.
- `profile/`은 마이페이지 query처럼 다른 auth 흐름과 분리된 책임을 드러낸다.
- `mock/`은 이미 응집도가 높아 크게 건드리지 않는 편이 안전하다.

# 주의할 점

- `useAuthBootstrap`와 `store/types`는 앱 시작 경로에 걸려 있어 import 누락이 나면 전체 앱이 깨진다.
- `mockApi.ts`가 어느 경계에 속하는지 애매할 수 있지만, 실제로는 auth API 흐름과 함께 바뀌므로 `api/` 아래로 묶는 쪽을 우선 본다.
- refresh token, 세션 만료 UX, logout cleanup 같은 기능 작업은 이번 구조 정리와 분리한다.
