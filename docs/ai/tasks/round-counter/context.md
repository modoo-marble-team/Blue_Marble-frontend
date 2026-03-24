# round-counter — Context

## 배경

- `GameSnapshot.round`는 서버에서 매 스냅샷마다 내려오는 현재 라운드 번호다.
- 기존에 `GamePage.tsx`에서 `round`를 store에서 읽고 있었으나 1라운드 안내 문구 숨기기 용도로만 사용했다.
- `GameBoard.tsx`의 `board-status` 배너는 현재 플레이어 상태(섬/대기/파산)만 표시했다.

## 변경 동기

플레이어가 게임 중 현재 몇 라운드인지 알 수 없어서, 매 턴 전환 시 보드 위 알람에 라운드 번호를 추가한다.
