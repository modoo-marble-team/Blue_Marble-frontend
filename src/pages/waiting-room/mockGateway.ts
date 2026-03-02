import { socket } from '../../lib/socket'
import { mockLobbyRooms } from '../lobby/mockData'
import type { LobbyRoom, LobbyRoomStatus } from '../lobby/types'
import type {
  ChatEventPayload,
  GameStartEventPayload,
  HostChangedEventPayload,
  LobbyUpdatedEventPayload,
  PlayerReadyEventPayload,
  WaitingRoomChatMessage,
  WaitingRoomChatPayload,
  WaitingRoomSnapshot,
} from './types'

// 목 게이트웨이 네트워크 지연/게임 초기값/비밀방 기본 비밀번호
const MOCK_NETWORK_DELAY_MS = 220
const DEFAULT_ROOM_PASSWORD = '1234'
const GAME_START_BALANCE = 1_000_000_000
const GAME_PLAYER_COLORS = ['#FF6B6B', '#4F86F7', '#F8B500', '#2CCF9A']
const ROOM_PRIVATE_PASSWORDS: Record<string, string> = {
  'room-2': DEFAULT_ROOM_PASSWORD,
  'room-7': DEFAULT_ROOM_PASSWORD,
}

// 목 저장소 내부 플레이어 타입
interface MockRoomPlayer {
  id: string
  nickname: string
  is_ready: boolean
  is_host: boolean
}

// 목 저장소 내부 방 타입
interface MockRoom {
  id: string
  title: string
  status: LobbyRoomStatus
  max_players: number
  is_private: boolean
  password: string | null
  players: MockRoomPlayer[]
  chat_messages: WaitingRoomChatPayload[]
}

// 목 이벤트 발행용 socket listeners 타입
interface SocketWithListeners {
  listeners: (eventName: string) => Array<(payload: unknown) => void>
}

// 목 게이트웨이 에러 상태코드와 메시지를 함께 전달
export class WaitingRoomMockError extends Error {
  status: number
  // 명세 기반 분기를 위한 에러 코드
  code?: string
  // 사용자 안내에 사용할 상세 메시지
  detail?: string

  constructor(
    status: number,
    message: string,
    options?: {
      code?: string
      detail?: string
    }
  ) {
    super(options?.detail ?? message)
    this.name = 'WaitingRoomMockError'
    this.status = status
    this.code = options?.code
    this.detail = options?.detail ?? message
  }
}

// 비동기 API처럼 보이도록 지연 Promise 반환
function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), delayMs)
  })
}

// 초기 방 플레이어 목록을 1번 플레이어 방장으로 생성
function createRoomPlayers(roomId: string, count: number): MockRoomPlayer[] {
  return Array.from({ length: count }, (_, index) => {
    return {
      id: `${roomId}-user-${index + 1}`,
      nickname: `플레이어${index + 1}`,
      is_ready: false,
      is_host: index === 0,
    }
  })
}

// 초기 채팅은 빈 배열로 시작
function createSeededRoomChat(): WaitingRoomChatPayload[] {
  return []
}

// 로비 목 데이터 기반으로 대기방 저장소 초기화
function createInitialRooms(): Map<string, MockRoom> {
  const seededRooms = mockLobbyRooms.map((room) => {
    return {
      id: room.id,
      title: room.title,
      status: room.status,
      max_players: room.maxPlayers,
      is_private: room.isPrivate,
      password: room.isPrivate
        ? (ROOM_PRIVATE_PASSWORDS[room.id] ?? DEFAULT_ROOM_PASSWORD)
        : null,
      players: createRoomPlayers(room.id, room.currentPlayers),
      chat_messages: createSeededRoomChat(),
    } as MockRoom
  })

  return new Map(seededRooms.map((room) => [room.id, room]))
}

const roomsStore = createInitialRooms()

