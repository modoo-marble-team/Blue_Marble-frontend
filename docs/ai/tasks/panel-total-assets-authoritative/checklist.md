# Checklist

## Implementation

- [x] 관련 manual과 기존 문서를 읽었다
- [x] authoritative source와 종료 payload 우선순위를 정리했다
- [x] `GamePage`에 패널 전용 총자산 view model을 추가했다
- [x] 진행 중 패널 숫자/정렬/왕관 기준을 `totalAssets` 우선으로 맞췄다
- [x] 종료 후 패널 숫자와 순서를 `rankings.final_assets` 또는 `winner.assets` 기준으로 보정했다
- [x] 종료 결과 모달은 authoritative `gameResult`가 있을 때만 열리도록 정렬했다
- [x] `GAME_OVER` event를 adapter에서 `gameResult`로 승격하도록 보강했다
- [x] reconnect finished snapshot에서 `gameResult`가 없을 때 최소 종료 결과를 재구성하도록 보강했다
- [x] `PlayerPanel` 라벨 의미와 주석을 총자산 기준으로 맞췄다

## Testing

- [x] `npx vitest run src/services/socket/gameContractAdapters.test.ts src/pages/GamePage.test.tsx`
- [x] `npm run ai:check:game`
- [x] `npm run ai:check:build`
- [x] `npm run lint`

## Review

- [x] `npm run ai:self-review`를 실행했다
- [x] mock/store/render 경로가 이번 변경과 함께 움직이는지 확인했다
- [x] 종료 payload와 진행 중 snapshot의 우선순위가 충돌하지 않는지 확인했다
- [x] authoritative `gameResult`가 없을 때 종료 액션이 숨겨지는지 확인했다
- [x] live `GAME_OVER` event만 있어도 결과 source가 복구되는지 확인했다
- [x] reconnect finished snapshot 합성 규칙이 종료 모달 source와 충돌하지 않는지 확인했다
- [x] `TODO.md` task 한 줄과 task 문서 3종을 맞췄다
- [x] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
