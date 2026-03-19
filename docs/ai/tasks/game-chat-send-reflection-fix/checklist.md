# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] 최소 범위로 구현했다
- [x] mock/real 경로를 함께 확인했다
- [ ] 타입/contract 변경이 있으면 관련 코드도 같이 수정했다

## Testing

- [x] `npx vitest run src/pages/game/gameChat.test.ts src/pages/GamePage.test.tsx src/pages/waiting-room/hooks/hooks.test.ts`
- [x] `npm run lint`
- [x] `npm run ai:check:game`
- [x] `npm run ai:check:build`

## Review

- [x] Planner 기준 정리 완료
- [x] Implementer 범위 구현 완료
- [x] Reviewer self-review 확인
- [x] Tester 검증 실행
- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] 리다이렉트, cleanup, 중복 구독, 에러 처리 경계를 확인했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
