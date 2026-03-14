# Plan

## Task

- 작업 이름: Game prompt contract normalization
- 요청 날짜: Example
- 담당 범위: `game:prompt` payload 정규화, `gameId` canonical 처리, mock/real 계약 호환

## Why This Example Matters

- 이 예시는 단순 프론트 UI보다 한 단계 위의 "클라이언트 계약 설계" 능력을 보여준다.
- AI를 코드 생성기가 아니라 계약 해석과 정규화 절차를 따르는 작업자로 쓴다는 점이 드러난다.
- 채용자 입장에서는 타입 안정성, 어댑터 설계, 회귀 테스트 감각을 함께 볼 수 있다.

## Goal

- `game:prompt` 수신 시 `id/promptId`, `timeoutSec/timeoutMs`, choice shape 차이를 단일 정규화 경로로 흡수한다.
- `gameId` 없는 이벤트를 조용히 허용하지 않고 명시적 에러로 처리한다.
- mock runtime과 실제 runtime이 같은 prompt 소비 계약을 따르게 만든다.

## In Scope

- `game.handler.ts`의 prompt 정규화 규칙 정리
- `gameId` canonical 처리와 에러 경계 점검
- mock handler 계약과 테스트 보강
- prompt 관련 UI 소비 경로 영향 점검

## Out Of Scope

- 게임 보드 UI 리디자인
- 새로운 prompt 타입 추가
- 백엔드 스펙 변경 협의 자체

## Target Files

- `src/services/socket/game.handler.ts`
- `src/mocks/handlers/game.handler.ts`
- `src/mocks/handlers/game.handler.test.ts`
- `src/stores/game.store.ts`
- 필요 시 `src/components/game/modals/promptModalMapping.ts`

## Completion Criteria

- `game:prompt` payload 변형이 들어와도 store에는 하나의 canonical shape만 들어간다.
- `gameId` 누락 이벤트는 조용히 통과하지 않고 명시적 에러를 남긴다.
- mock 테스트가 canonical prompt 규칙을 검증한다.
- 관련 테스트와 build가 통과한다.

## Test Plan

- `npm run ai:check:game`
- `npm run ai:check:build`
- 필요 시 `npm run lint`
