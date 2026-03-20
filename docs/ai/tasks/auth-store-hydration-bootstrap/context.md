# Context

- `useAuthStore`는 `persist`로 `localStorage` 세션을 복원한다.
- 앱 첫 진입 시 `useAuthBootstrap`이 너무 빨리 실행되면, persist hydration 전에 refresh fallback 또는 null 분기를 탈 수 있다.
- 이 경우 재접속 시 세션은 `localStorage`에 남아 있어도 복귀 라우팅이 이어지지 않을 수 있다.
