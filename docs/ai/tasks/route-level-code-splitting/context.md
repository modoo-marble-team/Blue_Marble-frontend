# Context

## 현재 상태

- `src/App.tsx`가 주요 페이지를 모두 정적으로 import한다.
- repo 전역에 `React.lazy()` / `lazy()` 사용이 없고, `vite.config.ts`에도 `manualChunks` 설정이 없다.
- 최근 build 결과에서 메인 청크가 500 kB 경고 기준을 크게 넘겼다.

## 판단

- 현재 번들 경고의 1차 원인은 route-level split 부재다.
- `GamePage`와 `GameBoard`처럼 무거운 화면이 메인 청크에 함께 들어오는 구조를 먼저 줄이는 것이 우선이다.
- 이번 작업은 로딩 전략 구조 개선이며, 기능/계약 변경은 아니다.

## 제외 범위

- `manualChunks` 기반 vendor 분리
- game runtime 내부 분할
- 번들 분석기 도입

위 항목은 route-level splitting 이후에도 필요하면 후속 작업으로 분리한다.
