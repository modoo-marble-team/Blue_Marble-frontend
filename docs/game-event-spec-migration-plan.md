# 게임 이벤트 명세 전환 갭 분석

이 문서는 `이벤트 명세서.md` 기준으로 현재 프론트엔드 코드에서 어디를 어떻게 고쳐야 하는지 파일 단위로 정리한 문서다.

## 1. 핵심 결론

현재 구현은 아래 구조를 전제로 한다.

- 액션: REST `buy/build/sell/state`
- 실시간 반영: `game_start`, `turn_start`, `dice_rolled`, `player_moved` 등 개별 소켓 이벤트
- 보드 계산: `GameBoard.tsx` 내부 로컬 계산과 상태 갱신

새 명세는 아래 구조를 요구한다.

- 액션: `game:action`
- 동기화: `game:sync`
- 상태 반영: `game:patch`
- 개인 선택: `game:prompt` / `game:prompt_response`
- 빠른 입력 결과: `game:ack`

즉, 현재 구조는 "이벤트 이름만 몇 개 바꾸는 수준"이 아니라 상태 흐름 자체를 재정렬해야 한다.

## 2. 수정 대상과 방법

| 파일 | 현재 문제 | 수정 방향 | 담당 |
| --- | --- | --- | --- |
| `src/types/domain.ts` | ID 타입, tile type, building level, game state shape가 새 명세와 불일치 | snapshot/patch/ack/prompt/event 타입 추가, 숫자 ID와 `0..7` building level 반영 | FE-B |
| `src/stores/game.store.ts` | 단순 set/update store라 revision, prompt, patch 적용 불가 | `applySnapshot`, `applyPatch`, `setAck`, `setPrompt`, `consumeEvents` 추가 | FE-B |
| `src/services/socket/game.handler.ts` | 구 소켓 이벤트 구독과 `roll_dice`, `confirm_penalty` emit 사용 | `game:ack`, `game:patch`, `game:prompt`, `game:error` 구독과 `game:action`, `game:sync`, `game:prompt_response` emit로 교체 | FE-B |
| `src/hooks/game/useGameState.ts` | mount 시 REST state 조회 중심 | mount/reconnect 시 `game:sync` 전송, snapshot 또는 patch 적용으로 전환 | FE-B |
| `src/services/game/game.api.ts` | `buyTile`, `buildTile`, `sellTile`, `syncState`가 핵심 액션 경로 | 게임 액션성 REST를 제거하거나 레거시 fallback으로 격리 | FE-B |
| `src/hooks/game/useDiceRoll.ts` | `emitRollDice` 또는 로컬 보드 fallback 사용 | `ROLL_DICE`용 `game:action` 전송으로 단순화 | FE-B |
| `src/pages/GamePage.tsx` | `boardPlayers`, `boardCurPlayer` 로컬 상태와 store 이중화 | store selector 기반 조립으로 단순화, 보드에 상태 역주입 금지 | FE-B 주도 / FE-C 협업 |
| `src/components/board/GameBoard.tsx` | 타일 소유권, 통행료, 파산, 턴 전환, API 호출을 직접 수행 | 렌더링과 연출만 담당하도록 축소, prompt 표시용 표면만 유지 | FE-C 주도 / FE-B 선행 필요 |
| `src/components/game/modals/*` | 일부 모달은 존재하지만 서버 prompt와 연결되지 않음 | prompt type 기준 wrapper 또는 container 추가, ack/error/timeout 연결 | FE-B |
| `src/mocks/handlers/game.handler.ts` | 구 REST + 구 소켓 이벤트 mock | 새 이벤트 명세를 흉내 내는 socket mock으로 재작성 | FE-B |
| `src/test/socketEmitter.ts` | 테스트 유틸이 구 이벤트 네이밍에 묶였을 가능성 높음 | 새 이벤트 네이밍과 patch payload 지원하도록 수정 | FE-B |
| `src/components/board/*`, `src/styles/board.css` | 렌더 레이어는 usable하지만 새 state shape 미반영 | 새 tile/player/building 표현과 animation 상태를 view model 기준으로 재정렬 | FE-C |

## 3. 파일별 상세 작업

### 3-1. `src/types/domain.ts`

반드시 추가하거나 바꿔야 하는 축:

- `GameAck`
- `GamePatchEnvelope`
- `GamePatchOperation`
- `GamePrompt`
- `GamePromptResponse`
- `GameSnapshot`
- `ServerEvent`
- `GamePhase`
- `PlayerState`
- `TileType`

기존 타입 중 바로 손봐야 하는 부분:

- `BuildingLevel`은 `0 | 1 | 2 | 3 | 4 | 5 | 6 | 7`
- `Player.id`는 숫자 기준으로 정리
- `Tile.owner_id` 대신 새 스냅샷 구조와 맞는 `ownerId`
- `currentTurn` 중심 상태를 `turn`, `currentPlayerId`, `phase`, `revision` 중심으로 재구성

