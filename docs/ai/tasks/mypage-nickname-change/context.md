# Context

## Current Behavior

- `setNickname` API 호출은 이미 존재하지만, UI는 `NicknameSetupPage`의 최초 설정 흐름에만 묶여 있다.
- `MyPage`는 프로필/전적 조회만 하고 닉네임 수정 흐름은 없다.
- 게스트는 마이페이지 전체가 제한되어 있다.
- 닉네임 저장 성공 시 `useAuthStore().updateNickname`로 세션 닉네임을 갱신할 수 있지만, 마이페이지 query cache를 갱신하는 흐름은 없다.

## Related Files

- `src/pages/MyPage.tsx`
- `src/features/auth/profile/hooks/useMyPageProfileQuery.ts`
- `src/features/auth/api/api.ts`
- `src/features/auth/session/types.ts`
- `src/features/auth/nickname/*`

## Decision Notes

- 최초 닉네임 설정과 마이페이지 재변경은 화면 목적이 다르므로 전용 훅을 분리한다.
- 형식 검증 규칙과 helper feedback 계산은 기존 nickname 규칙을 재사용한다.
- 저장 성공 시 React Query cache와 auth store를 함께 갱신해 즉시 반영한다.
- 프론트에서 변경 횟수 제한이나 1회 제한은 추가하지 않는다.
- 편집 상태에서만 보이는 `닉네임` 라벨은 숨기고, 입력의 접근성 이름은 `sr-only` label 또는 `aria-label`로 유지한다.
