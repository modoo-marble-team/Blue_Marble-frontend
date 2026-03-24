# game-ux-improvements — Checklist

## 구현

- [ ] `IslandModal.tsx`에 무인도 더블 탈출 안내 문구 추가
- [ ] `GameBoard.tsx`의 턴 변경 알림 중 `$round라운드`를 `$round/20라운드`로 표시 변경
- [ ] `GamePage.tsx`의 `GAME_START_NOTICE`를 `(1/20 라운드)` 포함 형식으로 변경
- [ ] `GameBoard.tsx`에서 `fromIndex === 20` 조건 시 이동 애니메이션 대기시간(`stepDelayMs` 등) 단축 반영
- [ ] `TODO.md`에 task 등록 및 연결

## 검증

- [ ] `npm run lint` 통과 확인
- [ ] `npm run build` 스립트 실행 패스 확인
- [ ] E2E 등 관련 리그레션 테스트 확인 (기존 기능 깨짐 방지)
