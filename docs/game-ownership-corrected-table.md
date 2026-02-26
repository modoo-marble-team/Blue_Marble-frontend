# FE-B / FE-C 교정 분업표

## 적용 범위

- 포함: 게임 페이지, 게임 상태, 게임 소켓, 보드 렌더링
- 제외(FE-A): 로비, 메신저, 랜딩, 로그인 및 관련 hooks/api/types 전체

## 파일 소유권

| 영역 | 담당 | 경로 |
|---|---|---|
| 게임 상태 | FE-B | `src/stores/game.store.ts` |
| 레거시 스토어 래퍼 | FE-B | `src/stores/useGameStore.ts`, `src/stores/legacy.useGameStore.ts` |
| 게임 소켓 핸들러 | FE-B | `src/services/socket/game.handler.ts` |
| 게임 훅 | FE-B | `src/hooks/game/*` |
| 게임 UI(채팅/패널/버튼/모달) | FE-B | `src/components/game/*` |
| 게임 페이지 조립 | FE-B | `src/pages/GamePage.tsx` |
| 보드 렌더링 | FE-C | `src/components/board/*` |
| 보드 스타일 | FE-C | `src/styles/board.css` |
| 보드 레거시 진입점 | FE-C | `src/game/phaserConfig.tsx` |
| 공통 계약 타입 | 공동(Shared) | `src/types/domain.ts` |

## 명세 매핑 (게임 전용)

| 분류 | ID | 현재 담당 기준 |
|---|---|---|
| REST | `GAME-001~004` | FE-B 구현 주도, FE-C 렌더링 연동 |
| Socket C->S | `SOCK-005~007` | FE-B |
| Socket S->C | `SOCK-009~020`, `SOCK-028`, `SOCK-029` | FE-B 상태 처리, FE-C 시각 반영 |
| 렌더링 요구사항 | `G-001`, `G-002`, `G-004`, `G-011`, `G-014`, `G-024`, `G-025` | FE-C |

## FE-A 소유권 (비게임)

- 로비 페이지/도메인: `src/pages/lobby/*`
- 로비 API/타입/훅: `src/pages/lobby/api.ts`, `src/pages/lobby/types.ts`, `src/pages/lobby/hooks.ts`
- 접속자/비게임 실시간 영역: `src/features/presence/*`
