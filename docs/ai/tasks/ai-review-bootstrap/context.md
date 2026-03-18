# Context

## 현재 상태

- PR 템플릿은 관련 이슈, 작업 내용, 체크리스트, 스크린샷 정도만 포함한다.
- 저장소에는 `scripts/ai/self-review.mjs`, `scripts/ai/check-ui.mjs`가 있지만 수동 실행이다.
- CI와 husky는 `lint/test/coverage/e2e/build`를 자동화하지만, AI 기반 리뷰 요약은 PR에 자동으로 남지 않는다.

## 판단

- 이 프로젝트는 이미 문서 기반 AI 워크플로우 구조를 갖고 있으므로, 1차 보강은 비용 없는 경량 PR 코멘트 자동화가 적절하다.
- OpenAI API나 외부 SaaS를 바로 붙이기보다, 기존 스크립트를 재사용해 팀 전체에 적용 가능한 반자동 리뷰 단계를 먼저 만들 수 있다.
- PR 템플릿도 task 문서 링크, 검증, 리스크를 더 구조적으로 요구해야 팀 단위 적용력이 높아진다.

## 제외 범위

- OpenAI API 기반 생성형 PR 리뷰
- inline code review comment 자동화
- branch protection에 AI 리뷰를 필수 게이트로 묶는 작업

위 항목은 AI 리뷰가 안정화된 뒤 후속 작업으로 분리한다.