// 채팅 payload를 대기방 채팅 메시지 모델로 변환
function mapChatPayloadToMessage(
  payload: WaitingRoomChatPayload
): WaitingRoomChatMessage {
  return {
    id: payload.id,
    senderId: payload.sender_id,
    senderNickname: payload.sender_nickname,
    content: payload.message,
    timestamp: payload.sent_at,
    type: payload.type,
  }
}

// 내부 MockRoom을 화면용 WaitingRoomSnapshot으로 변환
function toWaitingRoomSnapshot(room: MockRoom): WaitingRoomSnapshot {
  return {
    roomId: room.id,
    title: room.title,
    status: room.status,
    maxPlayers: room.max_players,
    isPrivate: room.is_private,
    players: room.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      isReady: player.is_ready,
      isHost: player.is_host,
    })),
    chatMessages: room.chat_messages.map(mapChatPayloadToMessage),
  }
}

// 로비 갱신 브로드캐스트에 맞는 payload로 변환
function getLobbyUpdatedPayload(room: MockRoom): LobbyUpdatedEventPayload {
  const hostPlayer = room.players.find((player) => player.is_host)

  return {
    action: 'status_changed',
    room: {
      id: room.id,
      title: room.title,
      status: room.status,
      is_private: room.is_private,
      current_players: room.players.length,
      max_players: room.max_players,
      host_nickname: hostPlayer?.nickname ?? '',
    },
  }
}

// 소켓 이벤트를 직접 리스너에 전달하는 목 emit 유틸
function emitSocketEvent<TPayload>(eventName: string, payload: TPayload) {
  const socketWithListeners = socket as unknown as SocketWithListeners
  const listeners = socketWithListeners.listeners(eventName)

  listeners.forEach((listener) => {
    ;(listener as (eventPayload: TPayload) => void)(payload)
  })
}

// 로비 목록 갱신 이벤트를 방 상태 기반으로 발행
function emitLobbyUpdated(
  room: MockRoom,
  action: LobbyUpdatedEventPayload['action']
) {
  const payload = getLobbyUpdatedPayload(room)
  emitSocketEvent<LobbyUpdatedEventPayload>('lobby_updated', {
    ...payload,
    action,
  })
}

// 시작 가능 조건(2명 이상 + 방장 제외 전원 ready) 판별
function isAllReady(room: MockRoom) {
  if (room.players.length < 2) {
    return false
  }

  return room.players
    .filter((player) => !player.is_host)
    .every((player) => player.is_ready)
}

// roomId로 방을 조회하고 없으면 404 에러 발생
function findRoomOrThrow(roomId: string) {
  const room = roomsStore.get(roomId)

  if (!room) {
    throw new WaitingRoomMockError(404, '존재하지 않는 방입니다.', {
      code: 'ROOM_NOT_FOUND',
      detail: '존재하지 않는 방입니다.',
    })
  }

  return room
}

// 게임 시작 소켓 payload를 목 게임 상태와 함께 생성
function createGameStartPayload(room: MockRoom): GameStartEventPayload {
  return {
    game_id: `game-${room.id}-${Date.now()}`,
    game_state: {
      players: room.players.map((player, index) => ({
        id: player.id,
        nickname: player.nickname,
        position: 0,
        balance: GAME_START_BALANCE,
        owned_tiles: [],
        is_in_jail: false,
        jail_turn_count: 0,
        is_bankrupt: false,
        color: GAME_PLAYER_COLORS[index % GAME_PLAYER_COLORS.length],
      })),
      tiles: [],
      current_turn: room.players[0]?.id ?? null,
      round: 1,
    },
  }
}

// room-숫자 형식의 숫자 부분을 정렬 키로 변환
function getRoomIdSortValue(roomId: string) {
  const matchedNumber = roomId.match(/\d+/)?.[0]

  if (!matchedNumber) {
    return Number.MAX_SAFE_INTEGER
  }

  return Number.parseInt(matchedNumber, 10)
}

