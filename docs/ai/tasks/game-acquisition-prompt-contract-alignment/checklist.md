# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] backend canonical acquisition 계약을 범위 문서에 반영했다
- [x] `promptModalMapping` acquisition 분류를 exact type 기준으로 축소했다
- [x] acquisition confirm/cancel fallback choice 전송을 막았다
- [x] `GameBoard` 회귀 테스트로 acquisition modal 경계를 검증했다

## Testing

- [x] `npx vitest run src/components/game/modals/promptModalMapping.test.ts src/components/board/GameBoard.test.tsx`
- [x] `npm run lint`
- [x] `npm run ai:check:game`
- [x] `npm run build`

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] prompt canonical contract가 UI heuristic보다 우선하는지 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- game-acquisition-prompt-contract-alignment` 출력이 현재 상태와 맞는다
- [x] `npm run ai:self-review -- --files ...`를 실행했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
