# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] room leave API 계약과 현재 GamePage 흐름을 정리했다
- [x] game 페이지용 room leave API helper를 추가했다
- [x] GamePage exit confirm을 async leave 흐름으로 변경했다
- [x] ExitGameModal pending 상태를 추가했다
- [x] 관련 테스트를 추가/갱신했다

## Testing

- [x] 대상 Vitest를 실행했다
- [x] `npm run build`를 실행했다

## Review

- [x] leave 성공 이후에만 로비 이동하도록 정리했다
- [x] leave 실패 시 현재 화면 유지와 오류 안내를 추가했다
- [x] mock/real 경로가 함께 동작하도록 맞췄다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
