# sell-modal-server-driven — Plan

## 목표

1. 사용자가 타일을 클릭하거나 건설/취소 시 로컬에서 무조건 강제로 띄우던 매각 모달(`CitySellModal`) 호출 로직을 제거하여, 서버 프롬프트(`SELL_OR_BANKRUPT` 등)가 있을 때만 모달이 뜨도록 서버 드리븐 방식으로 복원한다.
2. 게임 우측 채팅방 상단의 '게임 시작...' 공지 메시지가 라운드가 지나도 사라지지 않고, 현재 라운드에 맞춰 `(N/20 라운드)` 형태로 계속 갱신 및 표시되도록 한다.

## 변경 범위

- `src/components/board/GameBoard.tsx`
  - `handleTileClick` 내 본인 소유 땅 클릭 시 `handleTileSellClick` 강제 호출 제거
  - `handleCityBuildConfirm`, `handleCityBuildCancel` 내 건설/취소 후 `handleTileSellClick` 강제 호출 제거
  - `isOwnedTileSellClickable` 로직 제거 혹은 항상 `false` 처리 (더 이상 로컬 클릭 매각 기능 미사용)
- `src/pages/GamePage.tsx`
  - `<RoomChat notice={...} />` 부분에서 `round > 1 ? undefined : ...` 처리 제거
  - `notice` 문자열을 동적으로 생성하여 `${round}/20 라운드` 갱신

## 검증 계획

- `npm run lint` 및 빌드 확인
- 유닛 테스트 및 E2E 테스트 통과 확인
