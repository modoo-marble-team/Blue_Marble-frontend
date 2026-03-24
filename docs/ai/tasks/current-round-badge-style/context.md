# Context

## Current Behavior

- `src/pages/GamePage.tsx`는 우측 하단 HUD에 현재 라운드 뱃지를 직접 렌더링한다
- 기존 뱃지는 카드형 박스에 `1/20 round`를 크게 표시해 주변 HUD 대비 다소 무겁고 시선이 튀는 인상이 있었다
- 이번 변경은 라운드 숫자를 중심에 두고 `/ 20`, `Round`를 보조 정보로 재배치해 더 자연스럽게 읽히도록 조정한다

## Related Files

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`
- `src/pages/GamePage.tsx`
- `TODO.md`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`

## Constraints

- 라운드 값은 기존 store 구독값(`round ?? 1`)을 그대로 사용한다
- `GamePage.tsx`의 게임 채팅, prompt, fallback, runtime 상태 흐름은 건드리지 않는다
- UI 렌더링 경로 변경이므로 game-runtime high-risk 분류에 맞는 검증과 문서 근거를 남긴다

## Decision Notes

- rounded rectangle 대신 rounded-full badge로 바꿔 HUD 칩처럼 보이게 했다
- 강조 색상은 숫자에 집중하고 `/ 20`, `Round`는 보조 톤으로 내려 정보 우선순위를 분명히 했다
- 라운드 계산 로직을 따로 분리하거나 새 컴포넌트로 추출하는 대안은 이번 범위가 단일 스타일 조정이라 제외했다

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/manuals/game-runtime.md`, `src/pages/GamePage.tsx`, 이 task 문서 3종
- 바로 이어서 할 1개 단계: 필요하면 PR 리뷰 의견에 맞춰 HUD 스타일만 추가 보정한다
- pending decision / blocker: 없음
- 검증 재개 지점: `npm run ai:check:game`

## Open Risks

- `src/pages/GamePage.test.tsx`의 기존 `act(...)` 경고는 이번 변경과 무관하게 계속 출력된다
- 스타일 변경이지만 `GamePage.tsx` 경로 특성상 build 및 game check 결과를 PR 본문에 분명히 남겨야 한다
