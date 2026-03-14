# Context

## Current Behavior

- 게임 런타임은 `game:*` 이벤트를 store 상태로 정규화해 UI에 전달한다.
- 현재 코드에는 `promptId`와 `id`, `timeoutSec`와 `timeoutMs`를 함께 수용하는 정규화 로직이 이미 존재한다.
- 이런 영역은 작은 예외를 UI에서 직접 처리하기 시작하면 빠르게 계약이 깨진다.

## Related Files

- `src/services/socket/game.handler.ts`
- `src/mocks/handlers/game.handler.ts`
- `src/mocks/handlers/game.handler.test.ts`
- `src/stores/game.store.ts`
- `src/components/game/modals/promptModalMapping.ts`
- `docs/game-delivery-roadmap.md`
- `docs/ai/manuals/game-runtime.md`

## Constraints

- 게임 런타임의 canonical identifier는 `gameId`다.
- prompt 정규화는 UI가 아니라 adapter 계층에서 끝내야 한다.
- mock runtime과 실제 runtime이 가능한 한 같은 payload shape를 따라야 한다.
- 서버 권위 상태를 다시 UI 로컬 로직으로 끌어오면 안 된다.

## Decision Notes

- "관대한 입력, 엄격한 내부 표현" 원칙을 따른다.
- payload 호환성은 허용하되, store에는 하나의 canonical shape만 저장한다.
- `gameId` 누락은 fallback으로 덮지 않고 early error로 다루는 방향을 우선한다.

## Open Risks

- 실서버 payload가 문서와 다르면 정규화 규칙이 더 필요할 수 있다.
- prompt choice 스키마가 새로 추가되면 mapping 테스트를 같이 확장해야 한다.
- `roomId`를 여전히 쓰는 채팅 경계와 게임 runtime 경계를 혼동할 수 있다.

## What This Shows In Review

- 타입/계약 문제를 UI 버그가 나기 전에 막는 방식
- mock과 real path를 같이 관리하는 습관
- 회귀 테스트를 계약 수준에서 설계하는 능력
