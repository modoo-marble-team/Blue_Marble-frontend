# AI Task Workspace

이 디렉토리는 AI가 긴 작업에서 맥락을 잃지 않도록 `계획`, `맥락`, `진행 상태`를 분리해서 저장하는 공간이다.
작업 승인 후 바로 구현하지 말고, 먼저 여기 문서를 만들고 다시 읽은 뒤 구현에 들어가는 것을 권장한다.

## 권장 구조

작업 하나당 아래 구조를 만든다.

```text
docs/ai/tasks/<task-slug>/
  plan.md
  context.md
  checklist.md
```

예시:

```text
docs/ai/tasks/lobby-dm-unread-fix/
docs/ai/tasks/waiting-room-start-guard/
docs/ai/tasks/game-prompt-normalization/
```

## 사용 순서

1. `_template/`의 파일을 새 task 디렉토리로 복사한다.
2. `plan.md`에 목표, 범위, 완료 기준을 먼저 적는다.
3. `context.md`에 참고 파일, 현재 동작, 결정 이유를 적는다.
4. `checklist.md`에 구현/테스트/리뷰 체크박스를 만든다.
5. 새 세션에서 해당 문서 3개를 다시 읽고 구현을 시작한다.

수동 복사가 번거로우면 아래 스크립트로 초안을 만들 수 있다.

```bash
npm run ai:task:new -- auth-refresh-cookie-flow
npm run ai:task:new -- auth-refresh-cookie-flow --files src/lib/axios.ts src/features/auth/api/api.ts
```

- `--files`를 주면 관련 manual과 최소 검증 명령 초안을 함께 채운다.
- 이미 같은 slug가 있으면 실패하고, 의도적으로 덮어쓰려면 `--force`를 사용한다.

## example-\* 디렉토리

`example-*` 디렉토리는 실제 작업 방식 예시를 보여주기 위한 샘플이다.
새 task를 만들 때 템플릿만으로 부족하면, 문제를 어떻게 분해하고 문서화하는지 참고하는 용도로 사용한다.

현재 예시는 아래 관점을 보여주도록 구성했다.

- 실시간 UI와 socket 상태를 문서 기반으로 다루는 방식
- cleanup, 중복 요청, race condition 같은 경계 조건을 먼저 다루는 방식
- 계약 정규화와 mock/real 동기화를 함께 설계하는 방식

즉, 단순 구현 목록이 아니라 범위 정의, 결정 근거, 검증 계획까지 함께 남기는 작업 방식을 보여주는 샘플이다.

## task-slug 규칙

- 짧고 명확하게 쓴다.
- 기능이나 문제를 바로 드러내는 이름을 쓴다.
- 예: `presence-socket-reconnect`, `waiting-room-host-transfer`, `game-chat-roomid-cleanup`

## 주의

- `_template/`는 원본으로 유지하고 직접 수정하지 않는다.
- 작업 중 결정이 바뀌면 코드보다 먼저 `context.md`나 `checklist.md`를 갱신한다.
- 계약 변경이 있으면 관련 `docs/*.md`와 함께 갱신한다.
