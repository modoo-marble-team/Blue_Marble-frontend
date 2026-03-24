# sort-by-total-assets — Plan

## 목표

플레이어 패널 우측 순위 정렬과 왕관 아이콘 기준을 보유금(`money`)에서 총자산(`totalAssets = money + 건물 가치`)으로 변경한다.

## 변경 범위

- `src/pages/GamePage.tsx` — `playerTotalAssetsMap` useMemo 추가, 정렬·왕관 기준을 totalAssets로 교체

## 설계 결정

- `calcPlayerTotalAssets`는 기존 함수(`gameViewModel.ts`)를 그대로 사용한다.
- `useMemo`로 Map을 미리 계산해 정렬·왕관·렌더링 모두 재사용한다 (기존보다 중복 호출 감소).
- 파산 플레이어는 총자산 관계없이 항상 목록 하단에 배치하는 규칙은 유지한다.
