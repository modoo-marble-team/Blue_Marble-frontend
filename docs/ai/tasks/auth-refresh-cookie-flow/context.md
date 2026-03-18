# Context

## Current Behavior

- 프론트는 zustand persisted session에 저장된 `accessToken`을 Authorization 헤더에만 붙인다.
- `apiClient`는 `withCredentials`를 기본으로 켜지 않고 있으며 401 응답 후 refresh 재시도 로직도 없다.
- 앱 초기 bootstrap은 persisted access token이 있을 때 `/auth/session`으로 세션을 1회 복구하는 구조다.
- logout은 `/auth/logout` API 호출 없이 `clearSession()`과 `disconnectSocketAndClearAuth()`만 수행한다.
- 소켓은 현재 store의 access token을 `socket.auth.token`으로 동기화하고, 토큰이 바뀌면 재연결할 수 있는 유틸만 제공한다.

## Related Files

- `src/lib/axios.ts`
- `src/lib/socket.ts`
- `src/features/auth/api/api.ts`
- `src/features/auth/session/types.ts`
- `src/features/auth/session/store.ts`
- `src/features/auth/session/hooks/useAuthBootstrap.ts`
- `src/pages/KakaoLoginCallbackPage.tsx`
- `src/pages/lobby/LobbyPage.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`

## Backend Contract Notes

- refresh endpoint는 `POST /v1/auth/refresh`다.
- refresh 성공 응답 body는 `access_token`, `token_type`, `expires_in`만 포함한다.
- refresh token은 HttpOnly cookie only로 전달되며 body에는 포함되지 않는다.
- refresh token TTL은 14일이고, refresh 성공 시 rotation이 적용된다.
- logout endpoint는 `POST /v1/auth/logout`이며 refresh 무효화와 cookie 삭제를 함께 처리한다.
- access token 만료/무효와 refresh token 만료/무효는 모두 401을 반환한다.
- 소켓은 connect 시점에만 토큰 검증하므로 refresh 성공 후 새 access token으로 재연결하면 된다.

## Constraints

- access token은 현재처럼 프론트 session 상태에 유지할 수 있지만, refresh token은 프론트 상태에 저장하면 안 된다.
- cookie 전송을 위해 refresh/logout 호출은 `withCredentials: true` 전제를 만족해야 한다.
- 실제 cookie path는 `/v1/auth`이므로 `VITE_API_URL`과 auth endpoint 경로 정합성을 확인해야 한다.
- mock 모드와 실제 모드가 공존하므로 mock 경로를 불필요하게 깨지 않도록 주의한다.
- 소켓 재연결은 이미 연결 중인 room/lobby 흐름을 과하게 흔들지 않아야 한다.

## Decision Notes

- refresh는 별도 auth helper로 분리해 axios interceptor와 UI 코드가 refresh payload 형식을 직접 알지 않게 한다.
- response interceptor는 무한 루프를 막기 위해 refresh 재시도를 1회로 제한한다.
- refresh 성공 시 store access token을 갱신하고, 소켓은 기존 유틸을 활용해 인증 컨텍스트를 재동기화한다.
- logout은 UI에서 직접 세션만 비우지 않고 API 호출 성공/실패와 상관없이 최종 정리 흐름을 한 곳으로 모은다.
- bootstrap restore와 runtime refresh는 중복 책임이 생기지 않도록 역할을 분리한다.

## Open Risks

- 401 응답 메시지(`Token expired`, `Invalid token`)가 모두 refresh 대상은 아닐 수 있어, interceptor 조건이 너무 넓으면 의도치 않은 재시도가 생길 수 있다.
- refresh 실패 시 동시에 여러 요청이 401을 받으면 중복 refresh 호출을 막는 동기화가 필요할 수 있다.
- Kakao callback이 여전히 query `access_token`을 사용하므로, 이 흐름과 refresh 기반 세션 복구가 충돌하지 않게 순서를 맞춰야 한다.
- logout을 waiting-room에서 호출할 때 leaveRoom 실패와 auth 정리 순서가 엇갈리면 UX가 흔들릴 수 있다.
