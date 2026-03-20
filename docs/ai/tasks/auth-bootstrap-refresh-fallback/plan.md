# Plan

## Task

- 작업 이름: auth bootstrap refresh fallback
- 요청 날짜: 2026-03-20
- 담당 범위: auth bootstrap 초기 refresh fallback, 관련 테스트, task 문서

## Goal

- 앱 첫 진입 시 persisted session이 없어도 refresh cookie가 유효하면 `/auth/refresh`를 먼저 시도해 세션 복구와 resume navigation 흐름을 이어간다.

## In Scope

- `useAuthBootstrap`의 초기 진입 분기 확장
- persisted session 부재 시 refresh fallback 추가
- stale bootstrap 결과 무시 규칙 유지
- `useAuthBootstrap` 테스트 보강
- task 문서 추가

## Out Of Scope

- auth API 계약 변경
- `useAuthResumeNavigation` 분기 변경
- Kakao callback / nickname setup 흐름 변경

## Target Files

- `src/features/auth/session/hooks/useAuthBootstrap.ts`
- `src/features/auth/session/hooks/useAuthBootstrap.test.tsx`
- `docs/ai/tasks/auth-bootstrap-refresh-fallback/*`

## Completion Criteria

- persisted session이 없어도 refresh cookie가 유효하면 세션 복구를 시도한다.
- refresh 성공 시 `/auth/session` 기반 복구가 이어진다.
- refresh 실패 시 기존 비로그인 진입 흐름을 유지한다.
- stale bootstrap 결과는 기존처럼 무시된다.

## Test Plan

- `npx vitest run src/features/auth/session/hooks/useAuthBootstrap.test.tsx`
- `npm run lint`
- `npm run ai:self-review -- --files src/features/auth/session/hooks/useAuthBootstrap.ts src/features/auth/session/hooks/useAuthBootstrap.test.tsx docs/ai/tasks/auth-bootstrap-refresh-fallback/plan.md docs/ai/tasks/auth-bootstrap-refresh-fallback/context.md docs/ai/tasks/auth-bootstrap-refresh-fallback/checklist.md`