### 3-2. `src/stores/game.store.ts`

현재 store는 부분 업데이트에는 편하지만 새 명세 수용에는 부족하다.
아래 액션이 필요하다.

- `replaceFromSnapshot(snapshot, revision)`
- `applyPatchEnvelope(envelope)`
- `setPendingAction(actionId, type)`
- `resolveAck(ack)`
- `setPrompt(prompt)`
- `clearPrompt(promptId)`
- `enqueueEvents(events)`
- `consumeNextEvent()`

이 단계가 끝나야 FE-C가 안정적으로 보드 렌더를 store 하나만 보고 붙일 수 있다.

### 3-3. `src/services/socket/game.handler.ts`

현재 파일은 "이벤트 종류별 store mutation"에 너무 강하게 묶여 있다.
새 구조에서는 아래 역할로 줄여야 한다.

- 소켓 listener 등록/해제
- payload를 store 액션으로 전달
- emit helper 제공

제거 대상:

- `handleTurnStart`
- `handlePlayerMoved`
- `handleTilePurchased`
- `handleTollPaid`
- `emitRollDice`
- `emitConfirmPenalty`

대체 대상:

- `emitGameAction`
- `emitGameSync`
- `emitPromptResponse`
- `handleGameAck`
- `handleGamePatch`
- `handleGamePrompt`
- `handleGameError`

### 3-4. `src/services/game/game.api.ts`

현재 `buy/build/sell/sync`는 새 명세 기준의 주 경로가 아니다.

권장 처리:

- `getState`, `buyTile`, `buildTile`, `sellTile`, `syncState`를 레거시로 표시
- 새 소켓 경로 전환 후 사용처 제거
- 당장 삭제가 부담되면 `deprecated` 성격의 얇은 래퍼로 격리

### 3-5. `src/pages/GamePage.tsx`

현재 문제:

- store -> board hydrate
- board -> store write-back
- turn/current player를 두 군데서 관리

수정 방향:

- `boardPlayers`, `boardCurPlayer` 제거
- `handlePlayersChange`, `handleCurPlayerChange`, `handleTileOwnersChange` 제거
- store snapshot에서 보드용 `players`, `tiles`, `currentPlayerId`, `activePrompt`를 selector로 가공
- `isMyTurn`도 store `currentPlayerId`와 auth session 기준으로 계산

### 3-6. `src/components/board/GameBoard.tsx`

현재 가장 큰 구조 부채가 이 파일이다.

제거해야 하는 책임:

- `gameApi.syncState`, `buyTile`, `buildTile`, `sellTile`
- `calcToll` 기반 실제 돈 계산
- `applyMoney`, 파산 판정, 턴 강제 전환
- 타일 소유권의 로컬 진실 소스

남겨야 하는 책임:

- 보드 배치 렌더링
- 토큰/건물/타일 시각화
- 이벤트 큐 기반 이동 연출
- prompt에 따라 모달 또는 오버레이 표면 표시

즉, `GameBoard.tsx`는 "게임 엔진"이 아니라 "게임 화면"이 되어야 한다.

### 3-7. `src/mocks/handlers/game.handler.ts`

이 파일을 안 고치면 새 명세 기준 검증이 불가능하다.

최소 필요 기능:

- 초기 진입 시 `game:sync`에 대한 snapshot 응답
- `ROLL_DICE`, `BUY_PROPERTY`, `SELL_PROPERTY`, `END_TURN` 액션 처리
- 각 액션마다 `game:ack` 발행
- 상태 확정 시 `game:patch` 발행
- 필요 시 `game:prompt` 발행

## 4. FE-B / FE-C 분리 기준

### FE-B가 먼저 끝내야 하는 것

- 타입 재정의
- store 재설계
- socket 계층 전환
- mock 전환
- prompt/ack/error 흐름 정의

### FE-C가 그 다음 붙여야 하는 것

- board presentational refactor
- event queue 기반 연출
- store selector 기반 렌더링
- 새 building/tile/playerState 시각 반영

## 5. 권장 순서

1. `src/types/domain.ts`
2. `src/stores/game.store.ts`
3. `src/services/socket/game.handler.ts`
4. `src/hooks/game/useGameState.ts`
5. `src/mocks/handlers/game.handler.ts`
6. `src/pages/GamePage.tsx`
7. `src/components/board/GameBoard.tsx`
8. `src/components/game/modals/*`

## 6. 문서 사용법

이 문서는 실제 코드 수정 전 체크리스트로 사용한다.
파일을 건드릴 때는 "새 이벤트 명세를 수용하기 위한 변경인지" 아니면 "구 구조를 임시 연명하는 변경인지"를 먼저 구분해야 한다.
