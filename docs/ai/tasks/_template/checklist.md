# Checklist

## Implementation

- [ ] 관련 manual과 기존 문서를 읽었다
- [ ] 영향 범위를 정리했다
- [ ] WAT 단계와 역할 분담을 문서에 반영했다
- [ ] 최소 범위로 구현했다
- [ ] mock/real 경로를 함께 확인했다
- [ ] 타입/contract 변경이 있으면 관련 코드도 같이 수정했다

## Testing

- [ ] 대상 Vitest를 실행했다
- [ ] 필요 시 `npm run lint`를 실행했다
- [ ] 필요 시 `npm run build`를 실행했다
- [ ] 필요 시 Playwright 시나리오를 실행했다

## Review

- [ ] `docs/rules.md` 기준으로 셀프 리뷰했다
- [ ] 리다이렉트, cleanup, 중복 구독, 에러 처리 경계를 확인했다
- [ ] `TODO.md` task 한 줄을 최신 상태로 유지했다
- [ ] session handoff notes를 최신 상태로 갱신했다
- [ ] `npm run ai:session:brief -- <task-slug>` 출력이 현재 상태와 맞는다
- [ ] 변경 파일 / 실행한 검증 / 남은 리스크를 정리했다
