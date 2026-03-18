# Context

## 현재 상태

- `AI Review`는 changed files, warning, validation, self-review 결과를 PR 코멘트에 자동으로 남긴다.
- 하지만 큰 변경에 task 문서 링크가 없는지, PR 본문에 검증/리스크가 비어 있는지는 자동으로 보지 않는다.
- PR 템플릿은 보강됐지만, 실제 작성 누락을 드러내는 장치가 아직 없다.

## 판단

- 1차 경량 도입 다음 단계는 생성형 리뷰보다 먼저 "문서/검증/리스크 누락을 보이게 만드는 warning 게이트"가 맞다.
- 이 단계는 비용이 들지 않고 팀 적용력을 높이며, 이력서/블로그에서 "문서 기반 워크플로우를 PR 프로세스에 강제했다"는 설명으로 이어진다.
- merge blocker까지 올리기 전에 advisory warning으로 운영하는 편이 안정적이다.
- 다만 task 문서를 실제로 만들었는데 PR 본문 링크만 빠져도 warning이 뜨면 노이즈가 커지므로, changed files 안의 `plan/context/checklist` 3종 세트를 fallback 증거로 인정하는 편이 실용적이다.
- 현재 코멘트는 raw script 출력과 중복 섹션이 길어 읽기 부담이 있어, warning과 required/suggested checks 위주로 줄이는 편이 실용적이다.

## 제외 범위

- OpenAI API 기반 생성형 리뷰
- inline code comment
- branch protection 필수 게이트
- 작업 규모를 완벽히 판정하는 정교한 분류기

이번 단계에서는 실용적인 기준(고위험 경로 또는 변경 파일 수)을 사용한다.
