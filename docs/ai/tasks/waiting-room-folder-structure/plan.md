# 목표

`src/pages/waiting-room` 내부 파일을 책임 단위 폴더로 재배치해 page / controller / api / socket / mock 경계를 더 명확하게 만든다.

# 범위

- `src/pages/waiting-room/**`
- 관련 import를 사용하는 `src/pages/lobby/**`, `src/features/presence/**`, `src/mocks/**`
- waiting-room 테스트 파일 위치 재정리

# 제외 범위

- waiting-room 기능 동작 변경
- 준비/시작/퇴장 정책 변경
- socket payload/contract 변경
- `presence` 구조 추가 개편

# 완료 기준

- `WaitingRoomPage`, `controller`, `api`, `socket/mock` 관련 파일이 기능별 폴더로 재배치된다.
- 테스트 파일은 대상 코드와 같은 폴더 또는 인접 폴더에 유지된다.
- 기능 변화 없이 import 경로만 안정적으로 갱신된다.
- 관련 Vitest, lint, build가 통과한다.

# 타깃 파일

- `src/pages/waiting-room/**`
- `src/pages/lobby/**` 중 waiting-room import 경로를 가진 파일
- `src/features/auth/mock/session.ts`
- `src/mocks/handlers.ts`

# 검증 계획

1. `npx vitest run src/pages/waiting-room src/pages/lobby/LobbyPage.test.tsx`
2. `npm run lint -- src/pages/waiting-room src/pages/lobby`
3. `npm run build`

# 리스크

- waiting-room은 lifecycle / cleanup / socket sync가 강하게 연결돼 있어 경로 변경 중 import 누락이 생기기 쉽다.
- `vi.mock()` 경로와 dynamic import 경로가 실제 이동과 같이 바뀌지 않으면 테스트만 깨질 수 있다.
- `mockGateway`, `mockSeed`, `socket`, `api`는 서로 순환 의존처럼 보이는 경계가 있어 과한 공통화는 피해야 한다.
