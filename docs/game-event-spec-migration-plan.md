# 게임 이벤트 명세 전환 갭 분석

이 문서는 중앙 문서 저장소 `https://github.com/modoo-marble-team/docs`의 `gamesocket.md`,
`api.md`, `erd.md` 기준으로 현재 프론트엔드 코드에서 어디를 어떻게 고쳐야 하는지 파일 단위로 정리한 문서다.
단, 실제 이행 작업은 `모두의마블_API명세서_v4.xlsx`, `모두의마블_요구사항정의서_v8.xlsx`,
`모두의마블_테이블명세서_v4.xlsx`의 레거시 제약도 동시에 고려해야 한다.

## 1. 핵심 결론

현재 구현은 아래 구조를 전제로 한다.

- 액션: REST `buy/build/sell/state`
- 실시간 반영: `game_start`, `turn_start`, `dice_rolled`, `player_moved` 등 개별 소켓 이벤트
- 보드 계산: `GameBoard.tsx` 내부 로컬 계산과 상태 갱신

중앙 docs는 아래 구조를 요구한다.

- 액션: `game:action`
- 동기화: `game:sync`
- 상태 반영: `game:patch`
- 개인 선택: `game:prompt` / `game:prompt_response`
- 빠른 입력 결과: `game:ack`
- 오류 보고: `game:error`

즉, 현재 구조는 "이벤트 이름만 몇 개 바꾸는 수준"이 아니라 상태 흐름 자체를 재정렬해야 한다.

## 1-1. 충돌 지점과 문서 기준 해석

### 식별자

- 구 명세: `room_id`
- 중앙 docs: `gameId`

이행 기준:

- 게임 소켓 이벤트는 `gameId`를 canonical로 삼는다
- URL/로비/대기방/레거시 REST는 `roomId`가 남을 수 있다
- FE-B가 `roomId -> gameId` 매핑과 제거 전략을 관리한다

### 화폐 단위

- 구 명세: 원 정수
- 중앙 docs: 예시는 만 단위를 쓰지만, 실제 프로젝트 canonical unit을 하나로 고정해야 함

이행 기준:

- 프론트/백엔드가 동일한 canonical unit을 공유해야 한다
- 현재 프론트 구현과 transport 차이는 FE-B mapper/adapter가 흡수한다

### 타일 타입

| 현재 보드/요구사항      | 새 이벤트 명세                            |
| ----------------------- | ----------------------------------------- |
| `city`                  | `PROPERTY`                                |
| `chance`                | `CHANCE`                                  |
| `go_to_island`          | `MOVE_TO_ISLAND`                          |
| `island`                | `ISLAND`                                  |
| `start`                 | `START`                                   |
| `travel`, `ai`, `event` | 별도 확장 또는 compatibility mapping 필요 |

### 건물 레벨

| 출처           | 정의                        |
| -------------- | --------------------------- |
| API v4         | `0..5`에 가까운 레거시 구조 |
| 새 이벤트 명세 | `0..7`                      |

이행 기준:

- transport 모델은 새 명세(`0..7`)를 목표로 설계
- 현재 렌더/레거시 fallback은 compatibility mapping 유지

## 2. 수정 대상과 방법 (2026-03-05 기준)

아래 표에서 **상태** 열 기준: ✅ 완료 / ⚠️ 명세 불일치 수정 필요 / ❌ 미구현

| 파일                                                | 현재 상태         | 남은 수정 방향                                                                                                         | 담당                       |
| --------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `src/types/domain.ts`                               | ✅ 완료           | —                                                                                                                      | FE-B                       |
| `src/stores/game.store.ts`                          | ✅ 완료           | —                                                                                                                      | FE-B                       |
| `src/services/socket/game.handler.ts`               | ✅ 완료           | —                                                                                                                      | FE-B                       |
| `src/hooks/game/useGameState.ts`                    | ✅ 완료           | —                                                                                                                      | FE-B                       |
| `src/services/game/game.api.ts`                     | ⚠️ 레거시 격리 중 | deprecated 표시 완료. `gameBoardActionHandlers.ts`의 BUY/SELL/END_TURN non-mock 전환 완료, BUILD/sync는 레거시 유지    | FE-B                       |
| `src/hooks/game/useDiceRoll.ts`                     | ✅ 완료           | —                                                                                                                      | FE-B                       |
| `src/pages/GamePage.tsx`                            | ✅ 3차 완료       | `prompt` 오버레이 응답 + `prompt.type` board-modal 분기 연결 완료. 미매핑 prompt는 오버레이 fallback 유지              | FE-B                       |
| `src/components/board/GameBoard.tsx`                | ⚠️ 부분 정리      | non-mock에서 `store.prompt` 기반 Buy/Build/Toll/Timer 모달 연결 완료. `applyMoney`, `advanceTurn`, 파산 판정 제거 필요 | FE-C 주도 / FE-B 선행 필요 |
| `src/components/game/modals/*`                      | ✅ 3차 완료       | `store.prompt.type` 기준 모달 열림 조건/응답 연결 완료. `DiceTimerModal` timeout 연동 완료                             | FE-B                       |
| `src/mocks/handlers/game.handler.ts`                | ✅ 완료           | —                                                                                                                      | FE-B                       |
| `src/components/board/gameBoardStoreBridge.ts`      | ❌ 버그           | `toStoreBuildingLevel` 상한 5→7                                                                                        | FE-C                       |
| `src/components/board/gameBoardTransactionUtils.ts` | ❌ 버그           | `upgradeBoardTileOwner` 상한 5→7                                                                                       | FE-C                       |
| `src/components/board/gameBoardActionUtils.ts`      | ❌ 버그           | `getBoardSellFallbackRefund` level 5, 6 케이스 추가                                                                    | FE-C                       |
| `src/components/board/*` (렌더 레이어)              | ❌ 미구현         | `store.eventQueue` 소비 연출. `playerState` 시각화                                                                     | FE-C                       |

