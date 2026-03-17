# Plan

## 목표

- `App.tsx`에서 주요 페이지를 정적 import하지 않고 라우트 단위 lazy loading으로 전환한다.
- 첫 진입 시 필요한 화면만 로드되게 해 초기 메인 번들 크기를 줄인다.
- 기존 라우팅 UX를 깨지 않도록 `Suspense` fallback을 최소 범위로 적용한다.

## 대상 파일

- `src/App.tsx`
- 필요 시 공통 fallback UI용 파일
- 관련 라우팅 테스트

## 완료 기준

- `HomePage`, `LobbyPage`, `WaitingRoomPage`, `GamePage`, `MyPage`, `NicknameSetupPage`, `KakaoLoginCallbackPage` 중 주요 route component가 lazy import로 전환된다.
- 초기 라우트 진입과 보호 라우트 진입 흐름이 기존과 동일하게 동작한다.
- `npm run build`에서 메인 번들 크기가 감소한다.

## 최소 검증

- `npx vitest run src/App.test.tsx`
- `npm run lint -- src/App.tsx src/App.test.tsx`
- `npm run build`
