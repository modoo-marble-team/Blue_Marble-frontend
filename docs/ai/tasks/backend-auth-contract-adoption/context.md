# Context

## Current Behavior

- 홈 화면은 `mockKakaoLogin`, `mockGuestLogin`으로 세션을 만든다.
- 카카오 로그인 redirect/callback 전용 프론트 라우트가 없다.
- 세션 복구는 localStorage persisted session에만 기대고 있으며 `/auth/session`을 호출하지 않는다.
- 닉네임 설정은 mock 중복 확인과 mock 저장을 사용한다.
- 마이페이지 프로필 조회도 mock 기반이다.
- auth 세션은 `provider`, `needsNicknameSetup`를 필수로 기대하지만, 백엔드 `/auth/session` 응답은 최소 유저 정보만 내려준다.

## Related Files

- `src/features/auth/mockApi.ts`
- `src/features/auth/mock/session.ts`
- `src/features/auth/mock/nickname.ts`
- `src/features/auth/mock/myPage.ts`
- `src/features/auth/types.ts`
- `src/features/auth/store.ts`
- `src/features/auth/hooks/useNicknameAvailability.ts`
- `src/features/auth/hooks/useNicknameSetupForm.ts`
- `src/features/auth/hooks/useMyPageProfileQuery.ts`
- `src/pages/HomePage.tsx`
- `src/pages/NicknameSetupPage.tsx`
- `src/pages/MyPage.tsx`
- `src/App.tsx`

## Constraints

- auth store의 `userId`는 문자열로 유지해야 한다.
- 게스트는 `/users/me` 호출 불가다.
- `/auth/session`은 게스트도 호출 가능하다.
- 카카오 메인 플로우는 `GET /api/auth/kakao/login -> GET callback -> frontend redirect query 처리`다.
- 백엔드에 닉네임 availability 전용 endpoint는 없으므로, 중복 확인 UX는 제출 시점 에러 처리와 분리해서 생각해야 한다.
- mock 모드는 완전히 제거하지 말고, 기존 테스트/데모 흐름과 충돌하지 않게 유지한다.

## Decision Notes

- auth API 호출은 별도 adapter 파일로 분리해 store 타입과 백엔드 payload 사이 경계를 명확히 둔다.
- session restore는 앱 루트에서 1회 수행하고, 완료 전에는 페이지 가드가 성급히 리다이렉트하지 않도록 한다.
- callback 페이지는 query에서 token만 읽고, 실제 유저 정보는 `/auth/session`으로 보강해서 세션에 저장한다.
- nickname availability는 실서버에서는 형식 검증 중심으로 두고, 중복 여부는 submit 시 API 응답으로 처리한다.

## Open Risks

- `provider`를 `/auth/session`만으로 완전히 복원할 수 없으므로 persisted session과 query 문맥을 함께 사용해야 한다.
- callback 진입 직후 bootstrap restore와 callback 처리 effect가 충돌하지 않게 순서를 맞춰야 한다.
- 닉네임 중복 확인 UX가 mock 시절과 달라지므로 helper text와 submit disable 규칙을 조정해야 한다.
