# Plan: Dice Popup Refactor

## 1. 컴포넌트 리팩토링 (`DoubleDicePopup.tsx`)

- [x] 컴포넌트 이름을 `DiceTimerModal`에서 `DoubleDicePopup`으로 변경
- [x] 타이머 관련 Props (`variant`, `timeLeftSec`, `confirmLabel`, `isSubmitting`) 제거
- [x] 타입 정의 업데이트 (`DoubleDicePopupProps`)
- [x] UI 텍스트 업데이트: "주사위 더블!" 타이틀 및 "한 번 더 던질 수 있습니다" 안내 메시지 추가
- [x] `extraRollCount`를 기반으로 동적 메시지 생성 로직 구현

## 2. 게임 보드 연동 및 정리 (`GameBoard.tsx`)

- [x] 새 팝업 컴포넌트 임포트 및 적용
- [x] `isDiceTimerPromptOpen`, `promptTimerLeftSec` 등 타이머 관련 상태 제거
- [x] `handleDiceTimerConfirm` 및 관련 효과(Effect) 제거
- [x] `doubleDiceModal` 상태를 사용하여 새 팝업에 `extraRollCount` 전달
- [x] `suppressDiceTimerModal` 등 불필요한 Props 및 변수 제거 (Lint 에러 해결)

## 3. 검증 계획

- [x] 컴포넌트 단위 코드 리뷰 (Props 및 로직의 단순화 확인)
- [x] `GameBoard.tsx` 내의 참조 오류 및 Lint 에러 해결 여부 확인
- [x] 빌드 및 린트 테스트 수행
