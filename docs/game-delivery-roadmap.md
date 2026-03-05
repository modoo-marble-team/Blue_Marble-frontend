# 게임 완료 로드맵 (중앙 docs 기준 / 기존 명세 호환 포함, 2026-03-04)

이 문서는 현재 프론트엔드 코드와 중앙 문서 저장소 `https://github.com/modoo-marble-team/docs`의
`gamesocket.md`, `api.md`, `erd.md`, 그리고 기존 `모두의마블_API명세서_v4.xlsx`,
`모두의마블_요구사항정의서_v8.xlsx`, `모두의마블_테이블명세서_v4.xlsx`를 함께 대조해서
다시 작성한 실행 로드맵이다.

중요한 전제는 아래와 같다.

- 중앙 docs의 `gamesocket.md`는 앞으로 이행해야 할 **게임 런타임 단일 계약**이다.
- 중앙 docs의 `api.md`는 게임 영역에서 `gamesocket.md`를 우선 기준으로 삼고, REST를 로비/대기방 중심으로 제한한다.
- API/요구사항/테이블 명세 v4는 현재 코드와 더 가까운 **레거시/현행 계약**이다.
- 따라서 이 문서는 "새 명세로 바로 단절"이 아니라 "기존 계약을 유지하면서 새 명세로 이행"하는 기준 문서다.

## 1. 기준 문서

- 실시간 게임 계약 기준: 중앙 docs `gamesocket.md`
- API/WebSocket 기준: 중앙 docs `api.md`
- 데이터 기준: 중앙 docs `erd.md`
- 요구사항/레거시 API 기준: `모두의마블_요구사항정의서_v8.xlsx`, `모두의마블_API명세서_v4.xlsx`, `모두의마블_테이블명세서_v4.xlsx`
- 프론트 내부 기준: `docs/game-ownership.md`, `docs/game-ownership-corrected-table.md`

### 기준 우선순위

1. **중앙 docs `gamesocket.md`**
   - 목표 구조(`game:action`, `game:ack`, `game:patch`, `game:prompt`) 정의
   - 게임 영역의 단일 런타임 계약
2. **중앙 docs `api.md` / `erd.md`**
   - 게임은 `game:*` 소켓, 로비/대기방은 REST 중심이라는 경계 확인
   - 게임 식별자, 공통 에러 포맷, 데이터 저장 구조 확인
3. **기존 API/요구사항/테이블 명세**
   - 현재 운영 제약, 레거시 payload, 호환 범위 확인
4. **현재 코드**
   - 실제 구현 상태와 이행 비용 확인

즉, 중앙 docs가 목표 방향을 정하고, 기존 명세가 현재 제약을 설명한다.

## 2. 명세 변경 핵심

새 이벤트 명세 기준으로 게임 연동의 중심은 아래 네 가지다.

- 액션 전송은 `game:action` 하나로 통합된다.
- 처리 결과는 `game:ack`, 상태 반영은 `game:patch`, 선택 요구는 `game:prompt`로 분리된다.
- 클라이언트는 `revision` 기준으로 patch를 적용하고, 역순/중복 패킷을 무시해야 한다.
- 주사위, 이동, 통행료, 소유권, 건물 단계, 파산은 서버 권위로 확정된다.

즉, 현재 프론트의 "REST 요청 + 개별 소켓 이벤트 조합 + 보드 로컬 계산" 구조는 새 기준과 직접 충돌한다.

다만 기존 명세와 충돌하는 항목은 아래처럼 해석한다.

### 2-1. roomId vs gameId

- 중앙 docs `gamesocket.md`는 게임 이벤트를 `gameId` 기준 room(`game:{gameId}`)으로 정의한다.
- 기존 API/테이블 명세는 `room_id` 기준이다.

현재 프론트 기준 정책:

- 게임 소켓 이벤트의 canonical identifier는 **`gameId`**
- 로비/대기방/레거시 fallback 경계에서는 **`roomId`** 가 남을 수 있다
- FE-B는 `roomId -> gameId` 매핑과 점진 제거 전략을 담당한다

