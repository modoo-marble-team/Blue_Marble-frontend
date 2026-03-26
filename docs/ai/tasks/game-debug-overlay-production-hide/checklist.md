# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] `env.ts`에 game debug overlay 플래그를 추가했다
- [x] `GamePage`에서 overlay를 production-hide 조건으로 감쌌다
- [x] fatal fallback과 게임 진행 로직을 그대로 유지했다

## Testing

- [x] `npx vitest run src/pages/GamePage.test.tsx`
- [x] `npm run lint`
- [x] `npm run ai:check:game`
- [x] `npm run build`

## Review

- [x] `npm run ai:self-review -- --files ...`를 실행했다
- [x] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
