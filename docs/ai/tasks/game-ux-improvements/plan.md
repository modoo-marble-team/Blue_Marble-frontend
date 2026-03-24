# game-ux-improvements — Plan

## 목표

사용자 경험 향상을 위해 3가지 변경 사항을 적용한다.

1. 무인도 팝업에 탈출 힌트 문구를 추가한다.
2. 보드판 내 라운드 표시와 게임 시작 텍스트에 전체 라운드 모수(20라운드)를 표기한다.
3. 우주여행(타일 20)에서 출발하는 경우 이동 애니메이션 속도를 대폭 단축하여 게임 진행 속도를 높인다.

## 변경 범위

- `src/components/game/modals/IslandModal.tsx`
  - `description`에 `주사위에서 더블이 나오면 무인도에서 빠져 나올수 있습니다.` 문구 추가
- `src/pages/GamePage.tsx`
  - `GAME_START_NOTICE`를 `'게임 시작! 순서를 정했습니다. (1/20 라운드)'`로 수정
- `src/components/board/GameBoard.tsx`
  - 알람 텍스트 `roundLabel`을 `${round}/20라운드` 형태로 수정
  - `PLAYER_MOVED` 이벤트 파트에서 `fromIndex === 20` 일 경우 `stepDelayMs`를 80, `initialDelayMs`를 200, `endDelayMs`를 100으로 줄여 애니메이션 단축

## 설계 결정

- 최대 라운드는 서버 상태에 없으므로 클라이언트에서 20라운드로 하드코딩 표기한다.
- 애니메이션 속도 제어는 기존 `movePlayerSequentially`의 옵션을 활용하여 타일 간 이동 딜레이를 줄임으로써 구현한다 (우주여행 출발 판별: `fromIndex === 20`).
- 무인도 탈출 규칙은 UI로만 안내하며 룰 자체는 서버 권한이므로 클라이언트 로직을 건드리지 않는다.
