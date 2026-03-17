import { socket } from '../../lib/socket'
import { ROOM_PASSWORD_PATTERN } from '../../constants/room'
import { setMockOnlineUserStatus } from '../../features/presence/mock/mockData'
import { mockLobbyRooms } from '../lobby/mockData'
import type { LobbyRoom, LobbyRoomStatus } from '../lobby/types'
import { createSeededRoomPlayers } from './mockSeed'
import type {
  ChatEventPayload,
  GameStartEventPayload,
  HostChangedEventPayload,
  LobbyUpdatedEventPayload,
  PlayerReadyEventPayload,
  RoomUpdatedEventPayload,
  WaitingRoomChatMessage,
  WaitingRoomChatPayload,
  WaitingRoomSnapshot,
} from './types'

// 목 게이트웨이 네트워크 지연/비밀방 기본 비밀번호
const MOCK_NETWORK_DELAY_MS = 220
const DEFAULT_ROOM_PASSWORD = '1234'
const DEV_BOT_NICKNAME_PREFIX = '테스터봇'
const ROOM_PRIVATE_PASSWORDS: Record<string, string> = {
  'room-2': DEFAULT_ROOM_PASSWORD,
  'room-7': DEFAULT_ROOM_PASSWORD,
}
let devBotSequence = 1

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
  return createSeededRoomPlayers(roomId, count).map((player, index) => {
    return {
      id: player.id,
      nickname: player.nickname,
      is_ready: false,
      is_host: index === 0,
    }
  })
}

// 대기방 제어 패널에서 사용할 가짜 참가자 정보를 생성
function createDevBotPlayer(roomId: string): MockRoomPlayer {
  const botNumber = devBotSequence
  devBotSequence += 1

  return {
    id: `${roomId}-bot-${botNumber}`,
    nickname: `${DEV_BOT_NICKNAME_PREFIX}${botNumber}`,
    is_ready: false,
    is_host: false,
  }
}

// 방장 승계를 단일 규칙으로 적용
function applyHostTransfer(room: MockRoom, nextHostId: string) {
  let nextHostNickname = ''

  room.players = room.players.map((player) => {
    if (player.id !== nextHostId) {
      return {
        ...player,
        is_host: false,
      }
    }

    nextHostNickname = player.nickname
    return {
      ...player,
      is_host: true,
      is_ready: false,
    }
  })

  const hostChangedPayload: HostChangedEventPayload = {
    new_host_id: nextHostId,
    new_host_nickname: nextHostNickname,
  }
  emitSocketEvent<HostChangedEventPayload>('host_changed', hostChangedPayload)

  return hostChangedPayload
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

let roomsStore = createInitialRooms()

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
function getLobbyUpdatedPayload(
  room: MockRoom,
  action: LobbyUpdatedEventPayload['action']
): LobbyUpdatedEventPayload {
  if (action === 'removed') {
    return {
      action,
      room: {
        id: room.id,
      },
    }
  }

  const hostPlayer = room.players.find((player) => player.is_host)

  return {
    action,
    room: {
      id: room.id,
      title: room.title,
      status: room.status,
      is_private: room.is_private,
      current_players: room.players.length,
      max_players: room.max_players,
      host_id: hostPlayer?.id ?? '',
      host_nickname: hostPlayer?.nickname ?? '',
    },
  }
}

// room_updated 브로드캐스트에 맞는 대기방 snapshot payload 생성
function getRoomUpdatedPayload(room: MockRoom): RoomUpdatedEventPayload {
  return {
    room_id: room.id,
    title: room.title,
    status: room.status,
    max_players: room.max_players,
    is_private: room.is_private,
    players: room.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      is_ready: player.is_ready,
      is_host: player.is_host,
    })),
    chat_messages: room.chat_messages.map((chatMessage) => ({
      ...chatMessage,
    })),
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
  const payload = getLobbyUpdatedPayload(room, action)
  emitSocketEvent<LobbyUpdatedEventPayload>('lobby_updated', payload)
}

