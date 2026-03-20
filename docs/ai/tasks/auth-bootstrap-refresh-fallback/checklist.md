# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] bootstrap/refresh/context 현재 흐름을 정리했다
- [x] `useAuthBootstrap`에 초기 refresh fallback을 추가했다
- [x] stale bootstrap 무시 규칙을 유지했다
- [x] 관련 테스트를 보강했다

## Testing

- [x] 대상 Vitest를 실행했다
- [x] `npm run lint`를 실행했다
- [x] `npm run ai:self-review`를 실행했다

## Review

- [x] persisted session이 없는 경우만 refresh fallback을 타도록 분리했다
- [x] refresh 실패 시 비로그인 진입 흐름을 유지했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
