# Context: Global Effect UI

## 목적

CHANCE_RESOLVED 이벤트로 전달받는 전역 효과(PANDEMIC / FESTIVAL / INFLATION / DEFLATION) 발생 시,
보드 및 타일 UI에 시각적 피드백을 제공하고, 시작 시 팝업을 띄우는 컴포넌트를 신규 추가합니다.

## 변경 범위

- `src/components/game/GlobalEffectOverlay.tsx` [NEW] — 보드 border, 배너, overlay tint, 통행료 색상 토큰
- `src/components/game/GlobalEffectModal.tsx` [NEW] — 효과 시작 팝업 (BaseModal 기반, 3초 자동 닫힘)
