# 목표

`src/features/presence` 내부 파일을 기능 단위 폴더로 재배치해 가독성과 응집도를 높인다.

# 범위

- `src/features/presence/**`
- 관련 import를 사용하는 `src/pages/lobby/**`, `src/pages/waiting-room/**`, `src/test/**`, `src/mocks/**`
- 대상 코드와 가까운 테스트 파일 위치 재정리

# 제외 범위

- DM unread 정책 변경
- socket payload/contract 변경
- lobby / waiting-room 기능 동작 변경
- 전역 `src/test/**` 공용 helper 구조 개편

# 완료 기준

- `presence` 내부 파일이 아래 기능 단위 폴더로 재배치된다.
  - `online-users/`
  - `direct-message/`
  - `mock/`
  - `components/`
- 테스트 파일은 대상 코드와 같은 폴더 또는 인접 폴더에 유지된다.
- 기능 동작은 바꾸지 않고 import 경로만 안정적으로 갱신된다.
- 관련 Vitest, lint, build가 통과한다.

# 타깃 파일

- `src/features/presence/**`
- `src/pages/lobby/LobbyPage.tsx`
- `src/pages/lobby/LobbyPage.test.tsx`
- `src/pages/waiting-room/**`
- `src/mocks/handlers.ts`
- `src/test/fixtures/presence.ts`

# 검증 계획

1. `npx vitest run src/features/presence src/pages/lobby/LobbyPage.test.tsx src/pages/waiting-room/WaitingRoomPage.test.tsx src/pages/waiting-room/WaitingRoomFlow.test.tsx src/pages/waiting-room/controller`
2. `npm run lint -- src/features/presence src/pages/lobby src/pages/waiting-room src/mocks/handlers.ts src/test/fixtures/presence.ts`
3. `npm run build`

# 리스크

- 파일 이동이 많아 import 누락이 생기기 쉽다.
- mock/real 경로를 둘 다 사용하는 presence 특성상, 상대 경로 변경 중 socket/mock import가 빠지면 회귀가 생길 수 있다.
- 테스트 파일 이동으로 mock 경로(`vi.mock`)가 함께 깨질 수 있다.