즉, 이행 완료 전까지는 둘이 공존할 수 있지만, 신규 게임 흐름의 기준점은 `gameId`다.

### 2-2. 화폐 단위

- 요구사항/API 명세 v4: **원(₩) 정수**
- 중앙 docs `gamesocket.md`: 예시는 만 단위 정수를 쓰지만, 실제 단위는 **프로젝트 합의 단일 기준으로 고정**한다고 명시
- 중앙 docs `api.md`: 프론트/백엔드가 동일 단위를 써야 한다고 명시

현재 프론트 기준 정책:

- 현재 프론트는 원 정수 중심 표현을 쓰고 있다.
- 단, 앞으로는 프론트/백엔드 공통 canonical money unit을 명시적으로 확정해야 한다.
- transport와 내부 표현이 다를 경우 FE-B mapper/adapter가 이를 흡수한다.

즉, store/domain 내부에서 단위를 섞지 않고, 중앙 docs 기준으로 하나의 canonical unit을 유지해야 한다.

### 2-3. TileType / BuildingLevel

- 요구사항/현재 보드 기준 타일: `start`, `city`, `chance`, `event`, `ai`, `travel`, `island`, `go_to_island`
- 중앙 docs `gamesocket.md` 기준 타일: `START`, `PROPERTY`, `EVENT`, `CHANCE`, `MOVE_TO_ISLAND`, `ISLAND`

- API v4 build 레벨: 사실상 `0..5`
- 중앙 docs `gamesocket.md` build 레벨: `0..7`

현재 프론트 기준 정책:

- FE 내부 view model은 현재 보드 규격을 유지한다.
- 새 이벤트 계층과의 차이는 FE-B mapper가 흡수한다.
- FE-C는 transport enum이 아니라 **정규화된 view model**만 받는다.

## 3. 현재 코드 기준 핵심 갭

### 구조 갭

- `src/services/socket/game.handler.ts`
  현재는 `game_start`, `turn_start`, `dice_rolled`, `player_moved` 같은 구 이벤트를 직접 구독한다.
  새 명세 기준으로는 `game:ack`, `game:patch`, `game:prompt`, `game:error`만 처리하도록 바뀌어야 한다.

- `src/services/game/game.api.ts`
  현재는 `buy`, `build`, `sell`, `state` REST 액션이 중심이다.
  중앙 docs `api.md` 기준으로 게임 로직은 `game:*` 소켓이 중심이므로, REST는 제거하거나 **이행 중 레거시 fallback으로 격리**해야 한다.

- `src/hooks/game/useGameState.ts`
  현재는 진입 시 REST `getState`를 호출하고 기존 소켓 핸들러를 붙인다.
  새 명세 기준으로는 진입/재접속 시 `game:sync`를 보내고 `snapshot` 또는 patch로 복구해야 한다.

- `src/stores/game.store.ts`
  현재 store에는 `revision`, `phase`, `prompt`, `pendingAction`, `lastAck`, `eventQueue`가 없다.
  새 명세를 소화하려면 snapshot 교체, patch 적용, ack 상태 관리가 가능한 store로 바뀌어야 한다.

- `src/pages/GamePage.tsx`
  `boardPlayers`, `boardCurPlayer`를 별도로 들고 있고 store와 서로 다시 동기화한다.
  새 명세 기준으로는 store를 단일 소스로 삼고 페이지는 selector 조립만 담당해야 한다.

- `src/components/board/GameBoard.tsx`
  현재 이 파일이 구매/건설/매각 API 호출, 통행료 계산, 파산 처리, 턴 전환, 타일 소유권 상태를 모두 들고 있다.
  새 명세 기준으로는 보드 렌더링과 애니메이션, prompt 표시만 남기고 결과 계산은 제거해야 한다.

### 타입 갭

- `src/types/domain.ts`
  현재 `Player.id`, `currentTurn` 등이 문자열 중심이고, `BuildingLevel`은 `0..5`만 지원한다.
  새 명세 기준으로는 숫자 기반 ID, `revision`, `phase`, `playerState`, `BuildingLevel 0..7`, `TileType` 재정의가 필요하다.
  동시에 `roomId <-> gameId`, `원 <-> 만단위`, `city <-> PROPERTY`를 잇는 compatibility layer도 필요하다.

