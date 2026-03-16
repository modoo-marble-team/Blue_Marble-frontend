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

| 파트 | 진행도  | 상태                                                                                                             |
| ---- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| FE-B | 진행 중 | event-socket 계약 전환 + `game.api` 제거 + 한 턴 계약 시나리오 테스트(#298) + MSW 계약 검증 강화(#362) 반영 완료 |
| FE-C | 진행 중 | 보드 로컬 엔진 유틸 분리(`gameBoardLocalEngine`) 1차 완료. 표현/연출 중심 구조로 최종 수렴이 남은 단계           |

## FE-B 현재 최우선 작업

- `game:action`/`game:sync`/`game:prompt_response`의 `gameId` canonical 사용 범위 고정
- ActionType에서 건설 처리 방식(`BUILD_PROPERTY` 유지 여부) 백엔드 최종 합의
- prompt/snapshot 필드(`id/promptId`, `timeoutSec/timeoutMs`) 최종 계약 고정
- 실서버 payload 확정 전 `prompt`/`snapshot` 타입 어댑터 최소 유지
- `gameId` 누락/choice canonical 회귀 테스트 유지

## FE-C 현재 최우선 작업

- `GameBoard.tsx`에서 남아 있는 로컬 게임 로직 제거 (`gameBoardLocalEngine` 의존 축소/해소)
- `eventQueue` 기반 이동/효과 애니메이션 계층 추가
- store selector 기반 보드 렌더 구조 추가 정리
- 새 `buildingLevel`, `tileType`, `playerState` 표시 반영

## 현재 가장 큰 리스크

- `GamePage` + `GameBoard`는 `prompt.type` 소비 구조로 전환됐지만 mock fallback과 실서버 경로가 일부 이원화돼 있다.
- `GameBoard.tsx`가 여전히 `applyMoney`/`advanceTurn`/파산 판정 등 게임 엔진 성격 로직을 들고 있다.
- 레거시 REST(`game.api`)가 삭제된 이후, 소켓 계약 변경 시 회귀를 잡는 테스트 보강이 필요하다.
- `gameId` canonical, money unit, prompt/snapshot 필드 기준이 문서와 코드에서 완전히 수렴하지 않았다.

## 작업 운영 규칙 (2026-03-05 추가)

- 작업 종료 시점마다 문서를 같이 갱신한다.
- 문서에는 반드시 `진행도`와 `다음 작업`을 같이 적는다.
- 기본 갱신 파일: `docs/game-event-spec-migration-plan.md`, `docs/game-delivery-roadmap.md`, `docs/game-ownership-corrected-table.md`

## 완료 판단 기준

- FE-B 완료: 새 이벤트 계약만으로 한 턴 전체 흐름이 돈다.
- FE-B 완료: 새 이벤트 계약을 기본으로 사용하면서도 레거시 fallback이 의도적으로만 남아 있다.
- FE-C 완료: 보드가 store 하나만 보고 정확히 렌더되며, 연출과 실제 상태가 분리돼도 stale 하지 않다.
