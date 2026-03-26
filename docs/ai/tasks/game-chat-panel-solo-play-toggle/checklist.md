# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] 패널 문구를 `게임방 채팅 테스트 패널`로 정리했다
- [x] mock solo-play 토글과 GamePage 제어 가드를 구현했다
- [x] BoardGame local player 전달 경로를 solo-play 기준으로 정리했다
- [x] solo-play 토글을 패널 밖 HUD control로 이동하고 우측 상단 debug overlay를 제거했다
- [x] mock/real 경계를 모두 확인했다

## Testing

- [x] `npx vitest run src/features/room-chat/DevRoomChatControlPanel.test.tsx src/pages/GamePage.mockSoloPlay.test.tsx`
- [x] `npx vitest run src/services/socket/gameContractAdapters.test.ts`
- [x] `npm run ai:check:game`
- [x] `npm run ai:check:lobby`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npx playwright test e2e/chat-flow-game-room.spec.ts`

## Review

- [x] `npm run ai:self-review -- --files ...`
- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] mock prompt / turn control / board modal 경계를 확인했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
