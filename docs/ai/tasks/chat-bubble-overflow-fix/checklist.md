# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] WAT 단계와 역할 분담을 문서에 반영했다
- [x] 최소 범위로 구현했다
- [x] mock/real 경로를 함께 확인했다
- [x] 타입/contract 변경이 없음을 확인했다

## Testing

- [x] `npx vitest run src/features/room-chat/RoomChat.test.tsx src/features/presence/components/DirectMessagePanel.test.tsx`
- [x] `npm run ai:check:lobby`
- [x] `npm run lint`
- [x] `npm run build`, Playwright는 이번 레이아웃/클래스 보강 diff 기준으로 미실행

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] 공용 채팅 / DM / mock-real 공유 UI 경계를 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:session:brief -- chat-bubble-overflow-fix` 출력이 현재 상태와 맞는다
- [x] `npm run ai:self-review -- --files ...`를 실행했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
