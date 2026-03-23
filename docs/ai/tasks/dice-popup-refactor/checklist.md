# Checklist: Dice Popup Refactor

## 구현 확인

- [x] `DoubleDicePopup.tsx`에서 타이머 관련 코드가 완전히 제거되었는가?
- [x] 더블 발생 시 "한 번 더 던질 수 있다"는 메시지가 포함되어 있는가?
- [x] `GameBoard.tsx`에서 `DiceTimerModal` 관련 참조가 모두 제거되었는가?
- [x] 불필요해진 변수 및 Props 정리가 완료되어 Lint 에러가 없는가?

## 검증 수행

- [x] `npm run lint` 통과
- [x] `npm run build` 통과 (계약/타입 변경 확인)
- [x] 수동 코드 리뷰를 통한 로직 무결성 확인
