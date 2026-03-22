# AGENTS.md

`Blue_Marble-frontend`에서 AI-assisted 작업 전반에 적용되는 팀 공용 운영 규칙이다.
목표는 특정 도구의 대화 기억이 아니라, **팀이 공유하는 문서와 검증 기준**에 따라 일하게 만드는 것이다.

## 1. 기본 원칙

- 큰 작업은 설명만 듣고 바로 구현하지 말고, 먼저 관련 manual과 기존 문서를 읽는다.
- 공용 workflow의 source of truth는 `AGENTS.md`, `docs/*`, `TODO.md`, `scripts/ai/*`다.
- 도구별 로컬 설정이나 프롬프트 파일은 팀 공용 규칙으로 취급하지 않는다.
- 구현은 기존 구조를 보존하는 방향으로 최소 범위 변경을 우선한다.
- 코드 품질 판단 기준은 항상 `docs/rules.md`와 `docs/testing.md`를 따른다.
- 작업 종료 보고에는 반드시 `변경 파일`, `실행한 검증`, `남은 리스크`를 포함한다.

## 2. 작업 시작 전 필수 읽기

모든 비사소한 작업은 아래 문서를 먼저 읽는다.

1. `docs/ai/manuals/common.md`
2. `docs/rules.md`
3. `docs/testing.md`

이후, 변경 대상 파일에 맞춰 추가 manual을 읽는다.

## 3. 경로별 manual 로딩 규칙

| 변경 범위                                                                                                                                                                                                   | 추가로 읽을 문서                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `src/pages/lobby/**`, `src/features/presence/**`, `src/features/room-chat/**`                                                                                                                               | `docs/ai/manuals/lobby.md`                      |
| `src/pages/waiting-room/**`                                                                                                                                                                                 | `docs/ai/manuals/waiting-room.md`               |
| `src/pages/GamePage.tsx`, `src/components/game/**`, `src/components/board/**`, `src/hooks/game/**`, `src/services/socket/game.handler.ts`, `src/stores/game.store.ts`, `src/mocks/handlers/game.handler.ts` | `docs/ai/manuals/game-runtime.md`               |
| `src/contracts/socket/**`, `mock-socket-server/**`, `src/lib/socket.ts`                                                                                                                                     | 관련 기능 manual + `docs/socket-mock-server.md` |
| `docs/game-*.md` 또는 게임 소켓 계약 관련 문서                                                                                                                                                              | `docs/ai/manuals/game-runtime.md`               |

작업이 여러 영역에 걸치면 관련 manual을 모두 읽는다.

## 4. 권장 작업 순서

1. 변경 범위를 보고 필요한 manual을 모두 읽는다.
2. 수정 대상과 영향 범위를 짧게 요약한다.
3. 작업이 여러 단계면 `docs/ai/tasks/<task-slug>/` 아래에 `plan.md`, `context.md`, `checklist.md`를 만들거나 갱신하고 `TODO.md` 한 줄과 1:1로 맞춘다.
4. 기존 task를 이어서 할 때는 `npm run ai:session:brief -- <task-slug>`로 handoff 상태를 먼저 확인한다.
5. 기존 계층을 유지한 채 구현한다.
6. 가장 좁은 테스트부터 실행하고, 영향 범위에 맞는 추가 검증과 `npm run ai:self-review`를 수행한다.
7. 결과 보고 시 변경 파일, 검증 결과, 미해결 리스크를 남긴다.

## 5. 구현 규칙

- 페이지는 의도를 드러내고, 상세 로직은 기존 hook/controller/api 계층에 둔다.
- 이미 있는 반환 형태와 네이밍 규칙을 깨지 않는다.
- mock 모드와 실제 소켓 모드를 동시에 지원하는 코드에서는 한쪽만 고치지 않는다.
- 계약이 바뀌면 타입, mock, 테스트, 문서를 같이 업데이트한다.
- 큰 구조 변경은 "왜 지금 공통화/분리가 필요한지" 설명 가능할 때만 한다.

## 6. 최소 검증 기준

- 작은 UI/로직 변경: 관련 Vitest 파일
- 기능 단위 변경: 관련 Vitest + `npm run lint`
- 소켓/대기방/게임 런타임 변경: 관련 Vitest + `npm run build`
- 사용자 플로우 회귀 가능성이 큰 변경: 관련 Vitest + 필요한 Playwright 시나리오

최종 게이트가 필요하면 아래 순서를 사용한다.

1. `npm run lint`
2. `npm run test`
3. `npm run test:coverage`
4. `npm run e2e:ci`
5. `npm run build`

## 7. 셀프 리뷰 질문

- 이번 변경이 `docs/rules.md`의 R/P/C/U 기준을 악화시키지 않았는가?
- hook/component/api/socket 책임이 섞이지 않았는가?
- mock 데이터, socket contract, 테스트가 변경 내용과 같이 움직였는가?
- 세션/리다이렉트/cleanup/중복 구독 같은 경계 조건을 놓치지 않았는가?
- 변경 파일만 보면 다음 작업자가 흐름을 따라갈 수 있는가?
- `TODO.md`의 task 한 줄과 `docs/ai/tasks/<task-slug>/` 상태가 맞는가?

## 8. 역할 분업 세션

작업이 크거나 회귀 위험이 높으면 한 세션에서 끝내지 말고 역할을 분리한다.

1. Planner: `docs/ai/roles/planner.md`
2. Implementer: `docs/ai/roles/implementer.md`
3. Reviewer: `docs/ai/roles/reviewer.md`
4. Tester: `docs/ai/roles/tester.md`

Reviewer와 Tester 세션에서는 가능하면 `npm run ai:self-review`를 먼저 실행해 diff 기반 체크리스트를 본다.

## 9. 외부 AI 비평 규칙

- 다른 AI에게 비평을 요청할 때도 공용 source of truth는 그대로 `AGENTS.md`, `docs/*`, `TODO.md`, `scripts/ai/*`다.
- 큰 diff를 바로 던지지 말고, task 문서와 `npm run ai:self-review` 결과를 먼저 정리한 뒤 전달한다.
- 질문은 버그 가능성, 회귀 위험, 누락 테스트, 계약 불일치처럼 high-signal 항목으로 제한한다.
