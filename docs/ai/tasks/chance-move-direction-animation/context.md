# Context - chance-move-direction-animation

## 문제 배경

- 기존 `GameBoard`의 `movePlayerSequentially`는 항상 `(current + 1) % totalTiles`를 사용해 시계 방향으로만 이동했다.
- 서버는 찬스 이동 효과를 `CHANCE_RESOLVED`(`MOVE_FORWARD`/`MOVE_BACKWARD`) + `PLAYER_MOVED`로 전달한다.
- 프론트가 두 이벤트를 연결하지 않으면, 뒤로 이동 카드도 시계 방향으로 표현되는 시각적 불일치가 발생한다.

## 핵심 제약

- 서버 권위 상태를 유지해야 하므로 실제 위치 계산은 서버 이벤트 결과를 신뢰해야 한다.
- 애니메이션 방향만 프론트에서 보정하고, 최종 위치는 `PLAYER_MOVED`의 도착 타일을 따른다.
- 기존 일반 이동, 통행료/모달 플로우를 깨지 않도록 chance trigger에만 한정 적용해야 한다.

## 결정 사항

- `CHANCE_RESOLVED`에서 방향/칸수 힌트를 추출해 플레이어별 ref에 저장한다.
- `PLAYER_MOVED(trigger=chance)`에서 힌트를 소비하며 방향을 적용한다.
- 힌트 누락 시 steps와 from/to 관계로 방향을 재추론하는 fallback을 유지한다.
