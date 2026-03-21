# Game Over Return Flow

## 목표

- 게임 종료 후 결과 모달을 유지한 채, 확인 시 같은 `roomId`의 대기방으로 복귀시킨다.
- `GameBoard`가 직접 라우팅하지 않고 `GamePage`가 대기방/로비 이동을 결정하도록 정리한다.
- stale game fatal error fallback에서도 stale game store를 함께 정리한다.

## 작업 단계

1. `GameBoard` 결과 모달 확인 액션을 상위 콜백으로 위임한다.
2. 결과 모달 버튼 라벨을 `대기방으로 돌아가기`로 맞춘다.
3. `GamePage`에 종료 결과 확인 핸들러를 추가해 `roomId`가 있으면 `/rooms/:roomId`, 없으면 `/lobby`로 이동시킨다.
4. fatal game route error fallback에서 `resetGame()`도 함께 호출해 stale store를 남기지 않도록 한다.
5. 결과 확인 복귀/fatal fallback 회귀 테스트를 `GamePage.test.tsx`에 추가한다.
