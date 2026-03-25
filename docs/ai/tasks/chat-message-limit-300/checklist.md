# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] 공통 상수와 송신 정규화 규칙을 추가했다
- [x] room chat / DM 입력창에 300자 제한을 적용했다
- [x] mock/real send contract와 mock gateway를 같은 기준으로 맞췄다

## Testing

- [x] `npx vitest run src/features/room-chat/RoomChat.test.tsx src/features/presence/components/DirectMessagePanel.test.tsx src/features/presence/direct-message/useDirectMessageController.test.tsx src/features/presence/direct-message/directMessageSocket.test.ts src/pages/waiting-room/socket/mockGateway.test.ts src/pages/GamePage.test.tsx src/pages/waiting-room/socket/socket.test.ts`
- [x] `npm run ai:check:lobby`
- [x] `npm run lint`
- [x] `npm run build`

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] local optimistic state / socket emit / mock path 일치 여부를 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- chat-message-limit-300` 출력이 현재 상태와 맞는다
- [x] `npm run ai:self-review -- --files ...`를 실행했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
