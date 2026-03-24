# Plan

## Task

- 작업 이름: Public Readme Project Docs
- 작업 slug: public-readme-project-docs
- 요청 날짜: 2026-03-24
- 담당 범위: 루트 README 대외용 재구성 + `docs/project/` 공개 문서 구조 추가

## Goal

- 저장소의 짧은 개발자용 README를 대외용 프로젝트 소개 문서로 재구성한다
- 스크린샷, 아키텍처, 명세서, 협업 규칙을 `docs/project/` 아래에 분리해 README에서 안정적으로 링크할 수 있게 만든다

## WAT Workflow

1. 현재 README와 코드 기준으로 서비스 소개에 쓸 사실을 정리한다
2. 루트 README와 `docs/project/` 공개 문서 구조를 최소 범위로 만든다
3. 문서 검증과 self-review를 실행하고 task/TODO 상태를 마감한다

## In Scope

- `README.md`
- `docs/project/**`
- `docs/ai/tasks/public-readme-project-docs/*`
- `TODO.md`

## Out Of Scope

- 실제 배포 URL, 발표 영상 URL, 최종 팀원 정보 확정
- 실제 스크린샷 / 아키텍처 이미지 / 발표 자료 바이너리 업로드
- 코드 동작 변경

## Target Files

- `README.md`
- `docs/project/conventions.md`
- `docs/project/assets/readme/README.md`
- `docs/project/assets/architecture/README.md`
- `docs/project/specs/*.md`
- `docs/project/presentations/demo-video.md`
- `TODO.md`
- `docs/ai/tasks/public-readme-project-docs/*`

## Task Tracking

- TODO line: - [ ] `public-readme-project-docs` - Public Readme Project Docs (`docs/ai/tasks/public-readme-project-docs/`)
- Session brief: `npm run ai:session:brief -- public-readme-project-docs`
- Reopen docs: `docs/ai/tasks/public-readme-project-docs/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- 루트 README만 읽어도 MARBLE POP의 핵심 흐름과 문서 링크 구조를 이해할 수 있다
- 명세서와 README용 자산을 어디에 넣어야 하는지 저장소 내부 문서로 바로 알 수 있다
- 기존 AI / 개발자 문서는 유지되고 대외용 프로젝트 문서와 섞이지 않는다

## Role Plan

- Planner: 범위 / 완료 기준 / 참고 문서 정리
- Implementer: 최소 범위 구현
- Reviewer: diff / self-review / 위험 신호 확인
- Tester: 검증 명령 실행과 결과 정리

## Test Plan

- `npx prettier --check README.md docs/project docs/ai/tasks/public-readme-project-docs TODO.md`
- `npm run ai:self-review -- --files README.md docs/project/conventions.md docs/project/assets/readme/README.md docs/project/assets/architecture/README.md docs/project/specs/api-spec.md docs/project/specs/requirements.md docs/project/specs/erd.md docs/project/specs/table-schema.md docs/project/specs/screen-spec.md docs/project/presentations/demo-video.md docs/ai/tasks/public-readme-project-docs/plan.md docs/ai/tasks/public-readme-project-docs/context.md docs/ai/tasks/public-readme-project-docs/checklist.md TODO.md`
