# Context

## Current Behavior

- `useAuthBootstrap`은 persisted `session.accessToken`이 있을 때만 `restoreAuthSession()`을 시작한다.
- persisted session이 없으면 bootstrap을 바로 종료하고 홈/비로그인 흐름으로 남는다.
- `useAuthResumeNavigation`은 세션이 복구된 뒤에만 `GET /users/me/context`를 호출한다.

## Problem

- refresh cookie는 살아 있어도 localStorage session이 비어 있으면 자동 세션 복구가 시작되지 않는다.
- 게스트/카카오 모두 “refresh token 유효 기간 내 자동 재진입” 기대와 어긋날 수 있다.
- 브라우저 종료 후 localStorage가 비워지거나 초기 session이 없는 경우, resume navigation까지 이어지지 못한다.

## Related Files

- `src/features/auth/session/hooks/useAuthBootstrap.ts`
- `src/features/auth/session/hooks/useAuthBootstrap.test.tsx`
- `src/features/auth/api/api.ts`
- `src/features/auth/session/store.ts`
- `src/features/auth/session/hooks/useAuthResumeNavigation.ts`
- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 기존 persisted access token 기반 복구 흐름은 유지해야 한다.
- refresh fallback은 session이 없을 때만 작동해야 한다.
- 중간에 새 세션이 들어오면 이전 bootstrap 결과는 무시해야 한다.
- refresh 실패 시 기존 비로그인 진입 흐름을 깨면 안 된다.

## Decision Notes

- `useAuthBootstrap`에서 persisted access token이 없을 때 `refreshAccessToken()`을 먼저 시도한다.
- refresh 성공 시 새 access token으로 `restoreAuthSession()`을 이어서 호출한다.
- bootstrap 진행 추적 ref는 `refresh-fallback` 같은 명시적 marker를 허용해 session 변경 시 spinner를 올바르게 정리한다.

## Open Risks

- auth mock 모드에서 refresh 결과가 빈 토큰이면 fallback은 자연스럽게 no-op이 된다.
- refresh cookie 정책이 브라우저/도메인별로 다르면 실제 재현 결과는 환경 설정에 의존한다.
