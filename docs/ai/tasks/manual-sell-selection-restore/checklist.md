# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] `GameBoard` owned-tile click 수동 매각 경로를 복구했다
- [x] prompt/travel 경계에서는 로컬 sell modal이 열리지 않게 유지했다
- [x] `SELL_PROPERTY` emit 경로를 기존 계약과 동일하게 유지했다

## Testing

- [x] `npx vitest run src/components/board/GameBoard.test.tsx src/components/board/gameBoardActionHandlers.test.ts`
- [x] `npm run lint`
- [x] `npm run ai:check:game`
- [x] `npm run build`

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] prompt-driven sell과 local manual sell의 우선순위가 충돌하지 않는지 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- manual-sell-selection-restore` 출력이 현재 상태와 맞는다
- [x] `npm run ai:self-review -- --files ...`를 실행했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
