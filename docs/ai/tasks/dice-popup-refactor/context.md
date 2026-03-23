# Context: Dice Popup Refactor

## 목적

- `DiceTimerModal`을 `DoubleDicePopup`으로 개편하여 주사위 타이머 로직을 제거하고 주사위 더블 알림 전용 UI로 변경합니다.
- 사용자 경험(UX) 관점에서 주사위 더블 시 "한 번 더 던질 수 있음"을 명확히 안내합니다.
- `GameBoard.tsx` 내의 불필요한 타이머 관련 상태와 로직을 제거하여 코드 복잡도를 낮추고 lint 에러를 해결합니다.

## 배경

- 기존 `DiceTimerModal`은 주사위 선택 타이머 종료 알림과 주사위 더블 알림의 책임을 동시에 가지고 있었습니다.
- 주사위 타이머 기능이 정책상 제외됨에 따라, 해당 기능을 제거하고 더블 알림 기능만 남기기로 결정되었습니다.

## 주요 변경 범위

- `src/components/game/modals/DoubleDicePopup.tsx` (Refactored from `DiceTimerModal.tsx`)
- `src/components/board/GameBoard.tsx` (Usage and cleanup)
