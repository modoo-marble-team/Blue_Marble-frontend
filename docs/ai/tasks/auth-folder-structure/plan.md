# 목표

`src/features/auth` 내부 파일을 책임 단위 폴더로 재배치해 session / api / nickname / profile / mock 경계를 더 명확하게 만든다.

# 범위

- `src/features/auth/**`
- 관련 import를 사용하는 `src/pages/**`, `src/features/**`, `src/test/**`
- auth 테스트 파일 위치 재정리

# 제외 범위

- access token / refresh token 정책 변경
- 세션 만료 UX 변경
- nickname validation 규칙 변경
- mock auth 동작 변경

# 완료 기준

- `auth` 내부 파일이 책임 단위 폴더로 재배치된다.
- 테스트 파일은 대상 코드와 같은 폴더 또는 인접 폴더에 유지된다.
- 기능 변화 없이 import 경로만 안정적으로 갱신된다.
- 관련 Vitest, lint, build가 통과한다.

# 타깃 파일

- `src/features/auth/**`
- `src/pages/**` 중 auth import 경로를 가진 파일
- `src/features/**` 중 auth import 경로를 가진 파일
- `src/test/**` 중 auth import 경로를 가진 파일

# 검증 계획

1. `npx vitest run src/features/auth`
2. `npm run lint -- src/features/auth src/pages src/features src/test`
3. `npm run build`

# 리스크

- `store.ts`, `types.ts`, `useAuthBootstrap.ts`는 앱 전역 import가 많아 경로 누락이 생기기 쉽다.
- `nickname` 관련 훅은 validation / api / mockApi에 걸쳐 있어 과하게 쪼개면 오히려 시점 이동이 늘 수 있다.
- refresh token 도입이나 세션 만료 UX 작업과 섞이면 구조 정리 PR의 목적이 흐려질 수 있다.
