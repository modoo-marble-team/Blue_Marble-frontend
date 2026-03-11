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
  레거시 게임 REST 모듈은 삭제됐다.
  중앙 docs `api.md` 기준으로 게임 로직은 `game:*` 소켓 경로를 단일 경로로 유지한다.

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
  `BuildingLevel 0..7`, `GamePatchEnvelope`, `GameAck`, `GamePromptResponse.choice` 등 핵심 타입은 반영됐다.
  현재 남은 갭은 식별자/필드 canonical 정렬(`roomId <-> gameId`, prompt/snapshot 필드명)과 money unit 고정이다.
  `city <-> PROPERTY` 같은 렌더 호환은 mapper/adapter 계층으로 유지한다.

### 목업 갭

- `src/mocks/handlers/game.handler.ts`
  event-socket 기준(`game:ack`, `game:patch`, `game:prompt`)은 반영됐고, 레거시 REST 핸들러는 fallback 검증용으로만 남아 있다.
  잔여 과제는 중앙 docs 대비 필드 canonical(`gameId`, prompt/snapshot 스키마) 정렬이다.

## 4. 진행도 재평가 (2026-03-10 기준)

새 이벤트 명세 **이행 진행도** 기준 최신 현황이다.

### FE-B: 계약/상태 골격 완료, 런타임 정합성 마무리 단계

완료된 축:

- `src/types/domain.ts`: `BuildingLevel 0..7`, `GamePhase`, `GameSnapshot`, `GamePatchEnvelope`, `GameAck`, `GamePrompt`, `GamePromptResponse` 등 핵심 타입 반영 완료
- `src/stores/game.store.ts`: snapshot 교체, patch(revision guard), ack/prompt/pendingAction/eventQueue 처리 완료
- `src/services/socket/game.handler.ts`: `game:ack`/`game:patch`/`game:prompt`/`game:error` 구독 + `emitGameAction`/`emitGameSync`/`emitPromptResponse` 송신 완료
- `src/hooks/game/useGameState.ts`: `game:sync` 중심 진입 동기화로 정리 (REST bootstrap 경로 제거)
- `src/mocks/handlers/game.handler.ts`: `game:ack` + `game:patch(snapshot)` 기반 mock 계약 정렬
- `src/pages/GamePage.tsx`: prompt/ack/error/pendingAction UI 연결 완료
- `src/components/board/gameBoardActionHandlers.ts`: non-mock 경로에서 BUY/BUILD/SELL/END_TURN를 `emitGameAction`으로 송신
- `src/services/game/game.api.ts`: 레거시 게임 REST 모듈 삭제 완료
- `src/mocks/handlers/game.handler.test.ts`: 한 턴 계약 시나리오(`action -> ack -> patch -> prompt_response`) 테스트 추가

남은 핵심 축 — **중앙 docs 대비 런타임 정합성**:

| 영역             | 현재 상태                           | 정리 방향                                                                                            |
| ---------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 식별자 canonical | 일부 송신 호출이 `roomId` 중심      | `game:action`/`game:sync`/`game:prompt_response`를 `gameId` canonical로 고정                         |
| ActionType(건설) | FE는 `BUILD_PROPERTY` 송신          | 중앙 `gamesocket.md`(`ROLL_DICE`,`BUY_PROPERTY`,`SELL_PROPERTY`,`END_TURN`) 기준으로 BE 합의 후 통일 |
| Prompt 스키마    | FE는 `prompt.id`, `timeoutSec` 사용 | 중앙 문서(`promptId`, `payload.timeoutMs`)와 어댑터 또는 계약 통일                                   |
| Snapshot 스키마  | FE 타입과 중앙 예시 필드가 다름     | BE 응답 고정 또는 FE 어댑터 계층에서 단일 canonical 스냅샷 확정                                      |
| 이벤트 표기      | 문서 내 오타 이력 존재              | `TURN_ENDED` 표기로 통일                                                                             |

### FE-C: 헬퍼 버그 수정 완료, 보드 엔진 제거/연출 분리 단계

완료된 축:

