# Project Conventions

이 문서는 대외용 `README.md`에 다 담기 어려운 협업 규칙을 별도로 정리하는 공간이다. 실제 저장소 운영 규칙은 `AGENTS.md`, `docs/rules.md`, `docs/testing.md`, `.github/*`를 우선 기준으로 삼는다.

## Branch Strategy

- 기본 보호 브랜치: `main`, `develop`
- 기능 작업은 주제별 브랜치를 생성한 뒤 PR로 병합한다.
- 직접 push보다 review 기반 병합을 우선한다.

권장 브랜치 예시:

- `feat/lobby-direct-message`
- `fix/mypage-back-button`
- `docs/public-readme-project-docs`

## Commit Convention

프로젝트에서는 아래 접두사를 기본으로 사용한다.

| Prefix     | 설명                     |
| ---------- | ------------------------ |
| `feat`     | 새로운 기능              |
| `fix`      | 버그 수정                |
| `docs`     | 문서 추가 및 수정        |
| `refactor` | 동작 변경 없는 구조 개선 |
| `test`     | 테스트 추가 및 수정      |
| `chore`    | 기타 작업                |
| `build`    | 빌드 / 설정 변경         |

예시:

```text
feat: add lobby direct message unread badge
fix: limit mypage back button click area
docs: rebuild public project readme
```

## Pull Request Convention

- 제목은 변경 의도가 바로 보이게 작성한다.
- 본문에는 작업 내용, 실행한 검증, 남은 리스크를 남긴다.
- 큰 작업이면 task 문서와 `TODO.md` 연결 상태를 함께 적는다.

권장 PR 본문 체크:

- 무엇을 바꿨는가
- 왜 바꿨는가
- 어떤 검증을 실행했는가
- 아직 남은 리스크가 있는가

## Frontend Code Convention

- 페이지는 의도를 드러내고 상세 로직은 hook / controller / api 계층으로 분리한다.
- 이벤트 핸들러는 `handle*` 네이밍을 유지한다.
- 컴포넌트는 기존 React + TypeScript 패턴에 맞춘다.
- 문서화와 테스트도 코드 변경과 함께 움직인다.

## Backend / Infra Convention

백엔드 세부 규칙은 별도 저장소 또는 팀 문서를 따른다. README 대외 공개 버전에는 아래 정도만 요약한다.

- API / DB / 인증 규칙은 문서로 관리한다.
- 운영 인프라 변경은 PR과 배포 노트에 남긴다.

## Communication

- 주요 의사결정은 PR, 이슈, 문서에 남긴다.
- 사용자 흐름 또는 계약이 바뀌면 명세서도 함께 갱신한다.
