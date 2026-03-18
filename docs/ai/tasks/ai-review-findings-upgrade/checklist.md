# Checklist

## Implementation

- [x] self-review 출력에 `Findings`, `Test Gaps` 섹션을 추가한다
- [x] auth transport 변경 시 기본 계약/테스트 누락 규칙을 추가한다
- [x] lobby / waiting-room / game / socket 변경 시 영역별 테스트 누락 규칙을 추가한다
- [x] PR 코멘트가 findings/test gaps 중심으로 보이도록 workflow를 갱신한다
- [x] review 품질이 길이 대비 신호가 높아지도록 중복 출력을 줄인다

## Testing

- [x] `npx vitest run scripts/ai/lib.test.ts`
- [x] `npx prettier --check ...`
- [x] `npm run ai:self-review -- --files ...`

## Review

- [x] Gemini summary와 역할이 겹치지 않는지 확인한다
- [x] false positive가 과도하지 않은지 확인한다
- [x] findings가 없을 때도 코멘트가 지나치게 길어지지 않는지 확인한다
