# sell-modal-server-driven — Checklist

## 구현

- [ ] `GameBoard.tsx`에서 `handleTileClick` 내 `handleTileSellClick(tileId)` 호출 제거
- [ ] `GameBoard.tsx`에서 `handleCityBuildConfirm`, `handleCityBuildCancel` 내 `handleTileSellClick(tileId)` 호출 제거
- [ ] `GamePage.tsx`에서 `RoomChat` `notice` prop에 `게임 시작! 순서를 정했습니다. (${round ?? 1}/20 라운드)` 영구 표시
- [ ] `TODO.md`에 해당 task slug 추가 및 상태 업데이트

## 검증

- [ ] `npm run lint` 통과
- [ ] 로컬 테스트/CI로 기존 테스트코드 깨짐 없는지 확인
