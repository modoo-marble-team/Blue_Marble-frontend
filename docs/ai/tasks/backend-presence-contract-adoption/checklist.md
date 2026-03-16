# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] presence 범위와 room cleanup 범위를 분리해 정리했다
- [x] `/users/online` 응답 shape를 실제 계약 기준으로 확인했다
- [x] `online_users` socket payload와 enum을 실백엔드 기준으로 맞췄다
- [x] mock/real 경로가 같은 `OnlineUserPayload` 의미를 유지하도록 정리했다
- [x] 필요 시 lobby/waiting-room presence 소비 코드를 함께 맞췄다

## Testing

- [x] `src/features/presence/useOnlineUsersSocket.test.tsx`를 실행했다
- [ ] 필요 시 `npm run ai:check:lobby`를 실행했다
- [x] 필요 시 `npm run lint`를 실행했다
- [x] 필요 시 `npm run build`를 실행했다

## Review

- [x] 접속자 상태 literal과 mock/real 경계가 어긋나지 않는지 확인했다
- [x] room cleanup 서버 이슈를 프론트에서 잘못 덮고 있지 않은지 확인했다
- [ ] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
