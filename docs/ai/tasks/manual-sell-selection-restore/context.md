# Context

## Current Behavior

- `GameBoard`는 현재 `canManageOwnAssets`를 계산하지만, `isOwnedTileSellClickable`를 항상 `false`로 두고 있다.
- `handleBoardTileClick`는 travel 선택만 처리하고, 본인 소유 타일 클릭 시 로컬 sell modal을 열지 않는다.
- `CitySellModal`과 `handleCitySellConfirm` 자체는 남아 있어, 서버 sell prompt 또는 로컬 modal open 상태에서 `SELL_PROPERTY` emit은 여전히 가능하다.

## Related Files

- `src/components/board/GameBoard.tsx`
- `src/components/board/gameBoardActionHandlers.test.ts`
- `docs/ai/tasks/sell-modal-server-driven/*`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 서버 authoritative prompt/state machine은 유지한다.
- `SELL_PROPERTY` payload shape와 prompt response shape는 바꾸지 않는다.
- prompt visible 상태에서는 로컬 sell modal을 열지 않는다.
- travel selection active 상태에서는 travel destination 선택이 우선한다.

## Decision Notes

- 수동 매각은 `allowAssetActions + isAssetActionPhase` 경계 안에서만 복구한다.
- 로컬 수동 매각은 보조 UX이고, 강제 매각/파산 흐름은 계속 서버 prompt가 canonical이다.
- build cancel 후 auto reopen 같은 과거 동작은 복구하지 않는다.

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/tasks/manual-sell-selection-restore/*`, `docs/ai/manuals/game-runtime.md`
- 바로 이어서 할 1개 단계: 없음
- pending decision / blocker: 없음
- 검증 재개 지점: `npx vitest run src/components/board/GameBoard.test.tsx src/components/board/gameBoardActionHandlers.test.ts`, `npm run lint`, `npm run ai:check:game`, `npm run build`, `npm run ai:self-review -- --files ...` 실행 완료

## Open Risks

- 실서버가 특정 phase에서 `SELL_PROPERTY`를 거부하면, 로컬 수동 매각 modal은 열리더라도 ack 에러 UX가 필요할 수 있다.
- 현재 보드 테스트는 수동 매각 open/confirm, prompt 차단, travel 우선 경로까지 추가했지만, 실서버 ack 에러 표시까지는 다루지 않는다.
