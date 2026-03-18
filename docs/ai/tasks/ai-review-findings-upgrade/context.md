# Context

## 현재 상태

- `AI Review`는 warning, validation, self-review 결과를 PR 코멘트에 자동으로 남긴다.
- 하지만 self-review는 관련 manual과 고정 체크리스트 중심이라, 실제 diff에서 무엇이 위험한지 바로 읽히지 않는다.
- validation과 UI check의 중복은 줄였지만, 여전히 "리뷰"보다 "체크 계획"에 가깝다는 피드백이 있다.

## 판단

- 생성형 리뷰는 Gemini가 맡고 있으므로, 저장소 안 `AI Review`는 repo 전용 deterministic risk detector 역할에 더 집중하는 편이 맞다.
- 따라서 코멘트 품질을 높이려면 체크리스트를 더 늘리는 것보다, 현재 diff에서 걸리는 `Findings`와 `Test Gaps`를 우선 보여줘야 한다.
- 1차 규칙은 auth transport, lobby, waiting-room, game, socket 변경에서 자주 놓치는 회귀와 테스트 누락을 잡는 수준으로 제한한다.

## 제외 범위

- 생성형 코드 요약/리뷰
- inline code comment 자동 생성
- 복잡한 정적 분석기 또는 AST 기반 규칙 엔진

이번 단계에서는 파일 분류 + 일부 파일 내용 확인 기반의 실용적인 deterministic 규칙만 추가한다.