### 목업 갭

- `src/mocks/handlers/game.handler.ts`
  현재 mock은 REST 액션과 구 소켓 이벤트를 함께 흉내 낸다.
  새 명세 기준 검증을 하려면 `game:ack`, `game:patch`, `game:prompt`를 내보내는 형태로 다시 써야 한다.

## 4. 진행도 재평가 (2026-03-05 기준)

새 이벤트 명세 **이행 진행도** 기준 현황이다.

### FE-B: 골격 완료(약 65%), 명세 불일치 수정 + UI 연결 단계

완료된 축:

- `src/types/domain.ts`: `BuildingLevel 0..7`, `GamePhase`, `PlayerStateType`, `GameSnapshot`, `GamePatchEnvelope`, `GamePatchOperation`, `GameAck`, `GameError`, `GamePrompt`, `GamePromptResponse`, `ServerEvent`, `GameState` 정의 완료
- `src/stores/game.store.ts`: `replaceFromSnapshot`, `applyPatchEnvelope`(revision guard + set/inc/push/remove), `setPendingAction`, `resolveAck`, `setPrompt`, `clearPrompt`, `enqueueEvents`, `consumeNextEvent`, `setLastError` 구현 완료
- `src/services/socket/game.handler.ts`: `game:ack`, `game:patch`, `game:prompt`, `game:error` 구독. `emitGameAction`, `emitGameSync`, `emitPromptResponse` emit. 구 이벤트 리스너 제거
- `src/hooks/game/useGameState.ts`: 진입 시 `game:sync` 우선, REST bootstrap fallback 병행
- `src/mocks/handlers/game.handler.ts`: `game:ack` + `game:patch(snapshot)` 기반 event-socket mock 추가
- `src/pages/GamePage.tsx`: store 단일 소스 + `gameViewModel` mapper로 board 데이터 조립 + `prompt` 오버레이 응답, `pendingAction`/`lastAck`/`lastError` UI 연결
- `src/components/board/gameBoardActionHandlers.ts`: BUY/SELL/END_TURN non-mock 경로를 `emitGameAction`으로 전환

남은 핵심 축 — **명세 불일치 (코드 수정 전 반드시 선행)**:

아래 항목은 `gamesocket.md` / `api.md` 기준과 실제 코드 사이에 불일치가 확인된 항목이다.