// 일반 대화 메시지 payload를 생성
function createTalkChatPayload(
  roomId: string,
  senderId: string,
  senderNickname: string,
  message: string
): WaitingRoomChatPayload {
  return {
    id: `${roomId}-chat-${Date.now()}`,
    sender_id: senderId,
    sender_nickname: senderNickname,
    message,
    sent_at: new Date().toISOString(),
    type: 'talk',
  }
}

interface MockJoinRoomParams {
  roomId: string
  userId: string
  nickname: string
  password?: string
}

interface MockLeaveRoomParams {
  roomId: string
  userId: string
}

interface MockToggleReadyParams {
  roomId: string
  userId: string
}

interface MockStartGameParams {
  roomId: string
  userId: string
}

interface MockSendChatParams {
  roomId: string
  senderId: string
  senderNickname: string
  message: string
}

interface MockCreateRoomParams {
  title: string
  isPrivate: boolean
  password?: string
  hostUserId: string
  hostNickname: string
}

export interface MockCreateRoomResult {
  roomId: string
  roomTitle: string
  preJoinedSnapshot: WaitingRoomSnapshot
}

// 대기방 입장 목 API 처리
export async function mockJoinWaitingRoom({
  roomId,
  userId,
  nickname,
  password,
}: MockJoinRoomParams): Promise<WaitingRoomSnapshot> {
  await wait(MOCK_NETWORK_DELAY_MS)

  const room = findRoomOrThrow(roomId)

  // 비밀방 비밀번호가 다르면 403 반환
  if (room.is_private && room.password !== (password ?? '')) {
    throw new WaitingRoomMockError(403, '비밀번호가 올바르지 않습니다.', {
      code: 'ROOM_PASSWORD_MISMATCH',
      detail: '비밀번호가 올바르지 않습니다.',
    })
  }

  // 이미 게임 중인 방은 입장 차단
  if (room.status === 'playing') {
    throw new WaitingRoomMockError(409, '이미 게임이 시작된 방입니다.', {
      code: 'ROOM_ALREADY_PLAYING',
      detail: '이미 게임이 시작된 방입니다.',
    })
  }

  const existingPlayer = room.players.find((player) => player.id === userId)

  // 이미 입장한 사용자는 현재 스냅샷 그대로 반환
  if (existingPlayer) {
    return toWaitingRoomSnapshot(room)
  }

  // 정원이 가득 찬 방은 입장 차단
  if (room.players.length >= room.max_players) {
    throw new WaitingRoomMockError(409, '방 인원이 가득 찼습니다.', {
      code: 'ROOM_FULL',
      detail: '방 인원이 가득 찼습니다.',
    })
  }

  room.players.push({
    id: userId,
    nickname,
    is_ready: false,
    is_host: false,
  })

  emitLobbyUpdated(room, 'status_changed')
  return toWaitingRoomSnapshot(room)
}

// 기존 roomId 최대값 + 1 규칙으로 다음 roomId 생성
function getNextRoomId() {
  const nextRoomNumber =
    Array.from(roomsStore.keys()).reduce((maxRoomNumber, roomId) => {
      return Math.max(maxRoomNumber, getRoomIdSortValue(roomId))
    }, 0) + 1

  return `room-${nextRoomNumber}`
}

