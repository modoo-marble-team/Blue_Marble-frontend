# TODO

비사소한 작업은 이 파일 한 줄과 `docs/ai/tasks/<task-slug>/` 3종 문서를 1:1로 맞춘다.

## Ready

## In Progress

- [ ] `game-board-result-and-travel-fix` - Game Board Result And Travel Fix (`docs/ai/tasks/game-board-result-and-travel-fix/`) - 결과 모달 보유도시 수를 종료 시점 타일 소유 정보로 복구하고 이벤트칸 오인 travel 애니메이션을 수정
- [ ] `island-speed-and-exit-modal-style` - Island Speed and Exit Modal Style (`docs/ai/tasks/island-speed-and-exit-modal-style/`) - 무인도 이동 속도 개선 및 게임 종료 모달 스타일 통일
- [ ] `board-sot-sync` - Board SoT sync + initial full sync (`docs/ai/tasks/board-sot-sync/`) - 보드판 SoT를 백엔드 기준으로 전환하고 최초 sync knownRevision=-1 요청 반영
- [ ] `chance-move-direction-animation` - Chance Move Direction Animation (`docs/ai/tasks/chance-move-direction-animation/`) - chance 이동 방향 힌트 기반 순차 애니메이션 보정 및 검증
- [ ] `mypage-nickname-change` - MyPage Nickname Change (`docs/ai/tasks/mypage-nickname-change/`) - 게스트 제한은 유지하고 카카오 사용자는 마이페이지에서 닉네임을 반복 변경할 수 있게 정리
- [ ] `git-flow-template-source-of-truth` - Git Flow Template Source Of Truth (`docs/ai/tasks/git-flow-template-source-of-truth/`) - ai:git-flow가 .github 템플릿을 직접 읽어 issue/PR 제목, labels, 본문을 생성하도록 정렬

## Blocked

## Done

- [x] `game-chat-panel-solo-play-toggle` - Game Chat Panel Solo Play Toggle (`docs/ai/tasks/game-chat-panel-solo-play-toggle/`) - 게임방 채팅 테스트 패널 문구를 정리하고 mock 혼자 플레이 토글로 상대 턴 주사위/턴 종료/prompt 응답을 가능하게 정리
- [x] `game-debug-overlay-production-hide` - Game Debug Overlay 배포 숨김 (`docs/ai/tasks/game-debug-overlay-production-hide/`) - `GamePage` 오른쪽 상단 debug/status overlay를 production에서 숨기고 dev에서만 유지
- [x] `game-board-modal-reveal-policy-split` - Game Board Modal Reveal Policy Split (`docs/ai/tasks/game-board-modal-reveal-policy-split/`) - pre-move / post-move reveal policy를 분리해 travel, go-to-island, chance chain move modal ordering을 정리
- [x] `game-acquisition-prompt-contract-alignment` - Game Acquisition Prompt Contract Alignment (`docs/ai/tasks/game-acquisition-prompt-contract-alignment/`) - acquisition prompt 분류를 `ACQUISITION_OR_SKIP` canonical 계약으로 축소하고 malformed choice fallback 전송을 방어
- [x] `end-turn-after-board-settle` - End Turn After Board Settle (`docs/ai/tasks/end-turn-after-board-settle/`) - 말 이동과 보드 로컬 액션이 모두 해소된 뒤에만 턴 종료 버튼이 보이고 눌리도록 `GamePage`를 `GameBoard` blocking 상태와 다시 연결
- [x] `game-board-modal-reveal-timing` - Game Board Modal Reveal Timing (`docs/ai/tasks/game-board-modal-reveal-timing/`) - PLAYER_MOVED 직후 보드 액션 모달이 말 이동 전에 한 프레임 보이는 경로를 barrier와 공통 reveal gate로 정리
- [x] `manual-sell-selection-restore` - Manual Sell Selection Restore (`docs/ai/tasks/manual-sell-selection-restore/`) - 내 턴 자산 액션 구간에서 보유 토지 클릭 수동 매각을 복구하되 서버 sell prompt 경로와 충돌하지 않게 정리
- [x] `forced-island-fast-move-fix` - Forced Island Fast Move Fix (`docs/ai/tasks/forced-island-fast-move-fix/`) - 무인도 강제 이동만 빠른 애니메이션을 적용하고 일반 무인도 착지/출발은 기본 속도로 유지
- [x] `group-chat-sender-grouping-ui` - Group Chat Sender Grouping UI (`docs/ai/tasks/group-chat-sender-grouping-ui/`) - 대기방/게임 공용 채팅을 sender grouping, 아바타, 이름 강조, 역할 badge 기반 실무형 그룹 채팅 UI로 정리
- [x] `chat-message-limit-300` - Chat Message Limit 300 (`docs/ai/tasks/chat-message-limit-300/`) - room chat과 DM에 300자 하드 제한을 입력/송신/contract/mock/test 기준으로 통일
- [x] `chat-bubble-overflow-fix` - Chat Bubble Overflow Fix (`docs/ai/tasks/chat-bubble-overflow-fix/`) - 긴 메시지가 말풍선을 뚫고 가로 스크롤을 만드는 문제를 RoomChat/DM 공통 스타일로 정리
- [x] `room-chat-sent-bubble-wrap-fix` - Room Chat Sent Bubble Wrap Fix (`docs/ai/tasks/room-chat-sent-bubble-wrap-fix/`) - 대기방/게임 공용 `RoomChat`에서 내가 보낸 긴 메시지 말풍선이 한 줄로 늘어나는 레이아웃을 sent path 폭 제약으로 정리
- [x] `chat-nickname-neutralization` - Chat Nickname Neutralization (`docs/ai/tasks/chat-nickname-neutralization/`) - 공용 RoomChat 닉네임 색을 기본 검은색 계열로 통일하고 대기방 HOST / 게임 TURN badge를 제거