- `gameBoardStoreBridge.ts`, `gameBoardTransactionUtils.ts`, `gameBoardActionUtils.ts`의 `BuildingLevel 0..7` 관련 버그 수정 반영

남은 핵심 축:

- `GameBoard.tsx` 내부 `applyMoney`/`advanceTurn`/파산 판정/로컬 턴 전환 등 로컬 엔진 성격 로직 제거
- `store.eventQueue` 소비 레이어 구현(이동/연출 분리)
- `playerState`(`island`, `locked`)와 `stateDuration` 시각화 보강

## 5. FE-B 우선 작업

### 5-1. BE 계약 고정(선행)

다음 항목은 FE 단독으로 확정할 수 없으므로 BE와 계약을 먼저 고정한다.

- `gameId` canonical 사용 범위 (`roomId` 임시 허용 여부/종료 시점)
- ActionType에서 건설 처리 방식 (`BUILD_PROPERTY` 유지 vs `BUY_PROPERTY` 통합)
- prompt 필드명 (`id`/`promptId`, `timeoutSec`/`timeoutMs`) 및 ack 매칭 규칙
- snapshot/player/tile 필드 최종 스키마
- money canonical unit 확정

### 5-2. FE 정리 항목

- `emitGameAction`/`emitGameSync`/`emitPromptResponse` 호출부를 `gameId` 기준으로 정리
- `GameBoard` prompt 소비 경로의 로컬 fallback 분기 축소
- 게임 런타임에서 REST 의존(`game.api`) 재도입 금지 유지

### 5-3. mock 검증 흐름 유지

- 한 턴 검증 시나리오: `sync → action(ROLL_DICE) → ack → patch(snapshot + events) → prompt → prompt_response → ack → patch`
- `END_TURN` 흐름: `action(END_TURN) → ack → patch(TURN_ENDED)`

## 6. FE-C 우선 작업

### 6-1. 보드 presentational 전환

- `GameBoard.tsx`에서 서버 권위 계산(돈/턴/파산/소유권 진실 소스) 제거
- 보드는 store 기반 렌더 + 입력 surface(prompt/버튼) + 연출만 담당

### 6-2. 이벤트 기반 연출

- `store.eventQueue`를 소비하는 훅/컴포넌트 구현
- `DICE_ROLLED`/`PLAYER_MOVED`/`LANDED`/`PAID_TOLL`/`CHANCE_RESOLVED`/`TURN_ENDED` 연출 분기 정리

### 6-3. 시각 규격 보강

- `playerState`(`island`, `locked`) 표시
- `stateDuration`(잔여 턴) 표시

## 7. 권장 실행 순서

1. **FE-B + BE**: `gameId`/ActionType/prompt/snapshot/money 계약 고정
2. **FE-B**: 호출부 canonical(`gameId`) 정리 + 문서/타입 동기화
3. **FE-C**: `GameBoard.tsx` 로컬 엔진 제거 및 presentational 수렴
4. **FE-C**: `eventQueue` 기반 이동/연출 구현
5. **FE-B + FE-C**: prompt 흐름 + 타이머 + 턴 종료(`TURN_ENDED`) 통합 검증

## 8. 완료 조건

### FE-B 완료 조건

- `gamesocket.md` / `api.md` 기준 payload 필드명/구조가 일치한다.
- `game:*` 소켓 경로가 기본이며, 레거시 fallback은 의도적으로만 남아 있다.
- prompt 응답, ack 매칭, revision 기반 patch 적용이 안정적으로 동작한다.

### FE-C 완료 조건

- 보드가 store 기준 단일 상태만 렌더한다.
- `eventQueue` 소비 기반 이동/연출이 동작한다.
- `playerState`/`stateDuration` 시각화가 반영된다.

## 9. 결론

현재 단계의 핵심은 **코드 정리보다 계약 고정**이다.
특히 `gameId` canonical, ActionType(건설), prompt/snapshot 스키마를 먼저 고정해야 실서버 연동에서 재작업을 줄일 수 있다.
그 후 `GameBoard.tsx`의 로컬 엔진 성격 로직을 제거하고, 이벤트 연출 레이어로 수렴한다.
