# Context

## Current Behavior

- 루트 `README.md`는 대외용 프로젝트 소개, 외부 명세 링크, 실제 서비스 스크린샷 갤러리를 포함한다
- `docs/project/` 아래에 공개용 문서 구조와 README 자산 규칙이 정리되어 있다

## Related Files

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `README.md`
- `src/App.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/lobby/LobbyPage.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`
- `src/pages/GamePage.tsx`
- `package.json`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- `docs/ai/*`는 기존 팀 운영 문서로 유지하고 README 대외용 문서와 섞지 않는다
- 코드나 런타임 자산 경로를 바꾸지 않고 문서 구조만 추가한다
- README에서 사용하는 자산은 앱 런타임용 `public/` 대신 `docs/project/` 기준으로 안내한다

## Decision Notes

- 루트 README는 대외용 프로젝트 소개 중심으로 재작성하고, 상세 규칙과 명세서는 `docs/project/`로 분리한다
- 코드에서 확인 가능한 사실은 실제 내용으로 채우고, 외부에서 확정해야 하는 값은 `TODO` 자리표시자로 남긴다
- `public/`에 README 전용 이미지를 섞는 대안은 앱 자산과 문서 자산 경계가 흐려져 제외했다

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `README.md`, `docs/project/*`, `docs/ai/tasks/public-readme-project-docs/*`
- 바로 이어서 할 1개 단계: 실제 배포 URL / 발표 자료 / 팀원 정보를 README 템플릿에 반영
- pending decision / blocker: 공개 가능한 배포 링크와 최종 팀 소개 정보가 아직 없음
- 검증 재개 지점: prettier check와 self-review 결과 확인 후 TODO / task 상태 마감

## Open Risks

- 현재 README에는 실제 배포 링크, 발표 자료, 팀원 정보가 비어 있어 후속 입력이 필요하다