// 방 생성 목 API 처리
export async function mockCreateWaitingRoom({
  title,
  isPrivate,
  password,
  hostUserId,
  hostNickname,
}: MockCreateRoomParams): Promise<MockCreateRoomResult> {
  await wait(MOCK_NETWORK_DELAY_MS)

  const normalizedTitle = title.trim()

  // 빈 방 제목은 생성 차단
  if (normalizedTitle.length === 0) {
    throw new WaitingRoomMockError(400, '방 제목을 입력해주세요.', {
      code: 'ROOM_TITLE_REQUIRED',
      detail: '방 제목을 입력해주세요.',
    })
  }

  // 비밀방이면 숫자 4자리 비밀번호를 강제
  if (isPrivate && !/^\d{4}$/.test(password ?? '')) {
    throw new WaitingRoomMockError(400, '비밀번호는 숫자 4자리여야 합니다.', {
      code: 'INVALID_ROOM_PASSWORD',
      detail: '비밀번호는 숫자 4자리여야 합니다.',
    })
  }

  const roomId = getNextRoomId()

  const createdRoom: MockRoom = {
    id: roomId,
    title: normalizedTitle,
    status: 'waiting',
    max_players: 4,
    is_private: isPrivate,
    password: isPrivate ? (password ?? null) : null,
    players: [
      {
        id: hostUserId,
        nickname: hostNickname,
        is_ready: false,
        is_host: true,
      },
    ],
    chat_messages: [],
  }

  roomsStore.set(createdRoom.id, createdRoom)
  emitLobbyUpdated(createdRoom, 'created')

  return {
    roomId: createdRoom.id,
    roomTitle: createdRoom.title,
    preJoinedSnapshot: toWaitingRoomSnapshot(createdRoom),
  }
}

// 대기방 퇴장 목 API 처리
export async function mockLeaveWaitingRoom({
  roomId,
  userId,
}: MockLeaveRoomParams) {
  await wait(MOCK_NETWORK_DELAY_MS)

  const room = findRoomOrThrow(roomId)
  const targetPlayerIndex = room.players.findIndex(
    (player) => player.id === userId
  )

  // 이미 나간 사용자면 중복 퇴장 요청 차단
  if (targetPlayerIndex === -1) {
    throw new WaitingRoomMockError(409, '이미 방에서 나간 상태입니다.', {
      code: 'ALREADY_LEFT_ROOM',
      detail: '이미 방에서 나간 상태입니다.',
    })
  }

  const [leftPlayer] = room.players.splice(targetPlayerIndex, 1)
  let newHostId: string | undefined

  // 마지막 인원이 나가면 방을 삭제
  if (room.players.length === 0) {
    roomsStore.delete(room.id)
    emitLobbyUpdated(room, 'removed')

    return {
      success: true,
    }
  }

  // 방장이 나간 경우 다음 플레이어를 방장으로 승계
  if (leftPlayer.is_host) {
    const [nextHost] = room.players

    if (nextHost) {
      room.players = room.players.map((player) => {
        // 새 방장 외 플레이어는 방장 플래그 false로 유지
        if (player.id !== nextHost.id) {
          return {
            ...player,
            is_host: false,
          }
        }

        return {
          ...player,
          is_host: true,
          is_ready: false,
        }
      })

      newHostId = nextHost.id

      const hostChangedPayload: HostChangedEventPayload = {
        new_host_id: nextHost.id,
        new_host_nickname: nextHost.nickname,
      }
      emitSocketEvent<HostChangedEventPayload>(
        'host_changed',
        hostChangedPayload
      )
    }
  }

  emitLobbyUpdated(room, 'status_changed')

  return {
    success: true,
    newHostId,
  }
}

// 준비 상태 토글 목 API 처리
export async function mockToggleWaitingReady({
  roomId,
  userId,
}: MockToggleReadyParams) {
  await wait(MOCK_NETWORK_DELAY_MS)

  const room = findRoomOrThrow(roomId)
  const player = room.players.find((targetPlayer) => targetPlayer.id === userId)

  // 참가자가 아니면 404 반환
  if (!player) {
    throw new WaitingRoomMockError(404, '방 참가자를 찾을 수 없습니다.', {
      code: 'PLAYER_NOT_IN_ROOM',
      detail: '방 참가자를 찾을 수 없습니다.',
    })
  }

  // 방장은 준비 토글이 아닌 시작 버튼만 사용
  if (player.is_host) {
    throw new WaitingRoomMockError(
      403,
      '방장은 준비 상태를 변경할 수 없습니다.',
      {
        code: 'HOST_CANNOT_TOGGLE_READY',
        detail: '방장은 준비 상태를 변경할 수 없습니다.',
      }
    )
  }

  player.is_ready = !player.is_ready

  const playerReadyPayload: PlayerReadyEventPayload = {
    player_id: player.id,
    is_ready: player.is_ready,
    all_ready: isAllReady(room),
  }

  emitSocketEvent<PlayerReadyEventPayload>('player_ready', playerReadyPayload)

  return {
    isReady: player.is_ready,
  }
}

