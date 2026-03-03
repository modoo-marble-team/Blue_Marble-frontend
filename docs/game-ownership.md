# 게임 영역 파일 소유권 및 분업 기준

이 문서는 현재 프로젝트 코드 기준으로 FE-B와 FE-C의 게임 영역 책임을 다시 정리한 기준 문서다.
기존 문서의 인코딩 손상과 초기 추정 분업표는 이 문서로 대체한다.

## 1. 분업 범위

### 포함 범위

- 게임 페이지 진입 이후의 화면과 상태
- 게임 전용 store, socket, API 연동
- 보드 렌더링, 말 이동, 타일 소유 상태, 건물 표시
- 게임 전용 모달과 턴 제어 UI

### 제외 범위

다음 영역은 게임 외 영역으로 보고 FE-A 담당으로 제외한다.

- 로비
- 로그인
- 랜딩
- 대기방 일반 UI
- 메신저/채팅방 전반
- 프레즌스, 방 목록, 일반 room 공용 UI

## 2. 파일 소유권

### FE-B 주 담당

게임 로직, 상태 계약, 소켓/API 연동, 게임 전용 모달/컨트롤

- `src/stores/game.store.ts`
- `src/services/game/game.api.ts`
- `src/services/socket/game.handler.ts`
- `src/hooks/game/*`
- `src/components/game/controls/*`
- `src/components/game/modals/*`
- `src/pages/GamePage.tsx`
- `src/mocks/gameMockData.ts`
- `src/mocks/handlers/game.handler.ts`

### FE-C 주 담당

게임 보드 렌더링, 타일/말/건물 시각화, 보드 레이아웃과 애니메이션

- `src/components/board/*`
- `src/game/phaserConfig.tsx`
- `src/styles/board.css`

### 공동 관리

양쪽이 계약을 맞춰야 하는 공용 타입/도메인

- `src/types/domain.ts`

## 3. 현재 코드 기준 실제 경계

### FE-B가 이미 깊게 들어가 있는 파일

다음 파일은 원래 FE-C와 경계가 닿지만, 현재 구조상 FE-B 로직이 일부 들어가 있다.

- `src/components/board/GameBoard.tsx`

사유:

- 구매/건설/매각 API 호출
- 통행료 계산
- AI 패널티 처리
- 파산 처리
- 각종 모달 open/close 로직

정리 원칙:

- 단기적으로는 이 파일에서 FE-B 로직을 허용한다.
- 중기적으로는 FE-B 로직을 hooks/store/services 쪽으로 빼고, FE-C는 렌더링 책임만 남기는 방향이 맞다.

## 4. 진행도 평가

### FE-B 진행도: 80%

완료된 축:

- roomId 기반 API/소켓 계약 정합화
- game store 구축
- socket handler lifecycle 및 주요 이벤트 반영
- mock/real 분기 일부 정리
- 게임 전용 주요 모달 UI 다수 구현
- mock 자금/전체 턴 테스트 모드 보강

남은 핵심:

- mock 한 턴 전체 검증 마무리
- 서버 authoritative 흐름으로 최종 정리
- `GameBoard` 안의 FE-B 로직 일부 분리
- 남은 게임 모달 3개 구현

### FE-C 진행도: 50%

완료된 축:

- 보드 기본 레이아웃
- 타일/말/건물 렌더링 기본 구조
- `GameBoard` 기반 플레이 가능 화면 뼈대

남은 핵심:

- `LegacyBoardGame` 의존 정리
- store 중심 보드 렌더 구조로 수렴
- 보드 로컬 상태와 store 이중화 제거
- 이동/건물/소유권 표시의 최종 안정화

## 5. 현재 프로젝트 기준 핵심 리스크

1. `GamePage`가 여전히 로컬 보드 상태를 많이 들고 있다.

- `boardPlayers`
- `boardCurPlayer`

2. `GameBoard.tsx` 안에 FE-B와 FE-C 책임이 섞여 있다.

3. mock 흐름과 실제 서버 authoritative 흐름이 100% 같지 않다.

4. FE-A 영역과 겹치는 공용 UI 파일을 잘못 수정하면 분업이 다시 깨진다.

## 6. 수정 원칙

### FE-B 작업 시

- FE-A 영역 파일은 수정하지 않는다.
- 보드 렌더링 자체보다 계약, 상태, API, socket에 집중한다.
- 보드 파일 수정이 필요하면 "게임 로직 보강" 범위로 최소화한다.

### FE-C 작업 시

- socket/API/store 계약을 새로 만들지 않는다.
- FE-B가 만든 상태를 읽어서 렌더링하는 쪽으로 정리한다.
- 임의 로컬 상태를 늘리지 않는다.

## 7. 최종 목표

- FE-B: 게임 상태와 연동 책임을 안정적으로 제공
- FE-C: 그 상태를 보드에서 정확하게 시각화
- FE-A: 게임 외 영역을 완전히 분리 관리

이 문서 기준으로 분업 충돌이 생기면, 코드 소유권은 "현재 실제 책임"을 우선으로 판단한다.
