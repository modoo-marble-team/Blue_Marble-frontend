# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] 영향 범위를 정리했다
- [x] 최소 범위로 구현했다
- [x] OpenAI summary 제거와 Gemini 설정 추가를 분리해 반영했다
- [x] deterministic workflow 구조를 유지했다

## Testing

- [ ] 대상 Vitest를 실행했다
- [x] 관련 파일 `prettier --check`를 실행했다
- [ ] 필요 시 `npm run build`를 실행했다
- [x] `npm run ai:self-review -- --files ...`를 실행했다

## Review

- [x] `docs/rules.md` 기준으로 셀프 리뷰했다
- [x] 기존 PR comment 구조가 warning / validation / self-review / UI plan 중심으로 유지되는지 확인했다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