// 게임 시작 목 API 처리
export async function mockStartWaitingGame({
  roomId,
  userId,
}: MockStartGameParams) {
  await wait(MOCK_NETWORK_DELAY_MS)

  const room = findRoomOrThrow(roomId)
  const hostPlayer = room.players.find((player) => player.is_host)

  // 방장이 아니면 시작 요청 차단
  if (!hostPlayer || hostPlayer.id !== userId) {
    throw new WaitingRoomMockError(403, '방장만 게임을 시작할 수 있습니다.', {
      code: 'ONLY_HOST_CAN_START',
      detail: '방장만 게임을 시작할 수 있습니다.',
    })
  }

  // 시작 조건 미충족 시 409 반환
  if (!isAllReady(room)) {
    throw new WaitingRoomMockError(
      409,
      '최소 2명 + 전원 준비 완료 조건이 필요합니다.',
      {
        code: 'READY_CONDITION_NOT_MET',
        detail: '최소 2명 + 전원 준비 완료 조건이 필요합니다.',
      }
    )
  }

  room.status = 'playing'
  const gameStartPayload = createGameStartPayload(room)

  emitLobbyUpdated(room, 'status_changed')
  setTimeout(() => {
    emitSocketEvent<GameStartEventPayload>('game_start', gameStartPayload)
  }, 0)

  return {
    success: true,
    gameId: gameStartPayload.game_id,
  }
}

// 목 모드에서는 REST join 처리로 충분하므로 no-op
export function mockEnterWaitingRoomSocket() {
  // mock mode에서는 REST join 이후 상태 반영이 끝나므로 별도 작업이 필요 없다.
}

// 목 모드에서는 REST leave 처리로 충분하므로 no-op
export function mockLeaveWaitingRoomSocket() {
  // mock mode에서는 REST leave 이후 상태 반영이 끝나므로 별도 작업이 필요 없다.
}

// 대기방 채팅 전송 목 API 처리
export function mockSendWaitingRoomChat({
  roomId,
  senderId,
  senderNickname,
  message,
}: MockSendChatParams) {
  const normalizedMessage = message.trim()

  // 공백 메시지는 저장/브로드캐스트하지 않음
  if (normalizedMessage.length === 0) {
    return
  }

  const room = findRoomOrThrow(roomId)
  const chatPayload = createTalkChatPayload(
    roomId,
    senderId,
    senderNickname,
    normalizedMessage
  )

  room.chat_messages.push(chatPayload)

  const chatEventPayload: ChatEventPayload = {
    room_id: roomId,
    sender_id: senderId,
    sender_nickname: senderNickname,
    message: normalizedMessage,
    sent_at: chatPayload.sent_at,
  }

  emitSocketEvent<ChatEventPayload>('chat', chatEventPayload)
}

// 내부 roomsStore를 로비 카드용 모델 배열로 변환
export function getMockLobbyRooms(): LobbyRoom[] {
  return Array.from(roomsStore.values())
    .sort((firstRoom, secondRoom) => {
      return (
        getRoomIdSortValue(firstRoom.id) - getRoomIdSortValue(secondRoom.id)
      )
    })
    .map((room) => ({
      id: room.id,
      title: room.title,
      status: room.status,
      currentPlayers: room.players.length,
      maxPlayers: room.max_players,
      isPrivate: room.is_private,
    }))
}
