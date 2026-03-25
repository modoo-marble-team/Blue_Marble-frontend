# Context

## Background

- 게임 종료 결과 모달은 총자산은 서버 authoritative 값으로 잘 표시하지만, `보유도시`는 `GameBoard` 내부에서 `'-'`로 고정돼 실제 값이 나오지 않았다.
- 동시에 `PLAYER_MOVED` 애니메이션 분기에는 `fromIndex === 20` 하드코딩이 남아 있어, 광주와 춘천 사이 이벤트칸 출발 이동도 travel 이동처럼 빠르게 재생되고 있었다.
- 현재 보드 정의에서 `20`번 칸은 `TRAVEL`이 아니라 `EVENT`다.

## Current Decision

- 결과 모달의 보유도시 수는 backend payload를 늘리지 않고, 종료 시점 `tiles.owner_id/ownerId`에서 `PROPERTY` 타일 개수를 계산해 표시한다.
- 빠른 travel 이동 분기는 숫자 인덱스 하드코딩을 제거하고, `trigger === 'travel'` 또는 출발 타일 타입이 `TRAVEL` / `ISLAND`인지로만 판단한다.

## Relevant Manuals

- `AGENTS.md`
- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`

## Risks

- `보유도시` 정의는 현재 프론트에서 `PROPERTY` 타일 개수로 해석한다. 추후 도메인 정의가 달라지면 helper 기준도 같이 수정해야 한다.
- travel 이동 분기는 더 이상 `20번 칸`을 특별취급하지 않으므로, 과거 문서/기억에 남은 UX 전제와 현재 보드 정의가 어긋난 부분은 이번 수정으로 현재 보드 정의 쪽에 맞춘다.
