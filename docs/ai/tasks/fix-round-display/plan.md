## 📝 작업 내용

1. **`turn` 상태 분리 및 명명 최적화**
   - 현재 서버는 `game:patch` 봉투의 `turn` 필드로 진행도를 보냅니다. `game.store.ts`에서는 `envelope.turn`을 받아서 `draft.round`에 덮어 쓰고 있었습니다.
   - 라운드와 턴을 개념적으로 분리하거나 변경하기 위해, `GameState`에 새로운 `turn: number | null` 속성을 추가하고 패치를 받은 `turn`이 이곳에 기록되도록 변경합니다. (또는 기존 round 속성을 turn으로 변경합니다).
2. **화면 표시 변경**
   - `GamePage.tsx`, `GameBoard.tsx` 내의 UI 텍스트 부분에서, 기존 `round`를 사용하던 곳을 서버가 보낸 `turn` 값을 사용하도록 교체합니다.

---

## 🔬 변경 영향도

- GameBoard.tsx
- GamePage.tsx
- src/types/domain.ts 의 파서 및 스키마
- src/stores/game.store.ts 의 수신 로직

---

## 🧪 실행할 검증

- `npm run lint` 통과 확인
- `npm run test` 통과 확인
- mock-socket-server 상에서 턴 동작 점검 (단, mock server는 `round` 단위로 동작하는 부분이 있으므로 관련 핸들러 갱신)
