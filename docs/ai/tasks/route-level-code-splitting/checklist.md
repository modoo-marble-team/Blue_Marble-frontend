# Checklist

## Implementation

- [x] `App.tsx` 정적 import를 lazy import로 전환했다
- [x] `Suspense` fallback을 추가했다
- [x] bootstrap screen / 보호 라우트 흐름이 기존과 동일하게 유지된다

## Testing

- [x] `src/App.test.tsx`
- [x] 범위 lint
- [x] build

## Review

- [x] route 정의가 이전보다 읽기 어려워지지 않았는지 확인했다
- [x] fallback UI가 불필요하게 중복되지 않는지 확인했다
- [x] 메인 청크 크기 감소 여부를 build 결과로 확인했다
