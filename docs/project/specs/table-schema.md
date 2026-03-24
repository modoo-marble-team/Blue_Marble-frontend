# Table Schema

이 문서는 테이블 명세서의 공개용 요약본이다.

## What To Put Here

- 테이블 이름
- 주요 컬럼
- PK / FK 관계
- 설명
- 원본 명세 링크

## Suggested Table Format

| Table   | Purpose          | Key Columns                  |
| ------- | ---------------- | ---------------------------- |
| `users` | 사용자 기본 정보 | `id`, `nickname`, `provider` |
| `rooms` | 방 메타데이터    | `id`, `title`, `status`      |
| `games` | 게임 세션 정보   | `id`, `room_id`, `status`    |

## Source Link

- Spreadsheet: https://docs.google.com/spreadsheets/d/1Xq0YsYCvV3xzFYTsfubVfVqsGeOol7Ah/edit?gid=507107377#gid=507107377
