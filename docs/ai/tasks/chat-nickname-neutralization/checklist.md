# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] `RoomChat` 닉네임 색을 기본 어두운 텍스트로 통일했다
- [x] waiting-room `HOST` badge metadata를 제거했다
- [x] 게임 `TURN` badge metadata를 제거했다
- [x] 공용 `RoomChat` sender badge 렌더링 경로를 제거했다

## Testing

- [x] `npx vitest run src/features/room-chat/RoomChat.test.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/GamePage.test.tsx`
- [x] `npm run ai:check:lobby`
- [x] `npm run ai:check:waiting-room`
- [x] `npm run ai:check:game`
- [x] `npm run lint`
- [x] `npm run build`

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] 닉네임 색 통일 / HOST 제거 / TURN 제거 회귀를 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- chat-nickname-neutralization` 출력이 현재 상태와 맞는다
- [x] `npm run ai:self-review -- --files ...`를 실행했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
