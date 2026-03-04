# 게임 영역 파일 소유권 및 분업 기준 (이벤트 명세서 반영)

이 문서는 새 `이벤트 명세서.md` 기준으로 FE-B와 FE-C의 게임 영역 책임을 다시 정리한 문서다.
기존 분업 문서는 구 소켓 이벤트 구조를 전제로 했기 때문에 이 문서로 대체한다.

## 1. 분업 원칙

- FE-B는 게임 계약, 상태, socket, prompt, mock을 책임진다.
- FE-C는 보드 렌더링, 애니메이션, 시각 상태 표현을 책임진다.
- 새 명세에서 결과 계산은 서버 권위이므로, FE-C가 게임 결과를 계산하는 구조는 금지한다.

## 2. FE-B 주 담당

아래 영역은 FE-B가 주도한다.

- `src/types/domain.ts`
- `src/stores/game.store.ts`
- `src/services/socket/game.handler.ts`
- `src/services/game/game.api.ts`
- `src/hooks/game/*`
- `src/mocks/handlers/game.handler.ts`
- `src/test/socketEmitter.ts`
- `src/pages/GamePage.tsx`
- `src/components/game/modals/*`

핵심 책임:

- `game:action`, `game:ack`, `game:patch`, `game:prompt`, `game:error`
- snapshot/patch/revision 처리
- prompt 응답과 timeout 처리
- mock과 실서버 계약 정렬

## 3. FE-C 주 담당

아래 영역은 FE-C가 주도한다.

- `src/components/board/*`
- `src/styles/board.css`
- 보드 화면의 애니메이션/시각 피드백

핵심 책임:

- 플레이어 말, 타일, 건물, 소유권 시각화
- patch events 기반 이동/도착/효과 연출
- snapshot/store 상태 기반 보드 렌더 안정화

## 4. 공동 관리

둘이 같이 맞춰야 하는 영역은 아래와 같다.

- store snapshot을 보드 view model로 바꾸는 기준
- prompt를 어떤 UI 표면으로 보여줄지에 대한 계약
- `playerState`, `buildingLevel`, `tileType`의 렌더 규칙

## 5. 현재 코드 기준 예외 구간

### `src/components/board/GameBoard.tsx`

이 파일은 현재 FE-B 책임과 FE-C 책임이 가장 많이 섞여 있다.

현재 들어 있는 FE-B 성격의 책임:

- REST 액션 호출
- 통행료 계산
- 파산 처리
- 턴 전환
- 타일 소유 상태의 로컬 진실 소스

정리 원칙:

- FE-B가 먼저 연동 로직을 바깥으로 뺀다.
- FE-C는 그 이후 `GameBoard.tsx`를 렌더/연출 중심 컴포넌트로 정리한다.
- 당분간 이 파일은 공동 정리 대상으로 본다.

## 6. 진행도 재평가

### FE-B 진행도: 55%

이 수치는 "게임 UI가 어느 정도 있다"가 아니라 "새 이벤트 명세를 실제로 소화할 수 있는가" 기준이다.

완료된 것:

- 게임 store 골격
- 페이지/모달/턴 UI 기본 자산
- socket 연결과 mock 기본 토대

남은 것:

- 새 타입 계약
- patch/snapshot/revision store
- prompt/ack 기반 입력 UX
- 구 REST/구 이벤트 제거
- mock 전환

### FE-C 진행도: 45%

완료된 것:

- 보드 배치와 기본 시각화
- 말/타일/건물 렌더 뼈대

남은 것:

- store 단일 상태 렌더
- event queue 기반 연출
- `GameBoard.tsx` 로직 제거
- 새 building/player state 시각 규칙 반영

## 7. 작업 충돌 방지 규칙

### FE-B 작업 시

- 보드 파일을 건드리더라도 계약 제거와 상태 이관까지만 한다.
- 보드 스타일과 시각 디테일을 임의로 바꾸지 않는다.

### FE-C 작업 시

- 새 socket 이벤트나 store 계약을 독자적으로 만들지 않는다.
- 서버 권위 계산을 보드 내부에 다시 넣지 않는다.

## 8. 최종 목표

- FE-B: 새 이벤트 명세를 store와 socket 계층에서 안정적으로 흡수
- FE-C: 그 상태를 보드에서 정확하고 자연스럽게 연출
- 둘 사이 경계는 "계약/상태"와 "표현/연출"로 나눈다
