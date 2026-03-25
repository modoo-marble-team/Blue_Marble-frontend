# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] `GamePage`가 `BoardGame.onBlockingModalChange`를 사용하도록 다시 연결했다
- [x] 턴 제어 / 버튼 모드 / 자산 액션 허용 조건에 board blocking 상태를 반영했다
- [x] `START`/일반 `PROPERTY`처럼 모달이 없는 도착 경로도 같은 기준을 따르도록 유지했다

## Testing

- [x] `npx vitest run src/pages/GamePage.test.tsx`
- [x] `npm run lint`
- [x] `npm run ai:check:game`
- [x] `npm run build`

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] blocked 상태에서 `END_TURN` emit이 되지 않는지 확인했다
- [x] unblocked 상태에서만 `턴 종료` 모드로 바뀌는지 확인했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] session handoff notes를 최신 상태로 갱신했다
- [x] `npm run ai:self-review -- --files ...`를 실행했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
