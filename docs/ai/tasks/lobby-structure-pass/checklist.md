# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] `LobbyPage.tsx`의 주요 책임과 관련 hook 경계를 확인했다
- [ ] 페이지에 남길 책임과 이동 후보 책임을 구체적으로 분류한다
- [ ] 최소 범위 리팩터링 방향을 확정한다
- [ ] mock/real socket 동작과 DM 정책이 그대로 유지되는지 확인한다
- [ ] hook 반환 형태와 room join / DM open 흐름을 깨지 않도록 구현한다

## Testing

- [ ] `src/pages/lobby/LobbyPage.test.tsx` 기준 회귀 포인트를 다시 확인한다
- [ ] 필요 시 로컬 상태 분리로 인해 관련 테스트를 보강한다
- [ ] `npm run ai:check:lobby`
- [ ] 필요 시 `npm run ai:check:chat-e2e`
- [ ] 필요 시 `npm run lint`

## Review

- [ ] `docs/rules.md` 기준으로 `R2`, `R3`, `R5`, `U3`가 실제로 개선됐는지 본다
- [ ] 페이지가 의도를 드러내고, 세부 정책은 hook/controller에 남아 있는지 확인한다
- [ ] mock side effect, logout, navigate, modal 흐름이 여전히 일관적인지 확인한다
- [ ] 변경 파일 / 실행한 검증 / 남은 리스크를 정리한다
