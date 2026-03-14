# Waiting Room Manual

이 manual은 `src/pages/waiting-room/**`를 수정할 때 읽는다.

## 1. 이 영역의 역할

대기방은 화면 하나처럼 보이지만 실제로는 아래 흐름을 묶는 조정 계층이다.

- 입장/초기 스냅샷 복구
- 준비/시작/퇴장 액션
- 대기방 socket 이벤트 구독
- 대기방 채팅
- 접속자 목록/DM 패널 조합
- 게임 시작 시 `gameId` 기반 화면 전환

즉, UI만 건드린다고 생각해도 lifecycle과 socket cleanup을 같이 보지 않으면 쉽게 회귀가 난다.

## 2. 현재 구조 기준

- `WaitingRoomPage.tsx`
  - 화면 조합, toast, navigation, 세션 메뉴, DM 패널 담당
- `hooks.ts`
  - 대기방 전체 controller 진입점
- `controller/lifecycle.ts`
  - 초기 입장, pre-join snapshot 처리, 첫 로딩/에러 복구
- `controller/socketSync.ts`
  - `player_ready`, `host_changed`, `chat`, `game_start` 구독
- `controller/actions.ts`
  - 준비 토글, 게임 시작, 수동/cleanup 퇴장 시퀀스
- `socket.ts`
  - 대기방 socket 송수신 추상화

새 로직이 필요하면 이 경계를 유지한 채 넣는다.

## 3. 꼭 지켜야 할 규칙

- `useWaitingRoomController`는 조립 계층으로 유지하고, 상세 상태 전이는 controller 하위 모듈에 둔다.
- 수동 퇴장과 cleanup 퇴장은 같은 시퀀스를 재사용한다.
- `leaveWaitingRoom` API 성공 전에 `leave_room` 소켓 이벤트를 먼저 보내지 않는다.
- StrictMode cleanup 스킵, 중복 퇴장 방지 ref, in-flight leave 재사용 규칙을 깨지 않는다.
- `preJoinedSnapshot`은 빠른 초기화 용도일 뿐, 최종 진실 소스는 대기방 상태 동기화다.
- host는 ready 토글 불가, 시작은 host만 가능, 시작 조건은 최소 2명 + non-host 전원 ready 규칙을 따른다.
- 게임 시작 시 `game_id`, `room_id`를 함께 들고 이동하는 현재 흐름을 유지한다.

## 4. 같이 봐야 하는 파일

- `src/pages/waiting-room/WaitingRoomPage.tsx`
- `src/pages/waiting-room/hooks.ts`
- `src/pages/waiting-room/controller/actions.ts`
- `src/pages/waiting-room/controller/lifecycle.ts`
- `src/pages/waiting-room/controller/socketSync.ts`
- `src/pages/waiting-room/socket.ts`
- `docs/socket-mock-server.md`

이 영역은 로비/presence와도 연결되므로 DM/접속자 목록을 건드리면 `docs/ai/manuals/lobby.md`도 같이 읽는다.

## 5. 테스트 기준

이 영역 수정 시 우선 검토할 테스트:

- `src/pages/waiting-room/WaitingRoomPage.test.tsx`
- `src/pages/waiting-room/WaitingRoomFlow.test.tsx`
- `src/pages/waiting-room/api.test.ts`
- `src/pages/waiting-room/controller/actions.test.ts`
- `src/pages/waiting-room/controller/lifecycle.test.ts`
- `src/pages/waiting-room/controller/socketSync.test.ts`
- `src/pages/waiting-room/controller/state.test.ts`
- `src/pages/waiting-room/mockGateway.test.ts`

대기방 시작 플로우를 건드렸으면 아래 E2E도 검토한다.

- `e2e/waiting-room-start-flow.spec.ts`

## 6. 변경 전 체크 질문

- 이 수정이 UI 문제인가, lifecycle 문제인가, socket sync 문제인가, action 문제인가?
- 언마운트/뒤로가기/로그아웃 시 퇴장 시퀀스가 여전히 안전한가?
- mock gateway와 실제 socket path가 같은 계약을 따르는가?
- 게임 시작 후 `navigate('/game/:gameId')` 흐름과 location state가 깨지지 않는가?
