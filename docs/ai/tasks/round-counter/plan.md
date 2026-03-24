# round-counter — Plan

## 목표

보드판 위 상태 알람(`board-status`)에 현재 라운드 번호를 표시한다.

## 변경 범위

- `src/components/board/GameBoard.tsx` — `round?: number` prop 추가, status 알람 텍스트에 `· N라운드` 포함
- `src/pages/GamePage.tsx` — store에서 읽던 `round`를 `<BoardGame>`에 전달

## 설계 결정

- `round`는 서버 `GameSnapshot`에 이미 포함된 값으로, 클라이언트 store에 `s.round`로 존재한다.
- `maxRound`는 서버 snapshot에 미포함이므로 `N/MAX` 형태는 보류한다.
- prop을 optional로 두어, 서버가 round를 생략하면 라운드 표시를 graceful하게 생략한다.
