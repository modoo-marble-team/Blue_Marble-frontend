# Team Memory

팀이 공유해야 하는 durable한 사실만 적는다.
개인 실험 메모나 도구별 선호는 각자 로컬에 두고 저장소에는 커밋하지 않는다.

## 2026-03-22

- workflow SSOT는 계속 `AGENTS.md`, `docs/ai/manuals/*`, `docs/rules.md`, `docs/testing.md`다.
- 팀 공용 workflow는 특정 AI 도구 파일이 아니라 `AGENTS.md`, `docs/*`, `TODO.md`, `scripts/ai/*`로 유지한다.
- 비사소한 작업은 `TODO.md` 한 줄과 `docs/ai/tasks/<slug>/` 3종 문서를 1:1로 맞춘다.
- 새 세션에서 작업을 재개할 때는 `npm run ai:session:brief -- <slug>`를 먼저 실행한다.
- 저장소에는 tool-specific runtime file을 커밋하지 않는다.
- 큰 작업은 가능하면 이슈 단계에서 예상 task slug를 먼저 정한다.
- handoff 전에는 checklist, `TODO.md`, `npm run ai:session:brief -- <slug>` 상태를 맞춘다.
- 주간 운영 점검은 `npm run ai:workflow:audit`로 경고만 확인한다.
- `develop` PR의 large/high-risk 변경은 `Workflow Gate` required check 대상이다.
- 큰 PR은 PR 작성 전에 `npm run ai:pr-gate` dry-run을 먼저 실행한다.
