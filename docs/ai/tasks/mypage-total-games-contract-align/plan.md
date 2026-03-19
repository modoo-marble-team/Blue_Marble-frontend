# Plan

## Task

- 작업 이름: mypage total_games contract align
- 요청 날짜: 2026-03-19
- 담당 범위: auth profile API 매핑, 관련 테스트, task 문서

## Goal

- `/users/me` 응답 전적 필드가 `stats.total_games`로 확정된 계약을 프론트에서 안전하게 흡수한다.

## In Scope

- `MyPageProfilePayload` 타입을 새 계약 기준으로 정리
- 내부 프로필 모델의 `stats.total`로 매핑 보정
- 관련 Vitest 갱신

## Out Of Scope

- 마이페이지 UI 구조 변경
- 백엔드 문서/서버 코드 수정
- 다른 auth/presence/game 계약 정리

## Target Files

- `src/features/auth/api/api.ts`
- `src/features/auth/api/api.test.ts`
- `docs/ai/tasks/mypage-total-games-contract-align/*`

## Completion Criteria

- `/users/me`가 `stats.total_games`를 반환해도 마이페이지 총 게임 수가 정상 표시된다.
- 관련 테스트가 새 계약 기준으로 통과한다.

## Test Plan

- `npx vitest run src/features/auth/api/api.test.ts`
- 필요 시 `npm run lint`