- [x] `waiting-room-authoritative-resume-refresh` - Waiting Room Authoritative Resume Refresh (`docs/ai/tasks/waiting-room-authoritative-resume-refresh/`) - game 종료 후 waiting-room 복귀를 background join revalidation으로 교정하고 room create/join presence 반영을 follow-up refresh로 보강
- [x] `waiting-room-resume-bootstrap-presence-resync` - Waiting Room Resume Bootstrap Presence Resync (`docs/ai/tasks/waiting-room-resume-bootstrap-presence-resync/`) - 게임 종료 후 대기방 복귀 무한 로딩을 bootstrap snapshot으로 해소하고 waiting-room에서도 lobby_updated 기반 presence 재동기화를 수행
- [x] `presence-realtime-room-transitions` - Presence Realtime Room Transitions (`docs/ai/tasks/presence-realtime-room-transitions/`) - 로비/대기방 이동 시 접속자 목록 상태가 stale하게 남는 경로를 room membership override와 lobby presence resync로 정리
- [x] `waiting-room-presence-contract-alignment` - Waiting Room Presence Contract Alignment (`docs/ai/tasks/waiting-room-presence-contract-alignment/`) - game 종료 후 resume room 경로와 로비/대기방 접속자 상태 동기화를 백엔드 계약에 맞게 정렬
- [x] `game-runtime-warning-cleanup` - Game Runtime Warning Cleanup (`docs/ai/tasks/game-runtime-warning-cleanup/`) - GameBoard deps warning과 GamePage.test act warning을 기능 변경 없이 정리
- [x] `current-round-badge-style` - Current Round Badge Style (`docs/ai/tasks/current-round-badge-style/`) - 게임 화면 현재 라운드 뱃지를 더 자연스럽게 보이도록 정리
- [x] `panel-total-assets-authoritative` - Panel Total Assets Authoritative (`docs/ai/tasks/panel-total-assets-authoritative/`) - GAME_OVER 이벤트와 reconnect snapshot을 `gameResult`로 복구해 우측 패널/종료 결과를 서버 권위 기준으로 정렬
- [x] `add-round-display-ui` - Add Round Display UI (`docs/ai/tasks/add-round-display-ui/`) - 주사위 버튼 상단에 서버 round 정보를 표시하는 디자인 UI 추가
- [x] `feat-round-progress` - Remove Round/Turn Progress UI (`docs/ai/tasks/feat-round-progress/`) - 화면에 상시 노출되던 (1/20 턴) 및 Turn X / 20 UI를 모두 제거하고, 최초 1턴에만 시작 안내 문구가 나오도록 원상복구
- [x] `fix-round-display` - Fix Round Display (`docs/ai/tasks/fix-round-display/`) - 서버 패치의 turn 값을 라운드 변수에 제약 없이 즉각 반영하고, UI의 '라운드' 문자열을 '턴'으로 교체

