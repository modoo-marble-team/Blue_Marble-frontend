# 게임 영역 파일 소유권 및 분업 기준 (중앙 docs 반영)

이 문서는 중앙 문서 저장소 `https://github.com/modoo-marble-team/docs`의
`gamesocket.md`, `api.md`, `erd.md`를 목표 기준으로 삼되,
`모두의마블_API명세서_v4.xlsx`, `모두의마블_요구사항정의서_v8.xlsx`,
`모두의마블_테이블명세서_v4.xlsx`와 충돌하는 영역은 호환 계층까지 포함해 FE-B/FE-C 책임을 다시 정리한 문서다.

## 1. 분업 원칙

- FE-B는 게임 계약, 상태, socket, prompt, mock을 책임진다.
- FE-B는 기존 계약과 새 계약 사이의 compatibility layer도 책임진다.
- FE-C는 보드 렌더링, 애니메이션, 시각 상태 표현을 책임진다.
- 중앙 docs 기준으로 결과 계산은 서버 권위이므로, FE-C가 게임 결과를 계산하는 구조는 금지한다.

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
- 실제 UI에서 `prompt`, `ack`, `pendingAction`, `error`를 소비하는 연결
- mock과 실서버 계약 정렬
- `roomId <-> gameId` 매핑
- money canonical unit 정리와 transport 간 변환
- 레거시 REST/socket fallback 유지와 제거 시점 관리

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
- transport enum과 현재 보드 enum 간 매핑 결과

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

### FE-B 현재 단계

완료된 것:

- 새 이벤트 계약용 타입/store/socket/mock 골격 반영
- `GamePage.tsx`의 store 단일 상태 렌더 구조 1차 정리
- `GameBoard.tsx` 내부 액션/동기화/거래 로직 분리 착수

남은 것:

- `prompt/ack/error/pendingAction`의 실제 UI 연결
- `game:prompt_response` 기반 사용자 응답 흐름 정리
- 남아 있는 게임 REST fallback 추가 축소
- `gameId` 중심 식별자 정리
- money unit, tile/building enum 기준 문서와 코드의 최종 정렬

### FE-C 현재 단계

핵심 남은 것:

- 보드 표현/연출 레이어 정리
- `eventQueue` 기반 이동/효과 재생
- `GameBoard.tsx`의 로컬 게임 로직 추가 축소
- 새 building/player state 시각 규칙 반영

## 7. 현재 다음 우선순위

중앙 docs와 현재 코드 상태 기준으로, FE-B의 다음 작업은 `prompt/ack` UI 연결이다.

- `src/components/game/modals/*`
  - `gameStore.prompt`를 실제 modal 열림 조건과 연결
- `src/pages/GamePage.tsx`
  - `pendingAction`, `lastAck`, `lastError`를 버튼/상태 문구/실패 메시지와 연결
- `src/components/board/GameBoard.tsx`
  - 기존 로컬 modal 분기를 `game:prompt` 소비 구조로 전환
- `src/services/socket/game.handler.ts`
  - `emitPromptResponse`가 실사용 UI 흐름에서 호출되도록 정리

## 8. 작업 충돌 방지 규칙

### FE-B 작업 시

- 보드 파일을 건드리더라도 계약 제거와 상태 이관까지만 한다.
- 보드 스타일과 시각 디테일을 임의로 바꾸지 않는다.

### FE-C 작업 시

- 새 socket 이벤트나 store 계약을 독자적으로 만들지 않는다.
- 서버 권위 계산을 보드 내부에 다시 넣지 않는다.

## 9. 최종 목표

- FE-B: 새 이벤트 명세를 store와 socket 계층에서 안정적으로 흡수
- FE-C: 그 상태를 보드에서 정확하고 자연스럽게 연출
- 둘 사이 경계는 "계약/상태"와 "표현/연출"로 나눈다
