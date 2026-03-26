# Context

## Current Behavior

- `promptModalMapping`은 acquisition prompt를 substring token과 choice 조합으로 넓게 추론한다.
- 이 경로 때문에 서버 canonical type이 아닌 prompt도 acquisition으로 분류될 수 있다.
- acquisition confirm/cancel choice는 현재 fallback index를 사용해 canonical choice가 없어도 첫 번째/두 번째 choice를 반환할 수 있다.

## Backend Contract Notes

- 랜드마크(`buildingLevel = 3`)는 backend에서 인수 불가다.
- 랜드마크에서는 `ACQUISITION_OR_SKIP` prompt가 아예 발송되지 않는다.
- frontend가 신뢰해야 할 canonical 기준은 `prompt.type === 'ACQUISITION_OR_SKIP'` 여부다.
- `choices`는 acquisition 가능 prompt에서 항상 `ACQUIRE` / `SKIP`로 고정이다.
- `payload.buildingLevel`은 UI 표시용 참고 데이터이며 acquisition 가능 여부의 판단 기준이 아니다.

## Related Files

- `src/components/game/modals/promptModalMapping.ts`
- `src/components/board/GameBoard.tsx`
- `src/components/board/GameBoard.test.tsx`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 서버 authoritative prompt 계약을 프론트에서 다시 계산하지 않는다.
- `GameBoard`는 raw transport 예외를 직접 해석하지 않고 normalized prompt를 렌더링한다.
- malformed acquisition prompt가 와도 프론트가 임의 fallback choice를 전송하지 않는다.

## Decision Notes

- acquisition modal 분류는 exact type match로 고정한다.
- acquisition confirm/cancel choice는 fallback index와 first-choice fallback을 모두 제거한다.
- malformed acquisition prompt는 자동 dismiss하지 않는다. 현재 null guard로 잘못된 submit만 막는다.

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/tasks/game-acquisition-prompt-contract-alignment/*`, `docs/ai/manuals/game-runtime.md`
- 바로 이어서 할 1개 단계: 없음
- pending decision / blocker: 없음
- 검증 재개 지점: `npx vitest run src/components/game/modals/promptModalMapping.test.ts src/components/board/GameBoard.test.tsx`, `npm run lint`, `npm run ai:check:game`, `npm run build`, `npm run ai:self-review -- --files ...` 실행 완료

## Open Risks

- 실서버 malformed acquisition prompt는 정상 경로가 아니므로, 이번 작업은 fallback submit 차단까지만 방어한다.
- mock runtime에는 acquisition prompt 생성 경로가 없어, 회귀는 unit/UI 테스트 중심으로 확인한다.
