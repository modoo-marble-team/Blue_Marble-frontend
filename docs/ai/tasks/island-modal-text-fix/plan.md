# Plan: Island Modal Text Fix

## 1. 컴포넌트 수정 (`IslandModal.tsx`)

- [ ] `description` 변수 생성 로직 수정
- [ ] `restTurns`가 유효하지 않은 경우에도 기본 안내 문구와 남은 턴 안내가 포함되도록 수정 (예: `restTurns || 3` 또는 서버 데이터 신뢰)
- [ ] "당신은 무인도에 갇혔습니다." 단독 문구 제거

## 2. 검증

- [ ] 컴포넌트 렌더링 결과 확인
- [ ] `npm run lint` 실행
- [ ] `npm run build` 실행
