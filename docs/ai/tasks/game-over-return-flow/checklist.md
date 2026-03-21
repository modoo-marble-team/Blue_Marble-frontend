# Checklist

- [ ] 결과 모달 확인 시 `roomId`가 있으면 같은 대기방(`/rooms/:roomId`)으로 이동한다.
- [ ] 결과 모달 확인 시 `roomId`가 없으면 `/lobby`로 이동한다.
- [ ] 종료 상태에서는 fatal game error가 있어도 결과 확인 전 자동 fallback 이동하지 않는다.
- [ ] 결과 모달 확인 및 fatal game fallback 전에 `resetGame()`이 호출된다.
- [ ] `GamePage` 테스트와 build/lint 검증이 통과한다.
