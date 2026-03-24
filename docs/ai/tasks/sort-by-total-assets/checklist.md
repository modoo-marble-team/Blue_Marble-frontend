# sort-by-total-assets — Checklist

## 구현

- [x] `playerTotalAssetsMap` useMemo 추가 (`boardPlayers`, `storePlayers`, `storeTiles` 의존)
- [x] `maxTotalAssets` 계산 (`playerTotalAssetsMap.values()` 기준)
- [x] `.map()` 단계에서 `totalAssets`를 각 player 객체에 주입
- [x] `.sort()` 기준을 `left.money` → `left.totalAssets`로 교체
- [x] `isRichest` 기준을 `player.money === maxMoney` → `player.totalAssets === maxTotalAssets`로 교체
- [x] `PlayerPanel`의 `totalAssets` prop을 미리 계산된 값으로 전달 (중복 계산 제거)

## 검증

- [x] `npm run lint` 통과
