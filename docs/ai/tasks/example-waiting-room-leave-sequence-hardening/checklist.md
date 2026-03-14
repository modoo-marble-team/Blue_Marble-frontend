# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 수동 퇴장과 cleanup 퇴장이 공통 시퀀스를 공유해야 한다는 기준을 고정했다
- [ ] `runLeaveRoomSequence` 재진입/중복 완료 조건을 정리한다
- [ ] leave API 성공 이후 emit 순서를 다시 확인한다
- [ ] 페이지에서 중복 leave 로직이 새지 않게 유지한다

## Testing

- [ ] `src/pages/waiting-room/controller/actions.test.ts`를 보강한다
- [ ] 필요 시 `src/pages/waiting-room/WaitingRoomFlow.test.tsx`도 함께 점검한다
- [ ] `npm run ai:check:waiting-room`
- [ ] 필요 시 `npm run ai:check:waiting-room-e2e`

## Review

- [ ] 뒤로가기, 로그아웃, 마이페이지 이동이 같은 안전 규칙을 따르는지 확인한다
- [ ] StrictMode cleanup 스킵 로직이 실제 언마운트까지 막아버리지 않는지 확인한다
- [ ] mock/real 경로의 leave 순서가 같은지 확인한다
- [ ] 변경 파일 / 실행한 검증 / 남은 리스크를 정리한다