| 파일                                                       | 불일치 내용                                                                   | 수정 방향                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/types/domain.ts` `GamePromptResponse`                 | `value: string`                                                               | `choice: string` 으로 변경                                                             |
| `src/types/domain.ts` `GameAck`                            | `errorCode`, `message` 플랫 구조                                              | `error?: { code: string; message: string }` 중첩 구조로 변경                           |
| `src/types/domain.ts` `GamePatchEnvelope`                  | `turn`, `gameId` 필드 누락                                                    | `turn?: number`, `gameId?: GameId` 추가                                                |
| `src/services/socket/game.handler.ts` `emitGameSync`       | `knownRevision` 누락, 스펙 외 `reset` 포함                                    | payload에 `knownRevision: number` 추가                                                 |
| `src/services/socket/game.handler.ts` `emitPromptResponse` | `value` 필드 사용, `playerId` 포함                                            | `choice` 필드 사용, `playerId` 제거                                                    |
| `src/mocks/handlers/game.handler.ts`                       | `BUILD_PROPERTY` ActionType은 명세에 없음                                     | 제거. `END_TURN` 핸들러 추가 필요                                                      |
| `src/mocks/handlers/game.handler.ts`                       | `BuildingLevel` 상한을 5로 제한 (`>= 5` 차단)                                 | 7로 변경                                                                               |
| `src/mocks/handlers/game.handler.ts` ServerEvent type      | `ROLL_DICE`, `MOVE_PLAYER`, `BUY_PROPERTY`, `SELL_PROPERTY`, `BUILD_PROPERTY` | `DICE_ROLLED`, `PLAYER_MOVED`, `BOUGHT_PROPERTY`, `SOLD_PROPERTY`. `TURNED_ENDED` 추가 |
| `src/mocks/handlers/game.handler.ts` action payload        | snake_case (`tile_index`, `level`)                                            | camelCase (`tileId`, `buildingLevel`)                                                  |

남은 핵심 축 — UI 연결:

- `GamePage.tsx`의 `store.prompt`/`emitPromptResponse`/`pendingAction`/`lastAck`/`lastError` 연결은 완료
- `store.prompt.type` → `modals/*` 및 `GameBoard.tsx` 분기 연결 완료 (non-mock 기준 Buy/Build/Toll/Timer 모달)
- `DiceTimerModal` → `game:prompt.timeoutSec` 연동 완료
- `gameBoardActionHandlers.ts`: BUILD/sync는 여전히 REST 레거시 경로 유지 → 최종 정리 필요

### FE-C: 골격 완료(약 30%), 버그 수정 + 시각 레이어 수렴 단계

완료된 축:

- 보드 배치, 타일 렌더, 말 렌더, 건물 시각화 기본 구조 존재
- `GameBoard.tsx`: `BuildingLevel 0..7` 대응 (`LEVEL_LABEL`, `calcToll`, `getUpgradeCost`, `toBoardBuildingLevel`) 완료
- `gameViewModel.ts`: `mapStorePlayersToBoardPlayers`, `findBoardCurrentPlayerIndex`, `mapStoreTilesToBoardTiles` mapper 구현

남은 핵심 축 — **버그 (즉시 수정 필요)**:

| 파일                                                                        | 버그 내용                                                 | 수정 방향                                                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/components/board/gameBoardStoreBridge.ts:6`                            | `toStoreBuildingLevel` 상한 5로 고정 (`Math.min(..., 5)`) | `Math.min(..., 7)` 로 변경                                         |
| `src/components/board/gameBoardTransactionUtils.ts` `upgradeBoardTileOwner` | level 상한 5로 고정 (`Math.min(..., 5)`)                  | `Math.min(..., 7)` 로 변경                                         |
| `src/components/board/gameBoardActionUtils.ts` `getBoardSellFallbackRefund` | loop에서 level 5, 6 케이스 누락                           | level 5(`basePrice * 1.0`), level 6(`basePrice * 2.0`) 케이스 추가 |

남은 핵심 축 — 구조:

- `GameBoard.tsx` 내부에 `rollDice`, `applyMoney`, `advanceTurn`, 통행료 계산, 파산 판정 로직 잔존 → 제거
- `store.eventQueue` 소비 컴포넌트 없음 (enqueue는 되지만 아무 연출도 없음)
- `store.playerState`(`island`, `locked`) 기반 섬/잠금 상태 시각화 없음
- `DiceTimerModal`: `game:prompt.timeoutSec` 연동 완료. 다만 mock 로컬 fallback 타이머 분기는 유지

## 5. FE-B 우선 작업

### 5-1. 명세 불일치 수정 (선행 필수)

아래 항목은 `gamesocket.md` / `api.md` 와 현재 코드 간 직접 불일치다. 이 항목을 먼저 맞춰야 이후 UI 연결 작업이 올바른 계약 위에서 진행된다.

**`src/types/domain.ts`**

- `GamePromptResponse`: `value: string` → `choice: string`
- `GameAck`: `{ errorCode?: string; message?: string }` → `{ error?: { code: string; message: string } }`
- `GamePatchEnvelope`: `turn?: number`, `gameId?: GameId` 필드 추가

**`src/services/socket/game.handler.ts`**

- `emitGameSync` payload: `knownRevision: number` 추가. 스펙 외 `reset` 필드 제거
- `emitPromptResponse`: `value` → `choice`, `playerId` 제거 (`gamesocket.md` `game:prompt_response` 명세 기준)

**`src/mocks/handlers/game.handler.ts`**

- `BUILD_PROPERTY` ActionType 제거 (명세에 없음). `END_TURN` 핸들러 추가
- `BuildingLevel` 상한 5 → 7 (`if (tile.building >= 5)` → `if (tile.building >= 7)`)
- ServerEvent `type` 명칭 전체 수정: `ROLL_DICE`→`DICE_ROLLED`, `MOVE_PLAYER`→`PLAYER_MOVED`, `BUY_PROPERTY`→`BOUGHT_PROPERTY`, `SELL_PROPERTY`→`SOLD_PROPERTY`. `TURNED_ENDED` 추가
- action payload 필드명 camelCase로 통일: `tile_index`→`tileId`, `level`→`buildingLevel`

### 5-2. 타입과 store 계약 재정의 (완료)

- `src/types/domain.ts`: 신규 명세 타입 도입 완료
- `src/stores/game.store.ts`: snapshot/patch/ack/prompt/eventQueue 수용 구조 완료
- 5-1 명세 불일치 항목만 추가 수정 필요

### 5-3. 소켓 계층 전환 (완료)

- `src/services/socket/game.handler.ts`: 구 이벤트 구독 제거, 새 이벤트 구독 완료
- `emitGameAction`, `emitGameSync`, `emitPromptResponse` 완료
- 5-1 명세 불일치 항목(`emitGameSync`, `emitPromptResponse` payload)만 추가 수정 필요

### 5-4. prompt/ack 기반 입력 UX 연결

현재 FE-B의 다음 최우선 작업이다.

- ~~`GamePage.tsx`에서 `store.prompt` 오버레이 열림 조건 연결~~ ✅ 완료
- ~~`GamePage.tsx`에서 `emitPromptResponse` 사용자 응답 흐름 연결~~ ✅ 완료
- ~~`game:ack.ok=false` → `store.lastError` → 에러 UI 표시 연결~~ ✅ 완료
- ~~`store.pendingAction`/`store.lastAck` 버튼 상태 및 상태 배지 연결~~ ✅ 완료
- ~~`store.prompt.type` → `modals/*`, `GameBoard.tsx` 분기 연결~~ ✅ 완료 (non-mock)
- ~~`DiceTimerModal` → `game:prompt.timeoutSec` 기반으로 연결~~ ✅ 완료
- `gameBoardActionHandlers.ts`: BUILD/sync 레거시 호출 제거 및 prompt.type 기반 액션 확정

### 5-5. mock 검증 흐름 정비

5-1 수정 후 mock이 명세와 동일한 계약을 따르는지 검증한다.

- 한 턴 검증 시나리오: `sync → action(ROLL_DICE) → ack → patch(snapshot+DICE_ROLLED+PLAYER_MOVED) → prompt(BUY_OR_SKIP) → prompt_response → ack → patch`
- `END_TURN` 흐름: `action(END_TURN) → ack → patch(TURNED_ENDED)`
- 레거시 REST fallback 시나리오는 최소 범위로 유지

## 6. FE-C 우선 작업

### 6-1. 버그 수정 (선행 필수)

아래 3개 버그는 `GameBoard.tsx`에서 `BuildingLevel 0..7`을 반영했으나 helper 파일들이 동기화되지 않아 발생한 회귀다.

- `src/components/board/gameBoardStoreBridge.ts:6`: `Math.min(Math.max(level, 0), 5)` → `Math.min(Math.max(level, 0), 7)`
- `src/components/board/gameBoardTransactionUtils.ts` `upgradeBoardTileOwner`: `Math.min(existing.level + 1, 5)` → `Math.min(existing.level + 1, 7)`
- `src/components/board/gameBoardActionUtils.ts` `getBoardSellFallbackRefund`: loop에 `currentLevel === 5`(`basePrice * 1.0`), `currentLevel === 6`(`basePrice * 2.0`) 케이스 추가 (`GameBoard.tsx` `getUpgradeCost`와 동일한 비율 기준)

### 6-2. 보드 presentational 전환

FE-B의 5-4 작업이 선행되어야 한다.

- `GameBoard.tsx`에서 `applyMoney`, `advanceTurn`, 통행료 계산, 파산 판정 로직 제거
- 보드 컴포넌트는 store에서 넘어온 상태만 렌더하도록 정리
- `emitConfirmPenalty` deprecated 호출 → `emitGameAction` 직접 호출로 교체

### 6-3. store 단일 렌더 구조 (1차 완료, 잔여 있음)

- `gameViewModel.ts` mapper 완료: `mapStorePlayersToBoardPlayers`, `mapStoreTilesToBoardTiles`
- 잔여: `GameBoard.tsx` 내부 `onPlayersChange`, `onTileOwnersChange`, `syncMockStore*` write-back 경로 제거

### 6-4. 이벤트 기반 연출

FE-B `store.eventQueue`가 채워지는 구조는 완료. FE-C가 소비 쪽을 만들어야 한다.

- `store.eventQueue`를 소비하는 훅 또는 컴포넌트 구현
- `ServerEventType` 기준 연출 분기: `DICE_ROLLED`(주사위 표시), `PLAYER_MOVED`(말 이동), `LANDED`(도착), `PAID_TOLL`(통행료), `CHANCE_RESOLVED`(찬스), `TURNED_ENDED`(턴 종료)
- 이벤트 연출 중 상태 기준은 store snapshot/patch가 유지하도록 분리

### 6-5. 시각 규격 재반영

- `playerState`(`island`, `locked`) 기반 섬 감금/잠금 상태 표시 추가
- `stateDuration` 기반 잔여 턴 표시
- `DiceTimerModal` → `game:prompt.timeoutSec` 기반 타이머 연결 완료. FE-C는 시각 연출/애니메이션만 후속 반영

## 7. 권장 실행 순서

1. **FE-B 5-1**: 명세 불일치 수정 (`GamePromptResponse`, `GameAck`, `GamePatchEnvelope`, `emitGameSync`, `emitPromptResponse`, mock)
2. **FE-C 6-1**: 버그 3개 수정 (`gameBoardStoreBridge`, `gameBoardTransactionUtils`, `gameBoardActionUtils`)
3. **FE-B 5-4**: `gameBoardActionHandlers` BUILD/sync 레거시 제거 + prompt.type 액션 확정
4. **FE-C 6-2**: `GameBoard.tsx` 서버 계산 제거, 시각 레이어 수렴
5. **FE-C 6-4**: `store.eventQueue` 기반 이동/연출 구현
6. **FE-B + FE-C**: `game:prompt` 흐름과 `DiceTimerModal` timeout 흐름 공동 검증

## 8. 완료 조건

### FE-B 완료 조건

- `gamesocket.md` / `api.md` 기준 모든 payload 필드명과 구조가 일치한다.
- 구 REST 액션 의존이 제거되거나 보조 수단으로만 남는다.
- patch/snapshot/revision 처리와 prompt 응답이 안정적으로 동작한다.
- mock이 실제 명세(`ActionType`, `ServerEventType`, payload camelCase)와 동일한 계약을 따른다.

### FE-C 완료 조건

- `gameBoardStoreBridge`, `gameBoardTransactionUtils`, `gameBoardActionUtils`의 `BuildingLevel` 버그가 수정된다.
- 보드가 store 기준 단일 상태만 읽는다.
- `store.eventQueue` 소비 기반 이동/연출이 동작한다.
- `playerState`(`island`, `locked`) 기반 상태 시각화가 반영된다.

## 9. 결론

지금 당장 해야 할 일은 **명세 불일치 수정**이다.
코드 구조를 아무리 잘 만들어도 payload 필드명(`choice` vs `value`)이나 에러 구조(`error.code` vs `errorCode`)가 백엔드와 다르면 실서버 연동에서 즉시 깨진다.
FE-B는 5-1 불일치 수정을 먼저, FE-C는 6-1 버그 3개 수정을 먼저 진행한다.
그 다음 단계는 `gameBoardActionHandlers`의 BUILD/sync 레거시 제거와 `GameBoard.tsx` 시각 레이어 수렴이다.
`roomId`, money unit, 현재 보드 view model은 갑자기 제거하지 않고 compatibility layer로 안전하게 이행한다.
