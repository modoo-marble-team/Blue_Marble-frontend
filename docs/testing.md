# Testing Guide

이 문서는 `Blue_Marble-frontend`의 테스트 작성/실행/리뷰 기준을 정의한다.
목표는 다음 3가지다.

- 회귀를 빠르게 발견한다
- 비동기/실시간 UI 테스트의 flaky를 줄인다
- PR 머지 전에 동일 기준으로 품질을 검증한다

## 1. 테스트 레벨과 범위

| 레벨             | 목적                      | 권장 대상                                | 파일 위치 규칙                    |
| ---------------- | ------------------------- | ---------------------------------------- | --------------------------------- |
| Unit             | 순수 로직 검증            | 상태 계산, 매핑 함수, 유틸               | 대상 파일 근처 `*.test.ts`        |
| Hook Integration | 훅 단위 상호작용 검증     | socket subscribe/unsubscribe, query 흐름 | 훅 파일 근처 `*.test.tsx`         |
| UI Interaction   | 사용자 인터랙션 검증      | 폼, 모달, 필터, 토글, 페이지 흐름        | 페이지/컴포넌트 근처 `*.test.tsx` |
| E2E              | 실제 사용자 시나리오 검증 | 로그인→로비→대기방→게임/채팅 핵심 플로우 | `/e2e/*.spec.ts`                  |

### 파일 네이밍

- Vitest: `*.test.ts` 또는 `*.test.tsx`
- Playwright: `*.spec.ts`
- 테스트 파일은 가능하면 대상 코드와 같은 폴더(또는 바로 인접한 폴더)에 둔다

## 2. 실행 명령과 권장 순서

```bash
npm run lint
npm run test
npm run test:coverage
npm run test:coverage:owner
npm run e2e:ci
npm run build
```

- 로컬 pre-push 훅에서도 같은 순서로 검증한다
- CI 게이트는 `lint + test + coverage + e2e:ci + build`를 실행한다
- 게임 E2E는 `npm run e2e:game`으로 분리 실행한다
- 내 파트 전용 커버리지는 `npm run test:coverage:owner`로 측정한다
  - 범위: `lobby`, `waiting-room`, `presence`, `room-chat`
  - 제외: DEV 전용 제어 패널, `types.ts`, test/d.ts 파일
  - 리포트 경로: `coverage-owner/index.html`

## 2.1 게이트 정책

- `quality-gate`는 머지 차단용 필수 게이트다
- `owner-coverage`는 담당 모듈 품질 추적용 보조 게이트다
- `owner-coverage`는 초기에는 non-blocking으로 운영하고, 팀 합의 시 blocking으로 전환한다
- 게임 E2E는 `E2E Game` 워크플로우로 분리해 수동/야간 실행한다

## 2.2 WIP 예외 운영 규칙

- 커버리지 또는 테스트에서 WIP 예외를 두려면 반드시 이슈 번호를 남긴다
- 예외는 임시이며 PR 본문에 복귀 조건과 만료 시점을 명시한다
- 복귀 조건은 기능 완료 기준으로 작성한다
- 예시 복귀 조건: `게임 액션/패치 계약 반영 + game E2E 2개 이상 green`
- 예외가 해소되면 해당 제외 설정과 주석을 같은 PR에서 제거한다

## 3. flaky 대응 규칙

### 3.1 Selector 안정성

- 텍스트 클래스/DOM 구조 기반 selector보다 접근성 selector 우선
- Playwright/RTL 공통 우선순위
  - `getByRole(...)`
  - `getByLabelText(...)` / `getByLabel(...)`
  - `getByPlaceholderText(...)`
- 불가피할 때만 `data-testid` 사용

### 3.2 비동기 대기 규칙

- 상태 변화가 비동기면 즉시 `expect`하지 말고 `waitFor` 또는 `findBy*` 사용
- 타임아웃을 무조건 늘리기 전에, 대기 대상 조건을 더 구체화한다
- 화면 정책이 바뀌면(예: DEV 패널 기본 숨김) 시나리오도 동일 정책에 맞춰 먼저 UI 상태를 만든다

예시:

```ts
await user.click(screen.getByRole('button', { name: 'DEV CONTROL 열기' }))
await user.click(screen.getByRole('button', { name: '시작조건' }))
await waitFor(() => {
  expect(screen.getByRole('button', { name: '시작' })).toBeEnabled()
})
```

### 3.3 타임아웃/재시도 규칙

- Vitest: 기본 timeout 유지, 필요 시 테스트 단위로만 제한적 증가
- Playwright: `playwright.config.ts` 기준
  - `retries: CI에서 1`
  - `workers: CI에서 1`
- 재시도에 의존해 통과시키지 말고 원인(레이스/selector/준비 상태)을 먼저 수정한다

### 3.4 격리 규칙

- 각 테스트는 세션/스토리지 상태를 초기화하고 시작한다
- 테스트 간 순서 의존 금지
- 목 데이터/소켓 이벤트는 테스트에서 필요한 범위만 제어한다

## 4. PR 테스트 체크리스트

- [ ] 변경된 기능에 대응하는 테스트가 최소 1개 이상 추가/수정되었는가
- [ ] 성공 케이스와 실패(예외) 케이스를 최소 1개씩 검증했는가
- [ ] 비동기 로직을 `waitFor`/`findBy*`로 안정적으로 검증했는가
- [ ] 로컬에서 `lint`, `test`, `test:coverage`, `e2e:ci`, `build`를 통과했는가
- [ ] 테스트 코드가 구현 상세가 아니라 사용자 행위/도메인 규칙을 검증하는가

## 5. 작성 원칙

- 테스트는 구현 세부가 아니라 **행동 계약(contract)** 을 검증한다
- 메시지/라벨/상태명은 실제 사용자 시나리오 기준으로 작성한다
- 지나친 목킹으로 실제 흐름을 잃지 않되, 불안정한 외부 의존성은 고립한다
- 테스트 코드도 `rules.md`의 Readability/Predictability/Cohesion/Coupling 기준을 동일하게 적용한다
