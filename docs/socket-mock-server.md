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

## 3. 계약 위치

- 이벤트/타입: `src/contracts/socket/events.ts`
- payload 스키마: `src/contracts/socket/schemas.ts`

## 4. 주의사항

- 현재 서버는 개발용 mock이며 영속 저장소를 사용하지 않습니다
- PR1 범위 기준으로 최소 동작/검증만 포함합니다
