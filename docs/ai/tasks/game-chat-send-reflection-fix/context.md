# Context

## Current Behavior

- 게임 페이지는 `sendWaitingRoomChat()`로 `send_chat`만 송신하고, 로컬 store에는 메시지를 바로 추가하지 않는다.
- 채팅 UI는 `useGameStore().messages`만 렌더링하므로, 수신 `chat` 이벤트가 오지 않으면 보낸 메시지도 화면에 나타나지 않는다.
- 실서버에서는 송신 `send_chat`은 확인되지만, 게임 페이지 기준으로는 `chat` echo가 늦거나 누락될 수 있어 사용자가 새로 보낸 메시지가 비어 보이는 문제가 있다.
- 추가로 대기방에서 게임으로 이동할 때 waiting-room cleanup이 `leave_room`를 보내고 있어, 게임 중에는 room membership이 끊겨 다른 유저 `chat` broadcast도 못 받는 흐름이 있었다.

## Related Files

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`
- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `src/pages/game/gameChat.ts`
- `src/pages/game/gameChat.test.ts`
- `src/pages/waiting-room/hooks/hooks.ts`
- `src/pages/waiting-room/hooks/hooks.test.ts`
- `src/pages/waiting-room/socket/socket.ts`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`

## Constraints

- 게임 런타임의 canonical identifier는 `gameId`지만, 채팅 경계는 현재 `roomId`를 계속 사용한다.
- 대기방 채팅 송신 계약인 `send_chat({ room_id, message })`는 유지한다.
- 서버 권위 상태는 `game:*` 런타임 계약이 담당하므로, 채팅 보정은 게임 상태 계산을 침범하지 않는 범위에서만 넣는다.
- mock/real 소켓 모두 같은 채팅 렌더링 경계를 유지해야 한다.
- 게임 시작 이동은 대기방을 떠나는 것이 아니라 같은 room에서 game runtime으로 넘어가는 브리지이므로, 이 경로에서는 cleanup leave를 보내면 안 된다.

## Decision Notes

- 송신 직후 로컬에 낙관적 메시지를 추가하고, 이후 서버 `chat` echo가 오면 해당 메시지를 교체하는 방식으로 간다.
- 이 로직은 게임 페이지 내부에 직접 흩뿌리지 않고 `src/pages/game/gameChat.ts` helper로 분리해 테스트한다.
- waiting-room controller는 game_start 경로에서 다음 cleanup leave를 명시적으로 skip 하도록 해 room membership을 유지한다.
- 백엔드 echo 정책만 기다리는 방식은 실서버 차이로 다시 비는 화면이 생길 수 있어 버렸다.
- store 전역 action을 새로 추가하는 대신, 페이지에서 필요한 최소 reconcile만 수행해 영향 범위를 좁혔다.

## Open Risks

- 같은 사용자가 아주 짧은 시간 안에 동일한 내용을 여러 번 보내면, 서버 echo 매칭이 가장 오래된 pending 메시지부터 정리된다.
- 서버가 아예 `chat` echo를 보내지 않으면 낙관적 메시지는 그대로 남지만, 현재 사용자 UX 기준으로는 의도된 동작이다.
- 다른 사용자의 채팅 수신은 cleanup leave 경계 수정으로 맞췄지만, 실서버가 게임 중 `chat`를 실제로 계속 브로드캐스트하는지는 한 번 더 확인이 필요하다.
