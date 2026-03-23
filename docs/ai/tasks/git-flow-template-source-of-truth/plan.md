# Plan

## Task

- 작업 이름: git flow template source of truth
- 요청 날짜: 2026-03-24
- 담당 범위: `scripts/ai/git-flow.mjs`, 관련 테스트, 사용 문서, task 문서

## Goal

- `ai:git-flow`가 내부 문자열이 아니라 `.github/ISSUE_TEMPLATE/*.md`와 `.github/PULL_REQUEST_TEMPLATE.md`를 source of truth로 사용해 issue/PR 내용을 생성하게 만든다.
- issue 제목 prefix와 labels도 issue template frontmatter 기준으로 정렬한다.
- 미지원 CLI 옵션을 조용히 무시하지 않고 즉시 실패시킨다.

## In Scope

- PR template 기반 body 렌더링
- type별 issue template 기반 제목/body/labels 렌더링
- task 문서와 changed files를 이용한 실제 작업 내용 채우기
- strict CLI arg parsing
- 관련 Vitest 및 사용 문서 반영

## Out Of Scope

- 기존 원격 issue/PR 본문 자동 수정
- branch 전략 또는 GitHub Settings 변경
- 새로운 git-flow 하위 명령 추가

## Completion Criteria

- preview와 execute 모두 template 기반 scaffold를 사용한다.
- issue 제목이 `${type}: ${title}`가 아니라 template frontmatter prefix를 따른다.
- `gh issue create`가 template labels를 함께 적용한다.
- PR `작업 내용`에서 git-flow 메타 문구가 사라지고 실제 변경 내용이 들어간다.
- unknown CLI flag는 즉시 에러가 난다.

## Test Plan

- `npx vitest run scripts/ai/git-flow.test.ts`
- `node scripts/ai/git-flow.mjs --json --files src/pages/MyPage.tsx src/features/auth/profile/hooks/useMyPageNicknameForm.ts docs/ai/tasks/mypage-nickname-change/plan.md docs/ai/tasks/mypage-nickname-change/context.md docs/ai/tasks/mypage-nickname-change/checklist.md --task-slug mypage-nickname-change --title "마이페이지 닉네임 변경"`
- `npm run lint`
- `npm run ai:self-review -- --files scripts/ai/git-flow.mjs scripts/ai/git-flow.test.ts docs/ai/usage.md docs/ai/quickstart.md TODO.md docs/ai/tasks/git-flow-template-source-of-truth/plan.md docs/ai/tasks/git-flow-template-source-of-truth/context.md docs/ai/tasks/git-flow-template-source-of-truth/checklist.md`
