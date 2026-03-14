# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] unread state의 source of truth를 `useDirectMessageController`로 고정했다는 가설을 세웠다
- [ ] open DM 대상과 unread reset 타이밍을 단일 경로로 정리한다
- [ ] 접속자 목록 재수신이 unread state를 덮어쓰지 않는지 확인한다
- [ ] UI 컴포넌트에는 표현 책임만 남긴다

## Testing

- [ ] `src/features/presence/useDirectMessageController.test.tsx`를 보강한다
- [ ] `src/features/presence/components/UserListPanel.test.tsx`에서 unread badge 케이스를 확인한다
- [ ] `npm run ai:check:lobby`
- [ ] 필요 시 `npm run ai:check:chat-e2e`

## Review

- [ ] 현재 열려 있는 사용자에게 새 메시지가 올 때 unread count가 증가하지 않는지 확인한다
- [ ] 다른 사용자에게서 온 새 메시지만 count가 증가하는지 확인한다
- [ ] mock/real socket 경로가 같은 계약을 따르는지 확인한다
- [ ] 변경 파일 / 실행한 검증 / 남은 리스크를 정리한다
