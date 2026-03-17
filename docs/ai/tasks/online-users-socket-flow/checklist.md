# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] snapshot sync 로직을 작은 helper 또는 명확한 단계로 분리했다
- [x] `online_users` 이벤트 처리와 상태 반영 경계를 드러나게 정리했다
- [x] `connect`, `disconnect`, `connect_error` 정책 코드를 읽기 쉽게 정리했다
- [x] refresh request 이벤트 처리 흐름을 정리했다
- [x] 반환 형태와 mock/real 사용자 경험을 유지했다

## Testing

- [x] `src/features/presence/useOnlineUsersSocket.test.tsx`를 실행했다
- [x] 필요 시 `src/features/presence/onlineUsersSocket.test.ts`를 실행했다
- [x] `npm run lint` 또는 범위 lint를 실행했다
- [x] 필요 시 `npm run build`를 실행했다

## Review

- [x] 핵심 흐름이 위에서 아래로 읽히는지 확인했다
- [x] helper 분리로 시점 이동이 과도하게 늘지 않았는지 확인했다
- [x] reconnect false error 정책이 의도대로 유지되는지 확인했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
