# Plan

## Task

- 작업 이름: auth 계약 반영 1차 구현
- 요청 날짜: 2026-03-16
- 담당 범위: auth API, 세션 복구, 카카오 로그인 콜백, 닉네임/마이페이지 계약 정렬

## Goal

- 백엔드 최종 계약에 맞춰 프론트 인증 흐름을 mock 중심 구조에서 실제 auth API 기반 구조로 전환한다.
- guest login, kakao login redirect/callback, session restore, nickname update, my-page profile 조회를 실제 계약 기준으로 정리한다.

## In Scope

- `GET /api/auth/kakao/login` redirect 진입
- 프론트 카카오 콜백 라우트 추가
- callback query(`access_token`, `is_new_user`) 처리
- `/api/auth/session` 기반 세션 복구
- `/api/auth/guest` 기반 게스트 로그인
- `/api/users/me`, `/api/users/me/nickname` 기반 마이페이지/닉네임 설정
- `user.id` -> `String(id)` 정규화
- `provider`, `needsNicknameSetup` 파생 규칙 정리

## Out Of Scope

- 로비/대기방/게임 계약 반영
- 소켓 이벤트 구조 변경
- 게임 fallback 구현

## Target Files

- `src/features/auth/types.ts`
- `src/features/auth/store.ts`
- `src/features/auth/mockApi.ts`
- `src/features/auth/hooks/useNicknameAvailability.ts`
- `src/features/auth/hooks/useNicknameSetupForm.ts`
- `src/features/auth/hooks/useMyPageProfileQuery.ts`
- `src/pages/HomePage.tsx`
- `src/pages/NicknameSetupPage.tsx`
- `src/pages/MyPage.tsx`
- `src/App.tsx`
- `src/lib/axios.ts`
- 신규 auth API/adapter 파일
- 필요 시 auth 관련 테스트 파일

## Completion Criteria

- 카카오 로그인 버튼이 `GET /api/auth/kakao/login` redirect를 사용한다.
- 프론트 콜백 페이지가 query를 읽어 세션을 복원하고 적절한 화면으로 이동한다.
- 앱 초기화 시 `/api/auth/session`으로 유효 토큰 기반 세션 복구가 가능하다.
- 게스트 로그인은 `/api/auth/guest`를 사용한다.
- 닉네임 설정과 마이페이지 조회가 실제 API 기반으로 동작한다.
- 프론트 전역 `userId`는 문자열로 일관되게 비교된다.

## Test Plan

- 최소 실행 테스트
  - `npx vitest run src/features/auth/api.test.ts`
  - `npx vitest run src/features/auth/hooks/useNicknameAvailability.test.tsx`
- 추가 검증
  - `npm run lint`
  - 필요 시 `npm run build`