- [x] `sell-modal-server-driven` - Sell Modal Server Driven (`docs/ai/tasks/sell-modal-server-driven/`) - 강제호출 매각모달 팝업 제거 및 채팅창 라운드 표출 갱신
- [x] `git-flow-rebase-safeguards` - Git Flow Rebase Safeguards (`docs/ai/tasks/git-flow-rebase-safeguards/`) - ai:git-flow의 branch 생성 전 / push 전 rebase 정책을 실행 결과와 사용 문서에서 더 명확히 드러내도록 정리
- [x] `public-readme-project-docs` - Public Readme Project Docs (`docs/ai/tasks/public-readme-project-docs/`) - 루트 README를 대외 소개와 개발자 온보딩을 함께 담는 하이브리드 문서로 보강하고 `docs/project/` 공개 문서 구조를 유지
- [x] `game-ux-improvements` - Game UX Improvements (`docs/ai/tasks/game-ux-improvements/`) - 무인도 문구, 20라운드 표기, 여행 애니메이션 단축 등 UX 개선 모음

- [x] `sort-by-total-assets` - Sort By Total Assets (`docs/ai/tasks/sort-by-total-assets/`) - 왕관 및 플레이어 패널 순위를 보유금 대신 총자산 기준으로 변경

- [x] `round-counter` - Round Counter (`docs/ai/tasks/round-counter/`) - 보드판 위 상태 알람에 현재 라운드 번호 표시 추가

- [x] `player-token-ui-fix` - Player Token UI Fix (`docs/ai/tasks/player-token-ui-fix/`) - 플레이어 말 위 숫자 표시 제거

- [x] `global-effect-ui` - Global Effect UI (`docs/ai/tasks/global-effect-ui/`) - 전역 효과 보드 오버레이 및 팝업 신규 추가
- [x] `island-modal-text-fix` - Island Modal Text Fix (`docs/ai/tasks/island-modal-text-fix/`) - 무인도 팝업 문항 고정 및 남은 턴수 상시 표시
- [x] `blue-marble-cheatsheet-refresh` - Blue Marble Cheatsheet Refresh (`docs/ai/tasks/blue-marble-cheatsheet-refresh/`) - 일반 Claude Code 치트시트를 프로젝트 전용 운영 가이드로 재작성
- [x] `ai-workflow-pr-split-guidance` - AI Workflow PR Split Guidance (`docs/ai/tasks/ai-workflow-pr-split-guidance/`) - workflow docs의 repo guardrails, PR 분할 기준, 로컬 Claude 자산 비커밋 규칙 정리
- [x] `vendor-neutral-team-workflow-standardization` - Vendor Neutral Team Workflow Standardization (`docs/ai/tasks/vendor-neutral-team-workflow-standardization/`)
- [x] `team-adoption-lightweight-governance` - Team Adoption Lightweight Governance (`docs/ai/tasks/team-adoption-lightweight-governance/`)
- [x] `partial-workflow-gate-large-prs` - Partial Workflow Gate Large Prs (`docs/ai/tasks/partial-workflow-gate-large-prs/`)
- [x] `dice-popup-refactor` - Dice Popup Refactor (`docs/ai/tasks/dice-popup-refactor/`) - 주사위 타이머 제거 및 더블 전용 팝업 개편 및 GameBoard 정리
- [x] `workflow-gate-rollout-develop` - Workflow Gate Rollout Develop (`docs/ai/tasks/workflow-gate-rollout-develop/`) - required check 유지, dry-run 가이드, 초기 검증 참고 기록까지 정리 완료
- [x] `git-flow-automation-scaffold` - Git Flow Automation Scaffold (`docs/ai/tasks/git-flow-automation-scaffold/`) - 로컬 git-flow skill을 저장소 공용 issue/branch/commit/PR scaffold로 옮기고 테스트 가능하게 정리