### 2-1. `src/mocks/handlers/game.handler.ts` 명세 불일치 상세

| 항목                        | 현재 코드                                                                                     | `gamesocket.md` 명세                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ActionType                  | `ROLL_DICE`, `BUY_PROPERTY`, `BUILD_PROPERTY`, `SELL_PROPERTY`, `REQUEST_BUY_PROPERTY_PROMPT` | `ROLL_DICE`, `BUY_PROPERTY`, `SELL_PROPERTY`, `END_TURN`                                                                                            |
| ServerEvent type            | `ROLL_DICE`, `MOVE_PLAYER`, `BUY_PROPERTY`, `SELL_PROPERTY`, `BUILD_PROPERTY`                 | `DICE_ROLLED`, `PLAYER_MOVED`, `BOUGHT_PROPERTY`, `SOLD_PROPERTY`, `TURNED_ENDED`, `LANDED`, `PAID_TOLL`, `PLAYER_STATE_CHANGED`, `CHANCE_RESOLVED` |
| `BUY_PROPERTY` payload      | `{ tile_index }` (snake_case)                                                                 | `{ tileId }` (camelCase)                                                                                                                            |
| `SELL_PROPERTY` payload     | `{ tile_index, level }`                                                                       | `{ tileId, buildingLevel }`                                                                                                                         |
| `BuildingLevel` 상한        | `>= 5` 에서 차단                                                                              | `>= 7` 에서 차단                                                                                                                                    |
| `game:prompt_response` 처리 | `response.value` 참조                                                                         | `response.choice` 참조                                                                                                                              |

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
- `Player.id`는 숫자 기준으로 정리하되, 레거시 문자열 ID에서 변환 경로를 둔다
- `Tile.owner_id` 대신 새 스냅샷 구조와 맞는 `ownerId`를 canonical로 두고 레거시 alias를 흡수
- `currentTurn` 중심 상태를 `turn`, `currentPlayerId`, `phase`, `revision` 중심으로 재구성
- `roomId`, `gameId`를 모두 담을 수 있는 connection/session 메타 타입 추가
- `Money`는 transport 단위와 관계없이 원 정수로 해석되는 타입/설명 유지

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
- 단, backend rollout 전까지는 `roomId` 기준 fallback이므로 FE-B 소유 범위에 둔다

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
- 레거시 REST fallback 검증용 최소 핸들러는 별도 호환 계층으로 유지

## 4. FE-B / FE-C 분리 기준

### FE-B가 먼저 끝내야 하는 것

- 타입 재정의
- store 재설계
- socket 계층 전환
- mock 전환
- prompt/ack/error 흐름 정의
- 실제 UI에서 `prompt`, `ack`, `pendingAction`, `error`를 소비하는 연결

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

## 5-1. 현재 상태 (2026-03-05 기준)

### 완료 항목

