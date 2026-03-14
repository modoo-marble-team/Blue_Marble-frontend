# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] `gameId` canonical, prompt adapter 우선 원칙을 고정했다
- [ ] prompt 정규화가 한 경로에서 끝나는지 다시 점검한다
- [ ] mock handler와 실제 handler의 payload 차이를 줄인다
- [ ] UI가 raw payload 예외를 직접 다루지 않는지 확인한다

## Testing

- [ ] `src/mocks/handlers/game.handler.test.ts`를 보강한다
- [ ] 필요 시 `src/components/game/modals/promptModalMapping.test.ts`도 확인한다
- [ ] `npm run ai:check:game`
- [ ] `npm run ai:check:build`

## Review

- [ ] canonical prompt shape가 store에만 들어가는지 확인한다
- [ ] `gameId` 누락 이벤트가 조용히 통과하지 않는지 확인한다
- [ ] mock/real runtime 차이로 새 회귀가 생기지 않는지 확인한다
- [ ] 변경 파일 / 실행한 검증 / 남은 리스크를 정리한다
