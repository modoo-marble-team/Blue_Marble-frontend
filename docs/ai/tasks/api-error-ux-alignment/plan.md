# Plan

## Task

- 작업 이름: 공통 API 에러 응답 UX와 파싱 규칙 정렬
- 요청 날짜: 2026-03-16
- 담당 범위: auth, lobby, waiting-room 공통 에러 처리

## Goal

- `parseApiError`를 중심으로 FastAPI validation error와 비즈니스 에러 body를 같은 규칙으로 해석한다.
- auth, lobby, waiting-room에서 토스트/폼 에러 메시지가 같은 기준으로 보이도록 맞춘다.
- CORS, 네트워크 오류, 401/403/409/422 등 자주 보이는 에러 케이스를 화면에서 예측 가능한 형태로 정리한다.

## In Scope

- `src/lib/apiError.ts`의 detail/message/code 파싱 규칙 점검 및 보강
- auth API/폼에서 사용하는 에러 메시지 매핑 정리
- lobby 방 생성/입장/비밀번호 오류 메시지 규칙 정리
- waiting-room leave/ready/start/join 관련 에러 메시지 규칙 정리
- 필요 시 공통 helper 또는 feature별 message mapping 분리
- 관련 Vitest 갱신

## Out Of Scope

- 백엔드 error body 계약 변경
- room cleanup 서버 처리
- game runtime 에러 UX
- 카카오 OAuth 설정 자체 수정

## Target Files

- `src/lib/apiError.ts`
- `src/features/auth/api.ts`
- `src/features/auth/hooks/useNicknameSetupForm.ts`
- `src/pages/lobby/api.ts`
- `src/pages/lobby/useLobbyRoomActions.ts`
- `src/pages/waiting-room/api.ts`
- 필요 시 관련 테스트 파일

## Completion Criteria

- `parseApiError`가 422 detail 배열, 문자열 detail, code/message body를 일관되게 해석한다.
- auth, lobby, waiting-room에서 같은 종류의 에러가 비슷한 톤과 문구 규칙으로 노출된다.
- 네트워크/CORS 오류가 빈 메시지 대신 사용자에게 이해 가능한 문구로 표시된다.
- 관련 Vitest와 최소 lint/build가 통과한다.

## Test Plan

- 최소 실행 테스트
  - `npx vitest run src/lib/apiError.test.ts`
  - 관련 auth/lobby/waiting-room 테스트
- 추가 검증
  - `npm run lint`
  - 필요 시 `npm run build`