- `src/types/domain.ts`: `BuildingLevel 0..7`, `GamePhase`, `PlayerStateType`, `GameSnapshot`, `GamePatchEnvelope`, `GamePatchOperation`, `GameAck`, `GameError`, `GamePrompt`, `GamePromptResponse`, `ServerEvent`, `PendingGameAction`, `GameConnectionMeta`, `GameState` 전부 도입
- `src/stores/game.store.ts`: `replaceFromSnapshot`, `applyPatchEnvelope`(revision guard + set/inc/push/remove), `setPendingAction`, `resolveAck`, `setPrompt`, `clearPrompt`, `enqueueEvents`, `consumeNextEvent`, `setLastError`, `resetGame` 전부 구현
- `src/services/socket/game.handler.ts`: `game:ack`, `game:patch`, `game:prompt`, `game:error` 구독. `emitGameAction`, `emitGameSync`, `emitPromptResponse` 구현
- `src/hooks/game/useGameState.ts`: `game:sync` 우선, REST bootstrap fallback 병행
- `src/pages/GamePage.tsx`: store 단일 소스, `gameViewModel` mapper로 board 데이터 조립 + `prompt` 오버레이 응답, `pendingAction`/`lastAck`/`lastError` UI 연결
- `src/components/board/gameBoardActionHandlers.ts`: mock 경로 BUY/BUILD 성공 시 턴이 다음 플레이어로 넘어가지 않던 문제 수정 (`advanceTurn` 보장)
- `src/components/board/gameBoardActionHandlers.test.ts`: mock BUY/BUILD 성공 후 턴 전환 회귀 테스트 추가

### 명세 불일치 (수정 완료 — 2026-03-05)

- `src/types/domain.ts`: `GamePromptResponse.choice`, `GameAck.error: { code, message }`, `GamePatchEnvelope.gameId/turn` ✅
- `src/services/socket/game.handler.ts`: `emitGameSync` knownRevision 추가, `emitPromptResponse` choice 전환 ✅
- `src/mocks/handlers/game.handler.ts`: `END_TURN` 핸들러 추가, `BUILD_PROPERTY` 제거, ServerEventType 명세 정렬, payload camelCase, `BuildingLevel` 상한 7 ✅

### 버그 (수정 미완료 — FE-C 담당)

- `src/components/board/gameBoardStoreBridge.ts:6`: `toStoreBuildingLevel` 상한 5 (→ 7 필요)
- `src/components/board/gameBoardTransactionUtils.ts`: `upgradeBoardTileOwner` 상한 5 (→ 7 필요)
- `src/components/board/gameBoardActionUtils.ts`: `getBoardSellFallbackRefund` level 5, 6 누락

### 구조 미구현 (FE-B 2단계)

- `GamePage` + `GameBoard`: `prompt.type` → Buy/Build/Toll/Timer 모달 매핑, `emitPromptResponse` 응답 경로 연결 완료
- `store.eventQueue` → 소비 컴포넌트 없음
- `gameBoardActionHandlers.ts` → BUY/SELL/END_TURN non-mock 전환 완료, mock 턴 전환 회귀 수정 완료. BUILD/sync 레거시 호출 정리 필요

## 5-2. 다음 우선순위

**FE-B**

1. ~~`src/types/domain.ts`, `src/services/socket/game.handler.ts`: 명세 불일치 수정~~ ✅ 완료
2. ~~`src/mocks/handlers/game.handler.ts`: 명세 불일치 수정~~ ✅ 완료
3. ~~`src/components/game/modals/*`, `src/components/board/GameBoard.tsx`: `store.prompt.type` → modal 연결, `DiceTimerModal` → `prompt.timeoutSec` 연결~~ ✅ 완료
4. `src/components/board/gameBoardActionHandlers.ts`: BUILD/sync 레거시 호출 정리 및 prompt.type 기반 액션 확정
5. `src/components/board/gameBoardActionHandlers.test.ts`: prompt/mode 조합(실서버·mock)별 턴 진행 회귀 케이스 확장

**FE-C**

1. `gameBoardStoreBridge.ts`, `gameBoardTransactionUtils.ts`, `gameBoardActionUtils.ts`: BuildingLevel 버그 수정 (FE-B와 무관하게 선행 가능)
2. `GameBoard.tsx`: `applyMoney`, `advanceTurn`, 통행료 계산, 파산 판정 제거 (FE-B 5-3 선행 필요)
3. `store.eventQueue` 소비 훅/컴포넌트 구현 (FE-B 5-4 선행 필요)
4. `playerState`(`island`, `locked`) 시각화

## 6. 문서 사용법

이 문서는 실제 코드 수정 전 체크리스트로 사용한다.
파일을 건드릴 때는 아래 둘을 먼저 구분해야 한다.

- 새 이벤트 명세를 수용하기 위한 변경인지
- 기존 roomId/REST/원 단위 계약을 안전하게 유지하기 위한 호환 변경인지

둘을 섞을 때는 반드시 mapper/adapter 계층을 명시적으로 둔다.

### 6-1. 작업 종료 시 문서 업데이트 규칙 (2026-03-05 추가)

- 모든 작업은 완료 시점에 문서를 함께 갱신한다.
- 문서에는 반드시 `진행도(무엇이 완료됐는지)`와 `다음 작업(무엇을 이어서 할지)`를 함께 기록한다.
- 기본 갱신 대상은 `docs/game-event-spec-migration-plan.md`, `docs/game-delivery-roadmap.md`, `docs/game-ownership-corrected-table.md`다.
