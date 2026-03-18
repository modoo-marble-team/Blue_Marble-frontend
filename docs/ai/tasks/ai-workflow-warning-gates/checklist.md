# Checklist

## Implementation

- [x] 큰 변경 기준(파일 수 또는 고위험 경로)을 workflow에 정의했다
- [x] 큰 변경인데 task 문서 링크가 없을 때 warning을 추가했다
- [x] `실행한 검증` 섹션이 비어 있거나 placeholder 그대로면 warning을 추가했다
- [x] `남은 리스크` 섹션이 비어 있거나 placeholder 그대로면 warning을 추가했다
- [x] warning 결과를 `AI Review` 코멘트에 함께 표시했다

## Testing

- [x] changed files `prettier --check`
- [x] `npm run ai:self-review -- --files ...`

## Review

- [x] warning은 advisory only로 유지했다
- [x] 기준이 과도하게 엄격하지 않은지 확인했다
- [x] 기존 self-review / UI plan 코멘트 구조를 해치지 않는지 확인했다
