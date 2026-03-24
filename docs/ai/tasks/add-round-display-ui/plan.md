# `add-round-display-ui` 작업 계획

## 배경

사용자가 주사위 버튼 위에 라운드 진행도를 시각적으로 명확하게 표시하는 UI를 추가해달라고 요청했습니다. 디자인은 제공된 이미지를 바탕으로 흰색 둥근 박스 형태이며, 서버의 `round` 데이터를 정적 상태로 표출합니다.

## 목표

1.  **디자인 구현**: `GamePage.tsx` 내에 `RollButton` 상단에 위치하는 라운드 배지 UI 구현.
2.  **데이터 동기화**: `game.store.ts`에서 `envelope.turn`을 `round`에 덮어쓰던 로직을 제거하여, 서버 상태 필드인 `round`가 독립적으로 패치되게 함.

## 변경 범위

- `src/pages/GamePage.tsx`: UI 레이아웃 및 스타일 추가
- `src/stores/game.store.ts`: 턴/라운드 연동 로직 수정
