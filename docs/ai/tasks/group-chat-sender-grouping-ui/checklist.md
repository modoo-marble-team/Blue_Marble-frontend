# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] `RoomChat`에 sender metadata와 message grouping UI를 추가했다
- [x] 대기방/게임에서 sender metadata를 주입했다
- [x] DM/overflow/300자 제한 기존 동작을 유지했다

## Testing

- [x] `npx vitest run src/features/room-chat/RoomChat.test.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/GamePage.test.tsx`
- [x] `npm run ai:check:lobby`
- [x] `npm run ai:check:waiting-room`
- [x] `npm run ai:check:game`
- [x] `npm run lint`

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] grouping / badge / optimistic chat 회귀 여부를 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- group-chat-sender-grouping-ui` 출력이 현재 상태와 맞는다
- [x] `npm run ai:self-review -- --files ...`를 실행했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
