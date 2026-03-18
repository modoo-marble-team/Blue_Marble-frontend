# Plan

## Task

- 작업 이름: refresh cookie 기반 인증 복구와 재시도 흐름 반영
- 요청 날짜: 2026-03-18
- 담당 범위: auth api, axios interceptor, session bootstrap, logout, socket reconnect

## Goal

- 백엔드가 확정한 refresh 계약을 기준으로 프론트 인증 흐름을 cookie 기반 refresh 재발급 구조에 맞게 정리한다.
- access token은 클라이언트 세션에 유지하되, refresh token은 HttpOnly cookie로만 전달받고 프론트에서는 직접 저장하지 않도록 맞춘다.
- 401 응답 후 refresh 재시도, logout API 호출, refresh 성공 후 소켓 재연결까지 하나의 흐름으로 연결한다.

## In Scope

- `withCredentials: true`가 적용된 auth/axios 기본 설정
- `POST /auth/refresh` helper와 refresh 응답 타입 정리
- 401 응답 시 refresh 후 1회 재시도하는 axios response interceptor
- refresh 성공 시 access token 갱신 및 소켓 인증 컨텍스트 재동기화
- `/auth/logout` 호출 기반 logout 정리
- bootstrap restore와 refresh 실패 시 세션 정리 흐름 점검
- 관련 auth/axios/socket 테스트 보강

## Out Of Scope

- refresh token 자체를 프론트 store/localStorage에 저장하는 구조
- 카카오 로그인 callback 계약 자체 변경
- auth 전역 UX 리디자인
- branch protection, AI review workflow 변경

## Target Files

- `src/lib/axios.ts`
- `src/lib/axios.test.ts`
- `src/lib/socket.ts`
- `src/lib/socket.test.ts`
- `src/features/auth/api/api.ts`
- `src/features/auth/api/api.test.ts`
- `src/features/auth/session/types.ts`
- `src/features/auth/session/store.ts`
- `src/features/auth/session/hooks/useAuthBootstrap.ts`
- `src/features/auth/session/hooks/useAuthBootstrap.test.tsx`
- `src/pages/KakaoLoginCallbackPage.tsx`
- `src/pages/lobby/LobbyPage.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`
- 필요 시 logout 관련 페이지 테스트

## Completion Criteria

- `apiClient`가 refresh/logout 요청에 cookie를 보낼 수 있도록 `withCredentials: true`로 동작한다.
- access token 만료로 401이 발생하면 refresh 성공 시 access token을 갱신하고 실패한 요청을 1회 재시도한다.
- refresh 실패 시 세션 정리와 소켓 정리가 일관되게 수행된다.
- logout은 `/auth/logout`을 호출해 refresh 무효화 + cookie 삭제 계약을 따른다.
- refresh 성공 후 소켓은 새 access token으로 재연결된다.
- refresh token은 프론트 store/localStorage/body에 저장되지 않는다.

## Test Plan

- 최소 실행 테스트
  - `npx vitest run src/lib/axios.test.ts`
  - `npx vitest run src/features/auth/api/api.test.ts`
  - `npx vitest run src/features/auth/session/hooks/useAuthBootstrap.test.tsx`
  - `npx vitest run src/lib/socket.test.ts`
- 추가 검증
  - 필요 시 `npx vitest run src/pages/lobby/LobbyPage.test.tsx`
  - 필요 시 `npx vitest run src/pages/waiting-room/page/WaitingRoomPage.test.tsx`
  - `npm run lint`
  - `npm run build`
