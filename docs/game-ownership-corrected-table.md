# FE-B / FE-C 분업표 (이벤트 명세서 기준)

## 요약 표

| 구분                         | FE-B    | FE-C    | 비고                                      |
| ---------------------------- | ------- | ------- | ----------------------------------------- |
| 이벤트 명세 타입 정의        | 주 담당 | 보조    | `src/types/domain.ts`                     |
| 게임 store / patch 적용기    | 주 담당 | 보조    | revision, snapshot, prompt 포함           |
| 게임 socket emit/listener    | 주 담당 | 보조    | `game:action`, `game:ack`, `game:patch`   |
| 레거시 계약 호환 계층        | 주 담당 | 보조    | `roomId/gameId`, money unit, enum mapping |
| 게임 mock / 테스트 유틸      | 주 담당 | 보조    | 새 명세 기준 검증                         |
| 게임 페이지 조립             | 주 담당 | 보조    | `GamePage.tsx`에서 상태 단일화            |
| 게임 모달 / prompt UI        | 주 담당 | 보조    | prompt container 중심                     |
| 보드 렌더링                  | 보조    | 주 담당 | `src/components/board/*`                  |
| 말 이동 / 타일 / 건물 시각화 | 보조    | 주 담당 | store snapshot 기준                       |
| patch events 애니메이션      | 보조    | 주 담당 | 연출만 담당                               |
| `GameBoard.tsx` 로직 제거    | 공동    | 공동    | FE-B 선행, FE-C 마무리                    |

## 진행도 요약

| 파트 | 진행도 | 상태                                                      |
| ---- | ------ | --------------------------------------------------------- |
| FE-B | 55%    | 새 이벤트 계약 + 레거시 호환 계층을 함께 세워야 하는 단계 |
| FE-C | 45%    | 보드를 store 단일 렌더와 연출 레이어로 정리해야 하는 단계 |

## FE-B 최우선 작업

- `src/types/domain.ts`를 새 이벤트 명세 기준으로 재정의
- `src/stores/game.store.ts`에 snapshot/patch/revision/prompt/ack 구조 추가
- `src/services/socket/game.handler.ts`를 새 이벤트 계약으로 교체
- `src/hooks/game/useGameState.ts`에서 `game:sync` 기반 복구로 전환
- `src/mocks/handlers/game.handler.ts`를 새 명세 mock으로 재작성
- `src/pages/GamePage.tsx`의 보드 상태 write-back 제거
- `roomId/gameId`, money unit, tile/building enum mapper 명시화

## FE-C 최우선 작업

- `GameBoard.tsx`에서 API 호출, 통행료 계산, 파산 처리 제거
- store selector 기반 보드 렌더 구조 정리
- `game:patch.events` 기반 이동/효과 애니메이션 계층 추가
- 새 `buildingLevel`, `tileType`, `playerState` 표시 반영

## 현재 가장 큰 리스크

- `GameBoard.tsx`가 아직 게임 엔진처럼 동작한다.
- `GamePage.tsx`가 store와 board 로컬 상태를 이중 관리한다.
- mock이 새 이벤트 명세와 다른 프로토콜을 사용한다.
- 타입 계층이 새 숫자 ID / revision / snapshot 구조를 표현하지 못한다.
- 새 이벤트 명세와 기존 API v4 사이의 식별자/화폐 단위/enum 차이가 아직 문서와 코드 모두에 남아 있다.

## 완료 판단 기준

- FE-B 완료: 새 이벤트 계약만으로 한 턴 전체 흐름이 돈다.
- FE-B 완료: 새 이벤트 계약을 기본으로 사용하면서도 레거시 fallback이 의도적으로만 남아 있다.
- FE-C 완료: 보드가 store 하나만 보고 정확히 렌더되며, 연출과 실제 상태가 분리돼도 stale 하지 않다.
