# sort-by-total-assets — Context

## 배경

- 기존 `GamePage.tsx`는 `player.money`(보유금)만 기준으로 순위를 정렬하고 왕관을 표시했다.
- 실제 블루마블 게임에서 순위는 보유금 + 건물 자산을 합산한 총자산 기준이 맞다.
- `calcPlayerTotalAssets`는 이미 구현되어 있었으나 `PlayerPanel` 표시용으로만 사용되고 있었다.

## 문제

- 건물을 많이 사서 보유금이 적은 플레이어가 실제로 부자임에도 순위에서 밀림.
- 왕관이 보유금 기준이므로 틀린 플레이어에게 왕관이 표시되는 현상 발생.
