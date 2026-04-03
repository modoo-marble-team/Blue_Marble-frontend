# Checklist

- [x] 결과 모달 보유도시 계산 helper 추가
- [x] `GameBoard` 결과 row 생성에서 `ownedCityCountText` 하드코딩 제거
- [x] 보유도시 helper 테스트 추가
- [x] travel 애니메이션 판정 helper 추가
- [x] `fromIndex === 20` 하드코딩 제거
- [x] 이벤트칸/무인도/여행칸/trigger 기반 travel 판정 테스트 추가
- [x] `npx vitest run src/components/board/gameBoardResultUtils.test.ts`
- [x] `npx vitest run src/components/board/gameBoardEventQueueUtils.test.ts`
- [x] `GameBoard`에서 보유금 부족 확인 직후 `BUILD_OR_SKIP` 모달이 재노출되는 깜빡임 방지 (dismissed prompt id 해제 시점 보정)
- [x] `npm run lint`
- [x] `npm run ai:check:game`
- [x] `npm run ai:check:build`
