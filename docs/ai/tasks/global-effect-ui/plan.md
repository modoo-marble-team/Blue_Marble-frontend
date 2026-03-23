# Plan: Global Effect UI

## 1. GlobalEffectOverlay

- [x] EFFECT_CONFIG (borderColor, overlayColor, tollTextClass, badgeClass) 정의
- [x] 보드 inset box-shadow (border)
- [x] 배너 (효과명 + 남은 턴 badge)
- [x] 배경 overlay tint

## 2. GlobalEffectModal

- [x] BaseModal 기반 팝업
- [x] 효과별 icon + title 매핑 (EFFECT_DISPLAY)
- [x] chance.description 동적 표시 (하드코딩 없음)
- [x] 3초 후 자동 닫힘 (useEffect + setTimeout)
- [x] 진행 progress bar
- [x] 수동 닫기 버튼

## 3. 검증

- [x] npm run lint
- [x] npm run build
