# Context

## Current Behavior

- 프론트 내부 `MyPageProfile` 모델은 `stats.total`을 사용한다.
- `/users/me` 백엔드 계약은 `stats.total_games`로 최종 확정되었다.
- 현재 API 매핑이 그대로면 총 게임 수가 비어 보이거나 0으로 떨어질 수 있다.

## Related Files

- `src/features/auth/api/api.ts`
- `src/features/auth/api/api.test.ts`
- `src/features/auth/session/types.ts`
- `src/pages/MyPage.tsx`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- UI와 세션 도메인 모델은 최소 범위로 유지한다.
- 계약 변경은 API 매핑 계층에서 흡수한다.
- mock 경로를 깨지 않도록 내부 `stats.total` 모델은 유지한다.

## Decision Notes

- 화면/도메인 모델 전반을 `total_games`로 바꾸기보다, API payload를 `total_games -> total`로 변환한다.
- 필요 시 과도기 호환을 위해 기존 `stats.total`도 fallback으로 허용한다.

## Open Risks

- 백엔드가 최종적으로 `total_games`만 내려준다는 가정에 맞춘 수정이다.
- 이후 다른 프로필 필드명도 바뀌면 별도 계약 정리가 추가로 필요할 수 있다.
