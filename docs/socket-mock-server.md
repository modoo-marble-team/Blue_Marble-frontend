# Socket Mock Server

백엔드 구현 전 소켓 이벤트 계약과 payload 경계를 검증하기 위한 로컬 mock 서버입니다.

## 1. 실행 방법

```bash
npm run socket:mock
```

- 기본 포트: `3000`
- 변경 포트: `MOCK_SOCKET_PORT=4000 npm run socket:mock`

## 2. 제공 기능

- `GET /health`
- `GET /api/health`
- 소켓 연결/해제 시 `online_users` 브로드캐스트
- `enter_room`, `leave_room` 검증 및 상태 갱신
- `send_chat` 룸 브로드캐스트
- `dm_send` -> `dm_receive` 전달
- DM 정책: 송신자/수신자 중 `playing` 상태가 있으면 차단
- 사용자용 `send_chat`, `dm_send` 메시지는 `trim()` 후 최대 300자까지 허용
- `toggle_ready` 준비 상태 토글 + `player_ready` 브로드캐스트
- `start_game` 시작 조건 검증 + `game_start` 브로드캐스트
- 방장 퇴장 시 `host_changed` 브로드캐스트

## 3. 계약 위치

- 이벤트/타입: `src/contracts/socket/events.ts`
- payload 스키마: `src/contracts/socket/schemas.ts`

## 4. 주의사항

- 현재 서버는 개발용 mock이며 영속 저장소를 사용하지 않습니다
- 현재 문서는 PR3 범위(입퇴장 + 준비/시작 규칙) 기준입니다

## 5. 대기방 규칙/에러 코드

- 시작 조건: 최소 2명 + non-host 전원 준비 완료
- host만 시작 가능, host는 ready 토글 불가

대표 에러 코드:

- `ROOM_NOT_FOUND`
- `ROOM_FULL`
- `ROOM_ALREADY_PLAYING`
- `ALREADY_LEFT_ROOM`
- `PLAYER_NOT_IN_ROOM`
- `HOST_CANNOT_TOGGLE_READY`
- `ONLY_HOST_CAN_START`
- `READY_CONDITION_NOT_MET`
- `DM_BLOCKED_WHILE_PLAYING`
