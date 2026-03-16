# Context

## Current Behavior

- 공통 에러 파서는 `status`, `code`, `detail`, `message`를 추출하지만, 화면에서 어떤 필드를 우선 사용해야 하는지는 feature마다 다르게 해석하고 있다.
- auth, lobby, waiting-room에서 같은 종류의 실패여도 토스트나 helper 문구가 조금씩 다르게 보인다.
- 실백엔드 검증 중 CORS, 네트워크 실패, FastAPI 422 validation error, 비즈니스 `code/message` 응답이 모두 노출되고 있어 사용자 문구 규칙이 중요해졌다.
- 일부 화면은 detail 배열에서 첫 메시지를 쓰고, 일부는 message만 보고, 일부는 feature 내부 하드코딩 문구를 우선 사용한다.

## Related Files

- `src/lib/apiError.ts`
- `src/features/auth/api.ts`
- `src/features/auth/hooks/useNicknameSetupForm.ts`
- `src/pages/lobby/api.ts`
- `src/pages/lobby/useLobbyRoomActions.ts`
- `src/pages/waiting-room/api.ts`
- 관련 테스트 파일

## Constraints

- backend error body 계약을 프론트에서 추측해 과하게 확장하지 않는다.
- feature별 도메인 문구가 필요한 경우에도 공통 파싱 기준은 유지한다.
- mock/real 경로 모두 같은 사용자 경험을 크게 벗어나지 않게 맞춘다.
- 방 생성/입장/대기방 cleanup 흐름 자체를 다시 건드리지는 않는다.

## Decision Notes

- 공통 파서에서는 “응답 해석”만 하고, feature에서는 “사용자 문구 선택”을 담당하게 유지하는 편이 안전하다.
- 네트워크/CORS 오류처럼 서버 body가 없는 케이스는 공통 fallback 문구가 필요하다.
- 422 배열 detail과 비즈니스 error body는 모두 최종적으로 하나의 문자열 메시지로 수렴시켜야 UI가 단순해진다.

## Open Risks

- backend가 같은 status라도 endpoint마다 다른 body shape를 내려주면 feature별 예외 처리가 일부 남을 수 있다.
- room cleanup 서버 이슈로 인해 “진짜 에러”와 “stale state”가 섞여 보이는 경우는 이번 작업 범위 밖이다.
