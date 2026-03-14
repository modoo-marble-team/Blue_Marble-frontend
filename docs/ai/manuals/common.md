# Common Manual

이 문서는 `Blue_Marble-frontend` 전체에 공통으로 적용되는 AI 작업 기준이다.
상세 품질 기준은 반드시 `docs/rules.md`, 테스트 기준은 `docs/testing.md`를 원문으로 확인한다.

## 1. 프로젝트 개요

- 스택: Vite + React 18 + TypeScript
- 상태/데이터: Zustand, TanStack Query
- 실시간: `socket.io-client`, 로컬 mock socket server
- 테스트: Vitest + Testing Library + Playwright
- 품질 게이트: Husky pre-commit / pre-push

## 2. 공통 구조 원칙

- 페이지는 "무엇을 하는지"가 먼저 보여야 한다.
- 로직 종류가 섞이면 기존 hook/controller/api 계층으로 분리한다.
- 공통화는 실제로 함께 바뀌는 코드에만 적용한다.
- 기존 hook 반환 형태를 유지한다.
  - 예: query류는 `{ data, isLoading, isError }` 패턴을 우선 유지
- 숨은 부수효과를 만들지 않는다.

## 3. 변경할 때 지켜야 할 것

- 작은 수정이라도 기존 파일 배치와 책임 경계를 먼저 확인한다.
- feature 내부 규칙이 있으면 전역 util 추가보다 feature 내부 확장을 우선한다.
- mock 모드와 실제 모드가 공존하는 코드는 양쪽 경로를 함께 검토한다.
- 계약 변경은 타입만 바꾸지 말고 테스트와 문서까지 같이 맞춘다.

## 4. 테스트 우선순위

가장 좁은 범위부터 검증한다.

1. 대상 파일 근처 Vitest
2. 관련 feature/page 테스트
3. `npm run lint`
4. 필요 시 `npm run build`
5. 사용자 흐름 영향이 크면 Playwright

예시 명령:

```bash
npx vitest run src/pages/lobby/LobbyPage.test.tsx
npx vitest run src/pages/waiting-room/WaitingRoomPage.test.tsx
npm run lint
npm run build
```

## 5. 문서/보고 규칙

- 기능 경계나 계약을 바꿨으면 관련 `docs/*.md`도 갱신한다.
- 최종 보고에는 아래 3가지를 남긴다.
  - 어떤 파일을 왜 바꿨는지
  - 어떤 검증을 실행했는지
  - 아직 남은 리스크가 무엇인지

## 6. 셀프 체크

- 페이지가 지나치게 많은 상태/분기/소켓 로직을 직접 들고 있지 않은가?
- 같은 종류의 값이나 훅 반환 타입이 기존 규칙과 달라지지 않았는가?
- 테스트가 구현 세부가 아니라 사용자 행동과 계약을 검증하고 있는가?
- "한 파일만 고치면 된다"는 가정 때문에 mock, contract, test 업데이트를 놓치지 않았는가?
