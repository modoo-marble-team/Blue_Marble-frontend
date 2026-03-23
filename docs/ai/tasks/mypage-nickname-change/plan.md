# Plan

## Task

- 작업 이름: mypage nickname change
- 요청 날짜: 2026-03-24
- 담당 범위: 마이페이지 인라인 닉네임 변경 UI, auth profile 훅, nickname API 결과 코드 정리, 관련 테스트

## Goal

- 게스트는 현재처럼 마이페이지/닉네임 변경을 사용할 수 없게 유지한다.
- 카카오 로그인 사용자는 마이페이지에서 `PATCH /users/me/nickname`를 반복 호출해 닉네임을 계속 변경할 수 있게 한다.

## In Scope

- MyPage 프로필 카드에 닉네임 인라인 편집 UI 추가
- `useMyPageNicknameForm` 신규 훅 추가
- 닉네임 저장 성공 시 auth store + my-page query cache 동기화
- `NicknameSetResult` 실패 코드 확장 및 API 에러 매핑 정리
- 관련 Vitest 추가

## Out Of Scope

- 닉네임 최초 설정 페이지 흐름 재설계
- 게스트의 마이페이지 접근 정책 변경
- 새로운 라우트 또는 availability API 추가

## Completion Criteria

- 카카오 사용자는 마이페이지에서 현재 닉네임을 수정하고 저장할 수 있다.
- 저장 성공 후 마이페이지 표시값과 전역 세션 닉네임이 즉시 갱신된다.
- 게스트는 기존 제한 화면만 보고 수정 UI를 보지 않는다.
- 400/403/404/409/unknown 응답이 적절한 실패 코드와 메시지로 정리된다.

## Test Plan

- `npx vitest run src/features/auth/api/api.test.ts src/features/auth/profile/hooks/useMyPageNicknameForm.test.tsx src/pages/MyPage.test.tsx`
- `npm run lint`
- `npm run build`
