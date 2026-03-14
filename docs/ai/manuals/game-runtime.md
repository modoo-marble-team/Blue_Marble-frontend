# Game Runtime Manual

이 manual은 아래 범위를 수정할 때 읽는다.

- `src/pages/GamePage.tsx`
- `src/components/game/**`
- `src/components/board/**`
- `src/hooks/game/**`
- `src/services/socket/game.handler.ts`
- `src/stores/game.store.ts`
- `src/mocks/handlers/game.handler.ts`
- 게임 소켓 계약 관련 `docs/game-*.md`

## 1. 이 영역의 역할

게임 런타임은 보드 UI가 아니라 서버 권위 상태를 렌더링하고 입력을 전달하는 계층이다.
핵심은 아래 세 가지다.

- `game:*` 소켓 계약을 store 상태로 정규화
- store 상태를 보드/패널/UI에 렌더링
- prompt, ack, patch 흐름을 사용자 입력과 연결

즉, 로컬 편의 로직을 쉽게 넣을 수 있는 영역이지만, 서버 권위 모델을 깨기 가장 쉬운 영역이기도 하다.

## 2. 현재 구조 기준

- `GamePage.tsx`
  - store 구독, prompt 처리, 채팅 연결, 화면 조합 담당
- `src/services/socket/game.handler.ts`
  - `gameId` 해석, ack/patch/prompt/error 정규화, mock/real 경로 분기 담당
- `src/stores/game.store.ts`
  - 런타임 단일 상태 저장소
- `src/mocks/handlers/game.handler.ts`
  - 로컬 mock runtime 계약
- `src/hooks/game/*`
  - 주사위, 턴, 타이머 등 UI 보조 로직

## 3. 꼭 지켜야 할 규칙

- 게임 런타임의 canonical identifier는 `gameId`다.
- `roomId`는 대기방에서 게임으로 넘어오는 브리지나 채팅 경계에서만 제한적으로 남긴다.
- 새 게임 이벤트/상태 변경은 `game.handler.ts` 같은 adapter 계층에 모으고, UI에서 즉흥 변환을 늘리지 않는다.
- prompt 정규화, phase 정규화, ack 처리 규칙은 한 곳에서 관리한다.
- mock handler와 실제 handler는 가능한 한 같은 payload shape를 공유해야 한다.
- 서버 권위 로직을 `GameBoard`나 UI 컴포넌트에 다시 넣지 않는다.
- 게임 채팅은 현재 `chat` 이벤트와 `roomId`를 사용하므로, 이 경계는 대기방 채팅과 함께 검토한다.

## 4. 관련 문서

- `docs/game-delivery-roadmap.md`
- `docs/game-ownership.md`
- `docs/game-ownership-corrected-table.md`
- 필요 시 `docs/socket-mock-server.md`

게임 계약을 건드릴 때는 문서 우선순위와 `gameId` canonical 정책을 확인한다.

## 5. 테스트 기준

이 영역 수정 시 우선 검토할 테스트:

- `src/mocks/handlers/game.handler.test.ts`
- `src/stores/game.store.test.ts`
- `src/hooks/game/useDiceRoll.test.ts`
- `src/components/game/modals/promptModalMapping.test.ts`

계약/타입/렌더링 경로를 건드렸으면 `npm run build`도 함께 실행한다.

## 6. 변경 전 체크 질문

- 이 변경이 서버 권위 모델을 약화시키지 않는가?
- `gameId` 없이 동작하는 새 예외 경로를 만들고 있지 않은가?
- mock runtime과 실제 runtime 사이에 payload 차이를 새로 만들지 않았는가?
- prompt/ack/patch 처리 위치가 UI로 새지 않았는가?
- 보드가 상태를 계산하는가, 아니면 상태를 렌더링하는가?
