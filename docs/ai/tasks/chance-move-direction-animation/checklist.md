# Checklist - chance-move-direction-animation

- [x] `gameBoardEventQueueUtils.ts`에 chance 이동 방향 힌트 추출 유틸 추가
- [x] `GameBoard.tsx`에 플레이어별 chance 이동 힌트 저장/소비 로직 반영
- [x] `movePlayerSequentially`에 이동 방향 옵션(`clockwise`/`counterclockwise`) 반영
- [x] chance trigger 이동 처리 시 힌트 우선 적용 + fallback 추론 보강
- [x] 유틸 단위 테스트 추가 및 통과 확인
- [x] lint/build 통과 확인
- [x] 수기 재검토로 기존 이동/모달 흐름 회귀 여부 점검
