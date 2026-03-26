# Context

## Current Behavior

- `GamePage`는 오른쪽 상단 absolute 영역에 `Pending action`, `Action acknowledged`, `lastError` 상태 박스를 항상 렌더링한다.
- 이 overlay는 개발 디버깅에는 유용하지만 최종 배포 화면에는 노출할 필요가 없다.
- fatal route error는 같은 `lastError` store를 사용하지만, 실제 fallback 렌더링은 overlay와 별도 분기다.

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/rules.md`
- `docs/testing.md`

## Decision Notes

- overlay는 완전히 제거하지 않고 dev에서만 유지한다.
- env 플래그는 `src/config/env.ts`에서 export해 `GamePage.test.tsx`에서 mock 가능하게 둔다.
- `lastError` store 구독과 fatal fallback 로직은 그대로 유지한다.

## Open Risks

- non-fatal error는 production에서 화면상으로 보이지 않으므로, 운영 중 즉시 가시성은 낮아진다.
- overlay 숨김은 UI 정책 변경일 뿐이라 socket/store 상태 자체는 계속 갱신된다.
