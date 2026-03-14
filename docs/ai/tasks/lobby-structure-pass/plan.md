# Plan

## Task

- 작업 이름: LobbyPage structure pass
- 요청 날짜: 2026-03-14
- 담당 범위: `src/pages/lobby/LobbyPage.tsx`의 가독성, 상태 소유권, 테스트 영향 정리

## Goal

- `LobbyPage.tsx`를 "페이지 조합 계층"으로 더 분명하게 만들어 읽기 부담을 줄인다.
- 페이지가 직접 들고 있는 상태와 이벤트 중 페이지에 남겨야 할 것과 기존 hook/controller로 넘겨야 할 것을 정리한다.
- 기존 로비 기능, DM 흐름, mock/real socket 동작, 테스트 계약을 깨지 않는 최소 범위 리팩터링 계획을 고정한다.

## In Scope

- `LobbyPage.tsx`의 책임 분류
  - 세션/헤더 메뉴 처리
  - 로컬 UI 상태(`searchRoom`, `roomFilter`, `excludePrivateRoom`, `isUserListOpen`)
  - 로비 room query / online users / DM controller 조합
  - mock 전용 side effect와 logout 정리
- 페이지에 남길 책임과 이동 후보 책임을 문서로 구분
- 필요한 테스트 범위와 회귀 포인트 정의

## Out Of Scope

- 로비 UI 디자인 변경
- DM 정책 변경
- socket payload/contract 변경
- waiting room 또는 game runtime 흐름 수정
- 성능 최적화를 위한 무리한 memoization 추가

## Target Files

- `src/pages/lobby/LobbyPage.tsx`
- 필요 시 `src/pages/lobby/useLobbyPage*.ts` 또는 로컬 helper/hook 파일
- 필요 시 `src/pages/lobby/LobbyPage.test.tsx`
- 참고:
  - `src/pages/lobby/useLobbyRoomActions.ts`
  - `src/features/presence/useOnlineUsersSocket.ts`
  - `src/features/presence/useDirectMessageController.ts`

## Completion Criteria

- `LobbyPage.tsx`의 핵심 플로우가 위에서 아래로 더 자연스럽게 읽힌다.
- 페이지 밖으로 뺄 책임은 "페이지 조합"이 아니라 "상세 로직"인 경우에만 이동한다.
- 기존 hook 반환 형태와 mock/real runtime 계약을 유지한다.
- 최소 1개 이상의 관련 테스트가 현재 동작을 계속 보장한다.
- 최종 변경 설명에서 어떤 책임을 왜 이동했는지 설명 가능하다.

## Test Plan

- 최소:
  - `npm run ai:check:lobby`
- 조건부:
  - `npm run ai:check:chat-e2e`
  - `npm run lint`
- 검토 포인트:
  - 필터/토글/모달/DM 패널/접속자 목록 열기 닫기 회귀 여부
