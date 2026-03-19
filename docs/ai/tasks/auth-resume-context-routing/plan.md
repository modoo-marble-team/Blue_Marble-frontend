# Plan

## Task

- 작업 이름: auth resume context routing
- 요청 날짜: 2026-03-19
- 담당 범위: auth context API, App resume routing hook, 관련 테스트, task 문서

## Goal

- 세션 복구 이후 `GET /api/users/me/context` 응답의 `resume_target`을 기준으로 로비/대기방/게임 복귀 경로를 일관되게 결정한다.

## In Scope

- `users/me/context` 응답 타입과 API 헬퍼 추가
- mock auth 경로용 기본 context 응답 추가
- App 레벨 공통 resume routing hook 추가
- 홈 전용 로비 리다이렉트 흐름 정리
- 관련 Vitest 추가/수정

## Out Of Scope

- waiting-room/game 상세 UI 변경
- 백엔드 문서/서버 코드 수정
- me/context 응답 자체의 비즈니스 규칙 변경

## Target Files

- `src/features/auth/session/types.ts`
- `src/features/auth/api/api.ts`
- `src/features/auth/api/api.test.ts`
- `src/features/auth/api/mockApi.ts`
- `src/features/auth/mock/session.ts`
- `src/features/auth/session/hooks/useAuthResumeNavigation.ts`
- `src/features/auth/session/hooks/useAuthResumeNavigation.test.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/pages/HomePage.tsx`
- `docs/ai/tasks/auth-resume-context-routing/*`

## Completion Criteria

- 세션이 복구된 사용자는 `resume_target` 기준으로 `/lobby`, `/rooms/:roomId`, `/game/:gameId` 중 올바른 경로로 복귀한다.
- `resume_target = room`인데 `room_status = playing`이어도 room 분기를 유지한다.
- 기존 callback / nickname setup 흐름은 유지된다.
- 관련 Vitest가 통과한다.

## Test Plan

- `npx vitest run src/features/auth/api/api.test.ts src/features/auth/session/hooks/useAuthResumeNavigation.test.tsx src/App.test.tsx`
- `npm run ai:self-review -- --files src/features/auth/session/types.ts src/features/auth/api/api.ts src/features/auth/api/api.test.ts src/features/auth/api/mockApi.ts src/features/auth/mock/session.ts src/features/auth/session/hooks/useAuthResumeNavigation.ts src/features/auth/session/hooks/useAuthResumeNavigation.test.tsx src/App.tsx src/App.test.tsx src/pages/HomePage.tsx docs/ai/tasks/auth-resume-context-routing/plan.md docs/ai/tasks/auth-resume-context-routing/context.md docs/ai/tasks/auth-resume-context-routing/checklist.md`
