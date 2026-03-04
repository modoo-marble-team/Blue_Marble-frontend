# FE-B / FE-C 분업표 (중앙 docs 기준)

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

| 파트 | 진행도  | 상태                                                        |
| ---- | ------- | ----------------------------------------------------------- |
| FE-B | 진행 중 | 타입/store/socket/mock 골격 정리 후 prompt/ack UI 연결 단계 |
| FE-C | 진행 중 | 보드를 표현/연출 중심 레이어로 더 줄여야 하는 단계          |

## FE-B 현재 최우선 작업

- `src/components/game/modals/*`를 `gameStore.prompt`와 연결
- `src/pages/GamePage.tsx`에서 `pendingAction`, `lastAck`, `lastError`를 실제 UI 상태와 연결
- `src/components/board/GameBoard.tsx`의 로컬 modal 분기를 `game:prompt` 소비 구조로 전환
- `src/services/socket/game.handler.ts`의 `emitPromptResponse`를 실사용 UI 흐름과 연결
- 남아 있는 게임 REST fallback을 compatibility layer로 더 명확히 격리

## FE-C 현재 최우선 작업

- `GameBoard.tsx`에서 남아 있는 로컬 게임 로직 추가 축소
- `eventQueue` 기반 이동/효과 애니메이션 계층 추가
- store selector 기반 보드 렌더 구조 추가 정리
- 새 `buildingLevel`, `tileType`, `playerState` 표시 반영

## 현재 가장 큰 리스크

- `prompt`, `ack`, `pendingAction`이 store에는 있지만 실제 UI 소비가 아직 불완전하다.
- `GameBoard.tsx`가 여전히 일부 게임 엔진 성격 로직을 들고 있다.
- 게임 REST fallback이 장기화되면 중앙 docs 기준과 실제 런타임이 다시 벌어질 수 있다.
- `gameId`, money unit, tile/building enum 기준이 문서와 코드에서 완전히 수렴하지 않았다.

## 완료 판단 기준

- FE-B 완료: 새 이벤트 계약만으로 한 턴 전체 흐름이 돈다.
- FE-B 완료: 새 이벤트 계약을 기본으로 사용하면서도 레거시 fallback이 의도적으로만 남아 있다.
- FE-C 완료: 보드가 store 하나만 보고 정확히 렌더되며, 연출과 실제 상태가 분리돼도 stale 하지 않다.
