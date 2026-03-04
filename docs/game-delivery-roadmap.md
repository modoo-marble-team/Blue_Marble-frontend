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

## 4. 진행도 재평가

기존 80/50 평가는 더 이상 유효하지 않다. 새 이벤트 명세 **이행 진행도** 기준으로 다시 보면 다음이 더 현실적이다.

### FE-B: 상태 구조 전환 완료, UI 연결 단계 진입

완료된 축:

- 게임 store 기본 골격 보유
- 게임 페이지/턴 UI/모달 자산 다수 확보
- socket 연결 수명주기와 mock 흐름의 기본 토대 존재
- 게임 API/에러 처리 래퍼와 연동 진입점 존재

현재 남은 핵심 축:

- `prompt`, `ack`, `error`, `pendingAction`의 실제 UI 연결
- `game:prompt_response` 기반 입력 흐름 정리
- REST 액션 의존 추가 축소 또는 fallback 격리
- `gameId` 중심 식별자 정리
- money unit, tile/building enum의 중앙 docs 기준 명시화

### FE-C: 보드 표현/연출 정리 단계

완료된 축:

- 보드 배치, 타일 렌더, 말 렌더, 건물 시각화 기본 구조 존재
- 게임판 화면 자체는 이미 플레이 가능한 수준의 뼈대를 가짐

아직 비어 있는 축:

- 보드가 store 단일 상태만 읽도록 정리
- 연출용 event queue 기반 이동/효과 재생
- 새 tile/building/playerState 규격 반영
- `GameBoard.tsx` 내부 로직 분리 후 시각 레이어로 수렴

## 5. FE-B 우선 작업

### 5-1. 타입과 store 계약 재정의

- `src/types/domain.ts`를 새 이벤트 명세 기준으로 개편
- `GameState`를 snapshot 중심 구조로 재설계
- store에 `revision`, `phase`, `prompt`, `pendingAction`, `lastAck`, `lastError`, `eventQueue` 추가

### 5-2. 소켓 계층 전환

- `src/services/socket/game.handler.ts`를 구 이벤트 구독형에서 새 이벤트 구독형으로 변경
- emit 함수는 `emitGameAction`, `emitGameSync`, `emitPromptResponse` 형태로 재구성
- `src/hooks/game/useGameState.ts`는 진입/재접속 시 `game:sync`를 보내도록 수정
- `game:error`는 선택 이벤트이므로, 없을 때도 ack/patch만으로 복구 가능한 흐름으로 설계

### 5-3. patch/snapshot 적용기 구현

- `snapshot`이 오면 store를 통째로 교체
- `patch`는 `set`, `inc`, `push`, `remove`를 순서대로 적용
- `revision`이 같거나 작은 패킷은 무시

### 5-4. prompt/ack 기반 입력 UX 정리

중앙 docs `gamesocket.md` 기준으로 **현재 FE-B의 다음 최우선 작업**이다.

- 구매/건설/매각/무인도 이동/턴 종료를 prompt 또는 ack 기준으로 처리
- 즉시 실패는 `game:ack.ok=false` 기준으로 에러 표시
- `DiceTimerModal`을 실제 turn timeout 또는 prompt timeout과 연결
- `pendingAction`을 버튼 비활성화/로딩과 연결
- 기존 로컬 modal 분기를 `game:prompt` 소비 구조로 전환

### 5-5. mock 전환

- `src/mocks/handlers/game.handler.ts`를 새 계약으로 재작성
- 한 턴 검증 시나리오를 `sync -> action -> ack -> patch -> prompt` 흐름으로 다시 정의
- 단, 이행 완료 전까지는 레거시 REST fallback 시나리오도 최소 회귀 검증 범위에 남긴다

## 6. FE-C 우선 작업

### 6-1. 보드 presentational 전환

- `GameBoard.tsx`에서 서버 권위 계산과 API 호출을 제거
- 보드 컴포넌트는 store selector에서 넘어온 상태만 렌더하도록 정리

### 6-2. store 단일 렌더 구조

- `GamePage.tsx`의 `boardPlayers`, `boardCurPlayer`, `onTileOwnersChange` 중심 구조 제거
- store snapshot을 보드용 view model로 변환하는 selector 또는 mapper 추가

### 6-3. 이벤트 기반 연출

- `game:patch.events`를 이용해 주사위, 이동, 도착, 통행료, 찬스 효과를 순차 재생
- 이벤트 연출이 끝나도 상태 기준은 store snapshot/patch가 유지하도록 분리

### 6-4. 시각 규격 재반영

- `BuildingLevel 0..7` 대응
- `TileType` 명칭 통일
- `playerState`, `stateDuration`에 따른 섬/잠금 상태 표시 추가

## 7. 권장 실행 순서

1. FE-B가 타입, store, 소켓 계층을 새 명세 기준으로 먼저 고친다.
2. FE-B가 mock까지 새 계약으로 맞춘다.
3. FE-C가 보드 로직을 걷어내고 store 단일 렌더 구조로 붙인다.
4. FE-C가 event queue 기반 이동/연출을 붙인다.
5. FE-B와 FE-C가 prompt 흐름과 timeout 흐름을 함께 검증한다.

## 8. 완료 조건

### FE-B 완료 조건

- 구 REST 액션 의존이 제거되거나 보조 수단으로만 남는다.
- 구 소켓 이벤트가 제거되고 새 이벤트 계약만 사용한다.
- patch/snapshot/revision 처리와 prompt 응답이 안정적으로 동작한다.
- mock이 실제 명세와 같은 계약을 따른다.

### FE-C 완료 조건

- 보드가 store 기준 단일 상태만 읽는다.
- 이동/건물/소유권/잠금 상태가 새 snapshot 구조와 일치한다.
- 연출용 events와 실제 상태 patch가 분리되어도 stale 없이 동작한다.

## 9. 결론

지금 가장 먼저 해야 할 일은 `game:*` 계약을 실제 UI 입력 흐름에 연결하는 일이다.
즉시 우선순위는 FE-B의 `prompt/ack/error/pendingAction` UI 연결이고, 그 다음 FE-C가 `GameBoard.tsx`를 더 명확한 시각 레이어로 축소하는 흐름이 맞다.
단, 이 과정에서도 `roomId`, money unit, 현재 보드 view model은 갑자기 제거하지 않고 compatibility layer로 안전하게 이행해야 한다.
