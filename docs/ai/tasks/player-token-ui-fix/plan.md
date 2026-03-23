# plan

TODO line: `player-token-ui-fix`
Session brief: 플레이어 말 내부에 표시되던 id+1 숫자를 제거하는 순수 UI 수정

## 목표

`BoardTile.tsx`의 `PlayerToken` 컴포넌트에서 플레이어 번호 숫자 렌더링을 제거한다.

## 변경 범위

- `src/components/board/BoardTile.tsx` — PlayerToken 내 숫자 렌더링 조건식 제거
- 소켓·스토어·게임 로직 변경 없음
