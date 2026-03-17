# Checklist

## Implementation

- [x] PR 템플릿에 task 문서 링크, 실행한 검증, 남은 리스크 섹션을 추가했다
- [x] `pull_request` 이벤트용 `ai-review-lite.yml` workflow를 추가했다
- [x] changed files 기준으로 `ai:self-review`와 `ai:check:ui -- --plan`을 실행하도록 구성했다
- [x] 동일 PR에 기존 봇 코멘트를 업데이트하는 방식으로 중복 코멘트를 줄였다

## Testing

- [x] `npm run ai:self-review -- --files ...`
- [x] changed files `prettier --check`

## Review

- [x] AI 리뷰는 advisory only이며 기존 CI 게이트를 대체하지 않도록 유지했다
- [x] PR 템플릿이 지나치게 장황해지지 않았는지 확인했다
- [x] workflow가 OpenAI API나 추가 secret 없이 동작하도록 제한했다
