# Checklist

## Planning

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 백엔드 refresh 계약을 정리했다
- [x] 영향 범위와 제외 범위를 정리했다
- [x] 최소 검증 범위를 정리했다

## Implementation

- [x] refresh 응답 타입과 refresh helper를 추가한다
- [x] `apiClient`에 `withCredentials` 기본 설정을 추가한다
- [x] 401 응답 후 refresh + 1회 재시도 interceptor를 추가한다
- [x] refresh 성공 시 access token 갱신과 소켓 재연결 흐름을 연결한다
- [x] `/auth/logout` 호출 기반 logout 정리를 반영한다
- [x] mock/real 경로를 함께 확인한다

## Testing

- [x] `npx vitest run src/lib/axios.test.ts`
- [x] `npx vitest run src/features/auth/api/api.test.ts`
- [x] `npx vitest run src/features/auth/session/hooks/useAuthBootstrap.test.tsx`
- [x] `npx vitest run src/lib/socket.test.ts`
- [x] 필요 시 관련 페이지 테스트를 실행한다
- [x] 필요 시 `npm run lint`
- [x] 필요 시 `npm run build`

## Review

- [x] refresh token이 프론트 상태나 body에 저장되지 않는지 확인한다
- [x] 401 -> refresh -> 재시도 -> 실패 시 세션 정리 흐름을 확인한다
- [x] logout과 socket reconnect 흐름을 확인한다
- [ ] 변경 파일 / 실행한 검증 / 남은 리스크를 정리한다
