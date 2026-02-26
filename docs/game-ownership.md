# 게임 팀 분업 소유권 (FE-B / FE-C)

이 문서는 게임 영역에서 FE-B/FE-C 분업 기준을 고정합니다.
원문 기준 문서는 아래 3개이며, 충돌 시 이 문서를 먼저 갱신합니다.

- `모두의마블_API명세서_v4.xlsx`
- `모두의마블_요구사항정의서_v8.xlsx`
- `모두의마블_테이블명세서_v4.xlsx`

## 범위

- 포함: 게임 플레이 화면, 게임 상태, 게임 소켓, 보드 렌더링
- 제외: 로비, 메신저, 랜딩페이지, 로그인

## FE-B 담당 (게임 로직 레이어)

- `src/stores/game.store.ts`
- `src/stores/useGameStore.ts` (레거시 래퍼)
- `src/stores/legacy.useGameStore.ts`
- `src/services/socket/game.handler.ts`
- `src/hooks/game/*`
- `src/components/game/*`
- `src/pages/GamePage.tsx`
- `src/features/game/useGameState.ts` (레거시 래퍼)

## FE-C 담당 (게임 렌더링 레이어)

- `src/components/board/*`
- `src/styles/board.css`
- `src/game/phaserConfig.tsx` (보드 레거시 래퍼)

## 공동 계약 (합의 후 변경)

- `src/types/domain.ts`

## FE-B/FE-C 게임 분업 제외 범위

- `src/pages/lobby/*`
- lobby 관련 hooks/api/types
- 메신저/랜딩페이지/로그인 관련 전체 코드

## FE-A 담당 (비게임 영역)

- 로비/메신저/랜딩페이지/로그인 및 그 하위 hooks/api/types는 FE-A가 전담한다.
- FE-B/FE-C는 위 비게임 영역 코드를 수정하지 않는다.

## 메모 (현재 단계)

- 현재 코드는 초기 단계이며, 요구사항 정의서/명세서 대비 미구현 항목이 많다.
- 본 문서는 최종 완성 상태가 아니라 현재 분업 경계를 정의한다.
