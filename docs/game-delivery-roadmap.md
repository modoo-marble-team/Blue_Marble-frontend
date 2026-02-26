# 게임 완성 로드맵 (FE-B / FE-C)

이 문서는 현재 상태에서 게임 기능 완성까지 가는 실행 경로를 정의합니다.
비게임 영역(로비, 메신저, 랜딩, 로그인)은 FE-A 담당으로 제외합니다.

## 0) 기준 문서

- `docs/game-ownership.md`
- API 명세서 v4
- 요구사항 정의서 v8
- 테이블 명세서 v4

코드와 명세가 충돌하면, 먼저 소유권/명세 문서를 갱신한 뒤 코드 변경을 진행합니다.

## 1) 현재 주요 공백

- `GamePage`가 아직 `LegacyBoardGame` 로컬 상태 흐름에 의존합니다.
- 소켓 수신 핸들러는 있으나 emit 경로와 lifecycle 연결이 미완성입니다.
- `GAME-001~004` API가 UI 전체 흐름에 완전 연결되지 않았습니다.
- 요구사항 타일 타입과 현재 `domain.ts` 네이밍 간 불일치가 있습니다.
- UI 문자열/주석 일부에 인코딩 깨짐이 남아 있습니다.

## 2) 완료 기준 (Done Definition)

- FE-B 완료 기준:
- C->S 이벤트 `SOCK-005~007`이 실제 게임 흐름에서 동작한다.
- S->C 이벤트 `SOCK-009~020`, `SOCK-028`, `SOCK-029`를 상태 드리프트 없이 처리한다.
- `GAME-001~004` API가 성공/실패 처리까지 포함해 연결된다.
- 턴, 주사위, 모달, 게임 종료 플로우가 끝까지 동작한다.
- FE-C 완료 기준:
- 보드 렌더링이 store 상태(`players`, `tiles`)를 단일 소스로 사용한다.
- 이동/건설/특수칸 반영이 이벤트 이후 일관되게 시각화된다.
- 목표 데스크톱 해상도에서 레이아웃이 안정적이다.
- 공동 완료 기준:
- `domain.ts`와 payload 매핑 규칙이 문서와 코드에서 일치한다.
- mock 모드와 실서버 모드의 사용자 플로우가 동일하다.

## 3) 구현 순서 (고정)

1. FE-B 계약 고정
- 소켓 payload 타입, API payload 타입을 전용 파일로 고정한다.
- `snake_case -> 프론트 상태키` 변환 규칙을 고정한다.

2. FE-B 런타임 연결
- `setupGameHandlers` 등록/해제 lifecycle을 연결한다.
- `emitRollDice`, `emitConfirmPenalty`, `emitSendChat`를 구현한다.
- 턴 타이머 reset을 `turn_start.timeout_sec` 기준으로 연결한다.

3. FE-B 게임 액션 API
- `GAME-001 buy`, `GAME-002 build`, `GAME-003 sell` 구현.
- 소켓 동기화 전 `GAME-004 state` 재접속 확인 흐름 구현.
- `401/403/404/409/500` 오류를 명시적으로 처리.

4. FE-C 보드 단일화
- `GamePage`의 보드 경로를 `LegacyBoardGame`에서 store 기반 보드로 전환.
- 보드 렌더러를 하나로 유지(`GameBoard` 경로 기준).
- 타일 타입 매핑 테이블을 한 곳에서 관리.

5. FE-C 시각 완성
- `player_moved` 기준 순차 이동 애니메이션 구현.
- store 변경에 따라 건물/소유 상태 렌더링.
- jail/penalty/game-over 관련 시각 상태 처리.

6. 공동 안정화
- MSW payload와 API/Socket 명세 payload 차이를 점검.
- legacy/new store 경로 간 숨은 결합 제거.
- 전체 시나리오(시작 -> 턴 -> 이벤트 -> 파산/종료) 점검.

## 4) FE-B 체크리스트

- [ ] 소켓 connect/disconnect lifecycle 정의 및 코드 반영
- [ ] `SOCK-005 roll_dice` emit 구현
- [ ] `SOCK-006 confirm_penalty` emit 구현
- [ ] `SOCK-007 send_chat` emit 구현
- [ ] `SOCK-009` 수신 시 턴 타이머 reset
- [ ] `SOCK-010/011` 수신 시 주사위/위치 상태 반영
- [ ] `SOCK-013/014/015/029` 수신 시 모달/상태 반영
- [ ] `SOCK-018` 수신 시 결과 상태 및 승자 반영
- [ ] `GAME-001~004` UI 액션에 통합

## 5) FE-C 체크리스트

- [ ] 보드가 game store 상태만 참조하도록 정리
- [ ] 32칸 인덱스/방향 매핑 검증
- [ ] 같은 칸 다중 플레이어 겹침 규칙 구현
- [ ] 건물 단계 `0~5` 시각 규칙 구현
- [ ] 턴/라운드/주사위 상태 표시 동기화
- [ ] 연속 이벤트 수신 시 애니메이션 큐 규칙 정의

## 6) 리스크 통제

- 리스크: 이중 스토어 경로(`legacy.useGameStore`, `game.store`) 혼선
- 통제: 게임 도메인 import는 `game.store`만 허용
- 리스크: 명세 네이밍 불일치(`city/property`, `island/jail`)
- 통제: 변환 레이어 1곳, 매핑 파일 1곳으로 고정
- 리스크: mock payload와 실서버 payload 불일치
- 통제: 런타임 payload 가드 + 시나리오 테스트

## 7) 품질 게이트

1. Unit Gate
- store 액션 및 매핑 함수 테스트

2. Integration Gate
- 소켓 시나리오 테스트(`turn_start -> dice_rolled -> player_moved -> tile events`)
- API 오류코드 UI 동작 테스트

3. E2E Gate
- 전체 게임 플레이 1회 완주 테스트
- 재접속 시나리오 테스트
- AI 벌칙 확인 시나리오 테스트

4. Release Gate
- mock OFF 스모크 테스트 통과
- 콘솔 런타임 에러 0건
- 인코딩 깨짐 문자열 0건

## 8) 지금 바로 시작할 작업

1. FE-B: 소켓 lifecycle + C->S emit 모듈 구현
2. FE-C: `LegacyBoardGame` 의존 제거, store 기반 보드 경로로 전환
3. FE-B: `GAME-001~004` 연동 + 오류코드 UI 처리
4. FE-C: 이동/건물/특수칸 시각 완성
5. 공동: 통합 시나리오 점검 후 문서 상태 업데이트
