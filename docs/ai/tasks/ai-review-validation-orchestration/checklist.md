# Checklist

## Implementation

- [x] changed files 기준 검증 전략 계산 함수를 추가했다
- [x] `required`와 `suggested` 검증을 나누는 출력 스크립트를 추가했다
- [x] `package.json`에 관련 스크립트를 연결했다
- [x] `AI Review` 코멘트에 `Validation Orchestration` 섹션을 추가했다
- [x] 기존 self-review / warning gate 흐름과 충돌하지 않게 유지했다

## Testing

- [x] changed files `prettier --check`
- [x] `node scripts/ai/validation-plan.mjs --files ...`
- [x] `npm run ai:self-review -- --files ...`

## Review

- [x] deterministic한 규칙만 사용했다
- [x] required/suggested 구분이 현재 testing guide와 크게 어긋나지 않는지 확인했다
- [x] UI 변경에서 build/e2e가 추천으로 드러나는지 확인했다
