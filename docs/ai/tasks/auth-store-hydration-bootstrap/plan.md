# Auth Store Hydration Bootstrap

## 목표

- persisted auth session hydration이 끝나기 전에 bootstrap이 먼저 돌지 않도록 막는다.
- 재접속 시 홈에 머물고 `me/context` 복귀가 시작되지 않는 race를 줄인다.

## 작업 단계

1. auth store에 hydration 완료 상태를 추가한다.
2. `useAuthBootstrap`이 hydration 이후에만 restore/refresh를 시작하도록 수정한다.
3. hydration 지연 상황 회귀 테스트를 추가한다.
