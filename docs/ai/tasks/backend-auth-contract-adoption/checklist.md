# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] auth API adapter를 추가했다
- [x] guest login / session restore / my-page / nickname API를 실제 계약에 연결했다
- [x] 카카오 로그인 callback 라우트를 추가했다
- [x] `user.id`를 문자열로 정규화했다
- [x] mock/real 경로를 함께 확인했다

## Testing

- [x] `src/features/auth/api.test.ts`를 실행했다
- [x] `src/features/auth/hooks/useNicknameAvailability.test.tsx`를 실행했다
- [x] 필요 시 `npm run lint`를 실행했다
- [x] 필요 시 `npm run build`를 실행했다

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] 리다이렉트, 세션 복구, query 처리, 게스트 분기를 확인했다
- [ ] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
