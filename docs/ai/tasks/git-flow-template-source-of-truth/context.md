# Context

## Current Behavior

- `ai:git-flow`는 issue/PR 본문을 템플릿 파일에서 읽지 않고 내부 문자열로 직접 조립한다.
- issue 제목도 issue template frontmatter `title` prefix를 쓰지 않고 `${type}: ${title}`로 만든다.
- `gh issue create` 시 template labels를 적용하지 않는다.
- parser가 미지원 옵션을 무시해도 실패하지 않아 입력 누락을 눈치채기 어렵다.

## Related Files

- `scripts/ai/git-flow.mjs`
- `scripts/ai/git-flow.test.ts`
- `.github/ISSUE_TEMPLATE/*`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `docs/ai/usage.md`
- `docs/ai/quickstart.md`

## Constraints

- source of truth는 `.github` 템플릿 파일이어야 한다.
- preview 모드는 네트워크 없이 deterministic해야 한다.
- execute 모드 순서(issue -> branch/commit/push -> PR)는 유지한다.
- large/high-risk PR의 `pr-gate` 기대 섹션은 그대로 살아 있어야 한다.

## Decision Notes

- 템플릿 heading 순서와 section 이름은 파일 원문을 그대로 따르고, section body만 동적으로 채운다.
- issue template frontmatter는 최소 `title`, `labels`를 파싱한다.
- task 문서가 있으면 Goal / In Scope / Completion Criteria / Current Behavior / Decision Notes를 issue/PR 내용의 우선 source로 쓴다.
- task 문서가 없으면 title + changed files + validationCommands 기반 fallback 문구를 쓴다.
- 현재 문서에 없는 CLI 확장은 최소화하고, 대신 unknown flag를 에러로 바꾼다.
