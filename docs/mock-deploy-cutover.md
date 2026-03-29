# Mock 배포 컷오버 체크리스트

실서버 종료 이후에도 프론트 배포가 데모(mock) 모드로 안정 동작하도록 점검하는 문서입니다.

## 1) 배포 환경 변수 (Vercel)

프로젝트 Settings > Environment Variables에서 아래 값을 확인합니다.

- `VITE_ENABLE_DEMO_MOCK=true`
- `VITE_ALLOW_ALL_MOCK_TURNS=false` (데모에서 턴 제한 해제 필요 시 `true`)

참고:

- `VITE_API_URL`, `VITE_SOCKET_URL`는 mock 모드에서 필수는 아니지만, 혼선을 줄이기 위해 비활성/정리 권장

## 2) 코드 기준

현재 프론트는 아래 조건에서 mock 런타임이 활성화됩니다.

- `src/config/env.ts`
  - `IS_DEMO_MOCK_ENABLED`
  - `IS_SOCKET_MOCK_ENABLED`
- `src/main.tsx`
  - `SHOULD_ENABLE_MSW`가 `true`면 MSW worker 시작

즉, 배포 환경에서 `VITE_ENABLE_DEMO_MOCK=true`면 REST/socket이 mock 경로로 동작합니다.

## 3) 배포 후 스모크 체크

1. 홈 -> 로비 진입 확인
2. 대기방 생성/입장 확인
3. 게임 시작 후 주사위/턴 진행 확인
4. 채팅 입력/표시 확인
5. 새로고침 후 주요 화면 재진입 확인

## 4) 문제 발생 시 우선 확인

- Vercel env 값 오타 여부 (`true`/`false` 소문자)
- 최근 배포가 최신 커밋 기준인지
- 브라우저 캐시/서비스워커 캐시 영향 (강력 새로고침)

## 5) 로컬 재현 명령

```bash
npm run env:mock
npm run dev
```

필요 시 mock socket 서버:

```bash
npm run socket:mock
```
