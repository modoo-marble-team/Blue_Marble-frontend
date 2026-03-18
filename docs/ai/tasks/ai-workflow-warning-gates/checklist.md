# Checklist

## Implementation

- [x] 큰 변경 기준(파일 수 또는 고위험 경로)을 workflow에 정의했다
- [x] 큰 변경인데 task 문서 링크가 없을 때 warning을 추가했다
- [x] `실행한 검증` 섹션이 비어 있거나 placeholder 그대로면 warning을 추가했다
- [x] `남은 리스크` 섹션이 비어 있거나 placeholder 그대로면 warning을 추가했다
- [x] warning 결과를 `AI Review` 코멘트에 함께 표시했다
- [x] PR 본문에 링크가 없더라도 changed files 안의 task 문서 3종 세트를 fallback으로 인식하도록 보완했다
- [x] raw script 출력과 중복 섹션을 줄이고, warning/required/suggested checks 중심으로 코멘트를 축약했다

## Testing

- [x] changed files `prettier --check`
- [x] `npm run ai:self-review -- --files ...`

## Review

- [x] warning은 advisory only로 유지했다
- [x] 기준이 과도하게 엄격하지 않은지 확인했다
- [x] 코멘트가 길이 대비 신호가 더 높아졌는지 확인했다
