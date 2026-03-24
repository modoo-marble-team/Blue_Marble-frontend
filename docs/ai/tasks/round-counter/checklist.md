# round-counter — Checklist

## 구현

- [x] `GameBoardProps`에 `round?: number` 추가
- [x] `GameBoard` 구조분해에 `round` 추가
- [x] 턴 변경 `useEffect`에서 `roundLabel` 계산 후 status에 포함
- [x] `useEffect` 의존성 배열에 `round` 추가
- [x] `GamePage.tsx`에서 `<BoardGame round={round} />` 전달

## 검증

- [x] `npm run lint` 통과
- [x] pre-push: `npm run build` 통과
- [x] pre-push: `npm run e2e:ci` 3건 통과