// 대기방 내부 인원/상태 변경을 snapshot 이벤트로 반영
function emitRoomUpdated(room: MockRoom) {
  const payload = getRoomUpdatedPayload(room)
  emitSocketEvent<RoomUpdatedEventPayload>('room_updated', payload)
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

// 게임 시작 소켓 payload를 명세 필수 필드(game_id, room_id)로 생성
function createGameStartPayload(room: MockRoom): GameStartEventPayload {
  return {
    game_id: `game-${room.id}-${Date.now()}`,
    room_id: room.id,
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

// 대기방 참가자 상태를 접속자 저장소에 일괄 반영
function syncRoomPlayersPresenceStatus(
  room: MockRoom,
  status: 'lobby' | 'in_room' | 'playing'
) {
  room.players.forEach((player) => {
    setMockOnlineUserStatus(player.id, status)
  })
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
    emitLobbyUpdated(room, 'updated')
    emitRoomUpdated(room)
    setMockOnlineUserStatus(existingPlayer.id, 'in_room')
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
  setMockOnlineUserStatus(userId, 'in_room', nickname)

  emitLobbyUpdated(room, 'status_changed')
  emitRoomUpdated(room)
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
  if (isPrivate && !ROOM_PASSWORD_PATTERN.test(password ?? '')) {
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
  syncRoomPlayersPresenceStatus(createdRoom, 'in_room')
  emitLobbyUpdated(createdRoom, 'created')

  return {
    roomId: createdRoom.id,
    roomTitle: createdRoom.title,
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
  setMockOnlineUserStatus(leftPlayer.id, 'lobby')
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
      newHostId = nextHost.id
      applyHostTransfer(room, nextHost.id)
    }
  }

  emitLobbyUpdated(room, 'status_changed')
  emitRoomUpdated(room)

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
  syncRoomPlayersPresenceStatus(room, 'playing')

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

// mock 로그인/시나리오 재시작 시 방 저장소를 초기 시드로 되돌린다.
export function resetMockWaitingRooms() {
  roomsStore = createInitialRooms()
  devBotSequence = 1
}

// DEV 목 제어: 방 현재 스냅샷을 그대로 반환
export function mockDevGetWaitingRoomSnapshot(roomId: string) {
  const room = findRoomOrThrow(roomId)
  return toWaitingRoomSnapshot(room)
}

// DEV 목 제어: non-host 가짜 참가자 1명을 추가
export function mockDevAddWaitingRoomParticipant(roomId: string) {
  const room = findRoomOrThrow(roomId)

  // 게임 중인 방에는 DEV 참가자 추가를 막음
  if (room.status === 'playing') {
    throw new WaitingRoomMockError(
      409,
      '게임 중에는 참가자를 추가할 수 없습니다.',
      {
        code: 'ROOM_ALREADY_PLAYING',
        detail: '게임 중에는 참가자를 추가할 수 없습니다.',
      }
    )
  }

  // 정원 초과를 방지
  if (room.players.length >= room.max_players) {
    throw new WaitingRoomMockError(409, '방 인원이 가득 찼습니다.', {
      code: 'ROOM_FULL',
      detail: '방 인원이 가득 찼습니다.',
    })
  }

  const createdBot = createDevBotPlayer(room.id)
  room.players.push(createdBot)
  setMockOnlineUserStatus(createdBot.id, 'in_room', createdBot.nickname)
  emitLobbyUpdated(room, 'status_changed')
  emitRoomUpdated(room)

  return toWaitingRoomSnapshot(room)
}

// DEV 목 제어: 마지막 non-host 참가자 1명을 제거
export function mockDevRemoveWaitingRoomParticipant(
  roomId: string,
  excludeUserId?: string
) {
  const room = findRoomOrThrow(roomId)
  const indexedPlayers = room.players.map((player, index) => ({
    player,
    index,
  }))

  // 현재 사용자 제외, non-host 봇을 우선 제거
  const removableBots = indexedPlayers.filter(({ player }) => {
    return (
      !player.is_host &&
      player.id !== excludeUserId &&
      player.id.startsWith(`${room.id}-bot-`)
    )
  })
  const removableBotIndex =
    removableBots.length > 0
      ? removableBots[removableBots.length - 1].index
      : undefined

  // 봇이 없으면 현재 사용자 제외 non-host를 제거
  const removablePlayers =
    removableBotIndex === undefined
      ? indexedPlayers.filter(({ player }) => {
          return !player.is_host && player.id !== excludeUserId
        })
      : []
  const removablePlayerIndex =
    removableBotIndex ??
    (removablePlayers.length > 0
      ? removablePlayers[removablePlayers.length - 1].index
      : undefined)

  // 제거 가능한 참가자가 없으면 종료
  if (removablePlayerIndex === undefined) {
    throw new WaitingRoomMockError(400, '제거할 참가자가 없습니다.', {
      code: 'PLAYER_NOT_IN_ROOM',
      detail: '제거할 참가자가 없습니다.',
    })
  }

  const [removedPlayer] = room.players.splice(removablePlayerIndex, 1)
  if (removedPlayer) {
    setMockOnlineUserStatus(removedPlayer.id, 'lobby')
  }
  emitLobbyUpdated(room, 'status_changed')
  emitRoomUpdated(room)

  return toWaitingRoomSnapshot(room)
}

// DEV 목 제어: 방장 제외 전원의 준비 상태를 일괄로 변경
export function mockDevSetAllNonHostReady(roomId: string, isReady: boolean) {
  const room = findRoomOrThrow(roomId)
  const nonHostPlayers = room.players.filter((player) => !player.is_host)

  nonHostPlayers.forEach((player) => {
    const hasChanged = player.is_ready !== isReady
    player.is_ready = isReady

    // 바뀐 사용자만 준비 상태 이벤트를 발행
    if (hasChanged) {
      const payload: PlayerReadyEventPayload = {
        player_id: player.id,
        is_ready: player.is_ready,
        all_ready: isAllReady(room),
      }
      emitSocketEvent<PlayerReadyEventPayload>('player_ready', payload)
    }
  })

  return toWaitingRoomSnapshot(room)
}

// DEV 목 제어: 게임 시작 조건(최소 2명 + non-host 전원 준비)을 즉시 만족
export function mockDevSeedStartCondition(roomId: string) {
  const room = findRoomOrThrow(roomId)

  // 플레이어가 1명뿐이면 bot을 1명 추가해 시작 최소 인원을 만족
  while (room.players.length < 2 && room.players.length < room.max_players) {
    room.players.push(createDevBotPlayer(room.id))
  }

  const snapshot = mockDevSetAllNonHostReady(roomId, true)
  emitLobbyUpdated(room, 'status_changed')
  emitRoomUpdated(room)
  return snapshot
}

// DEV 목 제어: non-host 중 첫 번째 참가자에게 방장을 넘김
export function mockDevTransferWaitingRoomHost(roomId: string) {
  const room = findRoomOrThrow(roomId)

  // 게임 중에는 방장 이관 테스트를 막음
  if (room.status === 'playing') {
    throw new WaitingRoomMockError(
      409,
      '게임 중에는 방장을 넘길 수 없습니다.',
      {
        code: 'ROOM_ALREADY_PLAYING',
        detail: '게임 중에는 방장을 넘길 수 없습니다.',
      }
    )
  }

  // 플레이어가 2명 미만이면 방장 이관 대상이 없음
  if (room.players.length < 2) {
    throw new WaitingRoomMockError(400, '방장을 넘길 참가자가 없습니다.', {
      code: 'PLAYER_NOT_IN_ROOM',
      detail: '방장을 넘길 참가자가 없습니다.',
    })
  }

  const currentHostIndex = room.players.findIndex((player) => player.is_host)

  if (currentHostIndex === -1) {
    throw new WaitingRoomMockError(400, '방장을 넘길 참가자가 없습니다.', {
      code: 'PLAYER_NOT_IN_ROOM',
      detail: '방장을 넘길 참가자가 없습니다.',
    })
  }

  const nextHostIndex = (currentHostIndex + 1) % room.players.length
  const nextHost = room.players[nextHostIndex]

  applyHostTransfer(room, nextHost.id)
  emitLobbyUpdated(room, 'status_changed')
  emitRoomUpdated(room)

  return toWaitingRoomSnapshot(room)
}

// DEV 목 제어: 현재 사용자만 남기고 대기방 상태를 초기화
export function mockDevResetWaitingRoom(
  roomId: string,
  currentUserId: string,
  currentNickname: string
) {
  const room = findRoomOrThrow(roomId)
  const removedPlayers = room.players.filter(
    (player) => player.id !== currentUserId
  )
  const currentPlayer = room.players.find(
    (player) => player.id === currentUserId
  )
  const trimmedNickname = currentNickname.trim()
  const normalizedNickname =
    currentPlayer?.nickname ??
    (trimmedNickname.length > 0 ? trimmedNickname : '플레이어')

  room.status = 'waiting'
  room.players = [
    {
      id: currentUserId,
      nickname: normalizedNickname,
      is_ready: false,
      is_host: true,
    },
  ]
  removedPlayers.forEach((player) => {
    setMockOnlineUserStatus(player.id, 'lobby')
  })
  setMockOnlineUserStatus(currentUserId, 'in_room', normalizedNickname)
  room.chat_messages = []

  // 멀티 클라이언트에서도 방장 표시가 즉시 맞도록 host_changed를 함께 발행
  applyHostTransfer(room, currentUserId)
  emitLobbyUpdated(room, 'status_changed')
  emitRoomUpdated(room)

  return toWaitingRoomSnapshot(room)
}
