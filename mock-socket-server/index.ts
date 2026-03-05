import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import process from 'node:process'
import { Server, type Socket } from 'socket.io'
import {
  SOCKET_EVENTS,
  type ContractOnlineUser,
  type GameStartEventPayload,
  type HostChangedEventPayload,
  type PlayerReadyEventPayload,
  type SocketAck,
} from '../src/contracts/socket'
import {
  chatEventSchema,
  directMessageReceiveEventSchema,
  directMessageSendEventSchema,
  enterRoomEventSchema,
  gameStartEventSchema,
  hostChangedEventSchema,
  leaveRoomEventSchema,
  onlineUsersEventSchema,
  playerReadyEventSchema,
  sendChatEventSchema,
  startGameEventSchema,
  toggleReadyEventSchema,
  validateSocketEventPayload,
} from '../src/contracts/socket'

interface HandshakeAuth {
  userId?: string
  nickname?: string
}

type AckHandler<T = Record<string, never>> = (response: SocketAck<T>) => void

const DEFAULT_PORT = 3000
const DEFAULT_ROOM_MAX_PLAYERS = 4
const STATUS_IN_ROOM: ContractOnlineUser['status'] = 'in_room'
const STATUS_LOBBY: ContractOnlineUser['status'] = 'lobby'
const STATUS_PLAYING: ContractOnlineUser['status'] = 'playing'

interface MockRoomPlayer {
  id: string
  nickname: string
  socketId: string
  isReady: boolean
  isHost: boolean
}

interface MockRoom {
  id: string
  status: 'waiting' | 'playing'
  maxPlayers: number
  players: MockRoomPlayer[]
}

// 연결된 사용자 목록을 소켓 ID 기준으로 저장
const connectedUsersBySocketId = new Map<string, ContractOnlineUser>()

// DM 송신 시 대상 소켓을 찾기 위해 userId -> socketId 인덱스를 유지
const socketIdByUserId = new Map<string, string>()

// 대기방 참가자 추적을 위해 roomId -> room 상태 저장
const roomsById = new Map<string, MockRoom>()
const roomIdByUserId = new Map<string, string>()

function resolveHandshakeAuth(socket: Socket): HandshakeAuth {
  if (
    typeof socket.handshake.auth !== 'object' ||
    socket.handshake.auth === null
  ) {
    return {}
  }

  const auth = socket.handshake.auth as Record<string, unknown>
  return {
    userId: typeof auth.userId === 'string' ? auth.userId : undefined,
    nickname: typeof auth.nickname === 'string' ? auth.nickname : undefined,
  }
}

function createConnectedUser(socket: Socket): ContractOnlineUser {
  const handshakeAuth = resolveHandshakeAuth(socket)
  const fallbackKey = socket.id.slice(0, 8)

  return {
    id: handshakeAuth.userId ?? `guest-${fallbackKey}`,
    nickname: handshakeAuth.nickname ?? `Guest-${fallbackKey}`,
    status: STATUS_LOBBY,
  }
}

function ackSuccess<T>(ack: AckHandler<T> | undefined, data: T) {
  if (!ack) {
    return
  }

  ack({
    ok: true,
    data,
  })
}

function ackError<T>(
  ack: AckHandler<T> | undefined,
  detail: string,
  code: string
) {
  if (!ack) {
    return
  }

  ack({
    ok: false,
    error: {
      detail,
      code,
    },
  })
}

function broadcastOnlineUsers(io: Server) {
  const payload = {
    users: Array.from(connectedUsersBySocketId.values()),
  }

  const validated = validateSocketEventPayload(onlineUsersEventSchema, payload)
  if (!validated.success) {
    return
  }

  io.emit(SOCKET_EVENTS.onlineUsers, validated.data)
}

function setConnectedUserStatus(
  userId: string,
  status: ContractOnlineUser['status']
) {
  const socketId = socketIdByUserId.get(userId)
  if (!socketId) {
    return
  }

  const currentUser = connectedUsersBySocketId.get(socketId)
  if (!currentUser) {
    return
  }

  connectedUsersBySocketId.set(socketId, {
    ...currentUser,
    status,
  })
}

function getConnectedUser(socketId: string) {
  return connectedUsersBySocketId.get(socketId)
}

function getOrCreateRoom(roomId: string) {
  const existingRoom = roomsById.get(roomId)
  if (existingRoom) {
    return existingRoom
  }

  const createdRoom: MockRoom = {
    id: roomId,
    status: 'waiting',
    maxPlayers: DEFAULT_ROOM_MAX_PLAYERS,
    players: [],
  }
  roomsById.set(roomId, createdRoom)
  return createdRoom
}

function canStartGame(room: MockRoom) {
  if (room.players.length < 2) {
    return false
  }

  const nonHostPlayers = room.players.filter((player) => !player.isHost)
  if (nonHostPlayers.length === 0) {
    return false
  }

  return nonHostPlayers.every((player) => player.isReady)
}

function emitHostChanged(io: Server, room: MockRoom, nextHost: MockRoomPlayer) {
  const payload: HostChangedEventPayload = {
    new_host_id: nextHost.id,
    new_host_nickname: nextHost.nickname,
  }

  const validated = validateSocketEventPayload(hostChangedEventSchema, payload)
  if (!validated.success) {
    return
  }

  io.to(room.id).emit(SOCKET_EVENTS.hostChanged, validated.data)
}

function emitPlayerReady(io: Server, room: MockRoom, player: MockRoomPlayer) {
  const payload: PlayerReadyEventPayload = {
    player_id: player.id,
    is_ready: player.isReady,
    all_ready: canStartGame(room),
  }

  const validated = validateSocketEventPayload(playerReadyEventSchema, payload)
  if (!validated.success) {
    return
  }

  io.to(room.id).emit(SOCKET_EVENTS.playerReady, validated.data)
}

function removeUserFromRoom(io: Server, roomId: string, userId: string) {
  const room = roomsById.get(roomId)
  if (!room) {
    return {
      ok: false as const,
      code: 'ROOM_NOT_FOUND',
      detail: '존재하지 않는 방입니다.',
    }
  }

  const playerIndex = room.players.findIndex((player) => player.id === userId)
  if (playerIndex === -1) {
    return {
      ok: false as const,
      code: 'ALREADY_LEFT_ROOM',
      detail: '이미 방에서 나간 상태입니다.',
    }
  }

  const [leftPlayer] = room.players.splice(playerIndex, 1)
  roomIdByUserId.delete(userId)
  setConnectedUserStatus(userId, STATUS_LOBBY)

  if (room.players.length === 0) {
    roomsById.delete(room.id)
    return {
      ok: true as const,
      leftPlayer,
    }
  }

  if (leftPlayer.isHost) {
    const [nextHost] = room.players
    nextHost.isHost = true
    nextHost.isReady = false
    emitHostChanged(io, room, nextHost)
  }

  return {
    ok: true as const,
    leftPlayer,
  }
}

function emitGameStart(io: Server, room: MockRoom) {
  const payload: GameStartEventPayload = {
    game_id: `game-${room.id}-${Date.now()}`,
    room_id: room.id,
  }

  const validated = validateSocketEventPayload(gameStartEventSchema, payload)
  if (!validated.success) {
    return null
  }

  io.to(room.id).emit(SOCKET_EVENTS.gameStart, validated.data)
  return validated.data
}

function configureSocketHandlers(io: Server, socket: Socket) {
  socket.on(
    SOCKET_EVENTS.enterRoom,
    (
      payload: unknown,
      ack?: AckHandler<{ room_id: string; is_host: boolean }>
    ) => {
      const validated = validateSocketEventPayload(
        enterRoomEventSchema,
        payload
      )
      if (!validated.success) {
        ackError(ack, validated.error.detail, validated.error.code)
        return
      }

      const connectedUser = getConnectedUser(socket.id)
      if (!connectedUser) {
        ackError(ack, '사용자 연결을 찾을 수 없습니다.', 'USER_NOT_CONNECTED')
        return
      }

      const previousRoomId = roomIdByUserId.get(connectedUser.id)
      if (previousRoomId && previousRoomId !== validated.data.room_id) {
        const leaveResult = removeUserFromRoom(
          io,
          previousRoomId,
          connectedUser.id
        )
        if (!leaveResult.ok) {
          ackError(ack, leaveResult.detail, leaveResult.code)
          return
        }
        socket.leave(previousRoomId)
      }

      const room = getOrCreateRoom(validated.data.room_id)
      const existingPlayer = room.players.find(
        (player) => player.id === connectedUser.id
      )

      if (existingPlayer) {
        existingPlayer.socketId = socket.id
        existingPlayer.nickname = connectedUser.nickname
        roomIdByUserId.set(connectedUser.id, room.id)
        socket.join(room.id)
        setConnectedUserStatus(connectedUser.id, STATUS_IN_ROOM)
        broadcastOnlineUsers(io)
        ackSuccess(ack, {
          room_id: room.id,
          is_host: existingPlayer.isHost,
        })
        return
      }

      if (room.status === 'playing') {
        ackError(ack, '이미 게임이 시작된 방입니다.', 'ROOM_ALREADY_PLAYING')
        return
      }

      if (room.players.length >= room.maxPlayers) {
        ackError(ack, '방 인원이 가득 찼습니다.', 'ROOM_FULL')
        return
      }

      const isHost = room.players.length === 0
      room.players.push({
        id: connectedUser.id,
        nickname: connectedUser.nickname,
        socketId: socket.id,
        isReady: false,
        isHost,
      })

      roomIdByUserId.set(connectedUser.id, room.id)
      socket.join(room.id)
      setConnectedUserStatus(connectedUser.id, STATUS_IN_ROOM)
      broadcastOnlineUsers(io)
      ackSuccess(ack, {
        room_id: room.id,
        is_host: isHost,
      })
    }
  )

  socket.on(
    SOCKET_EVENTS.leaveRoom,
    (
      payload: unknown,
      ack?: AckHandler<{ room_id: string; left: boolean }>
    ) => {
      const validated = validateSocketEventPayload(
        leaveRoomEventSchema,
        payload
      )
      if (!validated.success) {
        ackError(ack, validated.error.detail, validated.error.code)
        return
      }

      const connectedUser = getConnectedUser(socket.id)
      if (!connectedUser) {
        ackError(ack, '사용자 연결을 찾을 수 없습니다.', 'USER_NOT_CONNECTED')
        return
      }

      const joinedRoomId = roomIdByUserId.get(connectedUser.id)
      if (joinedRoomId !== validated.data.room_id) {
        ackError(ack, '이미 방에서 나간 상태입니다.', 'ALREADY_LEFT_ROOM')
        return
      }

      const leaveResult = removeUserFromRoom(
        io,
        validated.data.room_id,
        connectedUser.id
      )
      if (!leaveResult.ok) {
        ackError(ack, leaveResult.detail, leaveResult.code)
        return
      }

      socket.leave(validated.data.room_id)
      broadcastOnlineUsers(io)
      ackSuccess(ack, {
        room_id: validated.data.room_id,
        left: true,
      })
    }
  )

  socket.on(SOCKET_EVENTS.sendChat, (payload: unknown, ack?: AckHandler) => {
    const validated = validateSocketEventPayload(sendChatEventSchema, payload)
    if (!validated.success) {
      ackError(ack, validated.error.detail, validated.error.code)
      return
    }

    const sender = connectedUsersBySocketId.get(socket.id)
    if (!sender) {
      ackError(ack, '사용자 연결을 찾을 수 없습니다.', 'USER_NOT_CONNECTED')
      return
    }

    const senderRoomId = roomIdByUserId.get(sender.id)
    if (!senderRoomId || senderRoomId !== validated.data.room_id) {
      ackError(ack, '방 참가자를 찾을 수 없습니다.', 'PLAYER_NOT_IN_ROOM')
      return
    }

    if (!roomsById.has(validated.data.room_id)) {
      ackError(ack, '존재하지 않는 방입니다.', 'ROOM_NOT_FOUND')
      return
    }

    const chatPayload = {
      room_id: validated.data.room_id,
      sender_id: sender.id,
      sender_nickname: sender.nickname,
      message: validated.data.message,
      sent_at: new Date().toISOString(),
    }

    const chatValidated = validateSocketEventPayload(
      chatEventSchema,
      chatPayload
    )
    if (!chatValidated.success) {
      ackError(ack, chatValidated.error.detail, chatValidated.error.code)
      return
    }

    io.to(validated.data.room_id).emit(SOCKET_EVENTS.chat, chatValidated.data)
    ackSuccess(ack, {})
  })

  socket.on(
    SOCKET_EVENTS.toggleReady,
    (
      payload: unknown,
      ack?: AckHandler<{ is_ready: boolean; all_ready: boolean }>
    ) => {
      const validated = validateSocketEventPayload(
        toggleReadyEventSchema,
        payload
      )
      if (!validated.success) {
        ackError(ack, validated.error.detail, validated.error.code)
        return
      }

      const connectedUser = getConnectedUser(socket.id)
      if (!connectedUser) {
        ackError(ack, '사용자 연결을 찾을 수 없습니다.', 'USER_NOT_CONNECTED')
        return
      }

      const room = roomsById.get(validated.data.room_id)
      if (!room) {
        ackError(ack, '존재하지 않는 방입니다.', 'ROOM_NOT_FOUND')
        return
      }

      const player = room.players.find(
        (target) => target.id === connectedUser.id
      )
      if (!player) {
        ackError(ack, '방 참가자를 찾을 수 없습니다.', 'PLAYER_NOT_IN_ROOM')
        return
      }

      if (player.isHost) {
        ackError(
          ack,
          '방장은 준비 상태를 변경할 수 없습니다.',
          'HOST_CANNOT_TOGGLE_READY'
        )
        return
      }

      if (room.status === 'playing') {
        ackError(ack, '이미 게임이 시작된 방입니다.', 'ROOM_ALREADY_PLAYING')
        return
      }

      player.isReady = !player.isReady
      emitPlayerReady(io, room, player)
      ackSuccess(ack, {
        is_ready: player.isReady,
        all_ready: canStartGame(room),
      })
    }
  )

  socket.on(
    SOCKET_EVENTS.startGame,
    (
      payload: unknown,
      ack?: AckHandler<{ game_id: string; room_id: string }>
    ) => {
      const validated = validateSocketEventPayload(
        startGameEventSchema,
        payload
      )
      if (!validated.success) {
        ackError(ack, validated.error.detail, validated.error.code)
        return
      }

      const connectedUser = getConnectedUser(socket.id)
      if (!connectedUser) {
        ackError(ack, '사용자 연결을 찾을 수 없습니다.', 'USER_NOT_CONNECTED')
        return
      }

      const room = roomsById.get(validated.data.room_id)
      if (!room) {
        ackError(ack, '존재하지 않는 방입니다.', 'ROOM_NOT_FOUND')
        return
      }

      const player = room.players.find(
        (target) => target.id === connectedUser.id
      )
      if (!player) {
        ackError(ack, '방 참가자를 찾을 수 없습니다.', 'PLAYER_NOT_IN_ROOM')
        return
      }

      if (!player.isHost) {
        ackError(
          ack,
          '방장만 게임을 시작할 수 있습니다.',
          'ONLY_HOST_CAN_START'
        )
        return
      }

      if (room.status === 'playing') {
        ackError(ack, '이미 게임이 시작된 방입니다.', 'ROOM_ALREADY_PLAYING')
        return
      }

      if (!canStartGame(room)) {
        ackError(
          ack,
          '최소 2명 + 전원 준비 완료 조건이 필요합니다.',
          'READY_CONDITION_NOT_MET'
        )
        return
      }

      room.status = 'playing'
      room.players.forEach((roomPlayer) => {
        setConnectedUserStatus(roomPlayer.id, STATUS_PLAYING)
      })
      broadcastOnlineUsers(io)

      const gameStartPayload = emitGameStart(io, room)
      if (!gameStartPayload) {
        ackError(
          ack,
          '게임 시작 이벤트 생성에 실패했습니다.',
          'GAME_START_FAILED'
        )
        return
      }

      ackSuccess(ack, gameStartPayload)
    }
  )

  socket.on(
    SOCKET_EVENTS.directMessageSend,
    (payload: unknown, ack?: AckHandler<{ delivered: boolean }>) => {
      const validated = validateSocketEventPayload(
        directMessageSendEventSchema,
        payload
      )
      if (!validated.success) {
        ackError(ack, validated.error.detail, validated.error.code)
        return
      }

      const sender = connectedUsersBySocketId.get(socket.id)
      if (!sender) {
        ackError(ack, '사용자 연결을 찾을 수 없습니다.', 'USER_NOT_CONNECTED')
        return
      }

      const receiverSocketId = socketIdByUserId.get(validated.data.receiver_id)
      if (!receiverSocketId) {
        ackError(ack, '상대 사용자가 오프라인입니다.', 'RECEIVER_NOT_FOUND')
        return
      }

      const receivePayload = {
        sender_id: sender.id,
        sender_nickname: sender.nickname,
        message: validated.data.message,
        sent_at: new Date().toISOString(),
      }

      const receiveValidated = validateSocketEventPayload(
        directMessageReceiveEventSchema,
        receivePayload
      )

      if (!receiveValidated.success) {
        ackError(
          ack,
          receiveValidated.error.detail,
          receiveValidated.error.code
        )
        return
      }

      io.to(receiverSocketId).emit(
        SOCKET_EVENTS.directMessageReceive,
        receiveValidated.data
      )
      ackSuccess(ack, { delivered: true })
    }
  )
}

function bootstrapSocketMockServer() {
  const app = express()
  const httpServer = createServer(app)

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  )

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      mode: 'socket-mock',
      connected_users: connectedUsersBySocketId.size,
    })
  })

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      mode: 'socket-mock',
      connected_users: connectedUsersBySocketId.size,
    })
  })

  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    const connectedUser = createConnectedUser(socket)
    const previousSocketId = socketIdByUserId.get(connectedUser.id)

    // 동일 userId 재연결 시 이전 소켓 엔트리를 정리
    if (previousSocketId && previousSocketId !== socket.id) {
      connectedUsersBySocketId.delete(previousSocketId)
    }

    connectedUsersBySocketId.set(socket.id, connectedUser)
    socketIdByUserId.set(connectedUser.id, socket.id)

    const joinedRoomId = roomIdByUserId.get(connectedUser.id)
    if (joinedRoomId) {
      const joinedRoom = roomsById.get(joinedRoomId)
      const joinedPlayer = joinedRoom?.players.find(
        (player) => player.id === connectedUser.id
      )

      if (joinedRoom && joinedPlayer) {
        joinedPlayer.socketId = socket.id
        socket.join(joinedRoom.id)
        setConnectedUserStatus(
          connectedUser.id,
          joinedRoom.status === 'playing' ? STATUS_PLAYING : STATUS_IN_ROOM
        )
      }
    }

    broadcastOnlineUsers(io)
    configureSocketHandlers(io, socket)

    socket.on('disconnect', () => {
      const disconnectedUser = connectedUsersBySocketId.get(socket.id)
      if (!disconnectedUser) {
        broadcastOnlineUsers(io)
        return
      }

      // 이미 같은 userId가 다른 소켓으로 재연결된 경우 현재 소켓만 정리
      if (socketIdByUserId.get(disconnectedUser.id) !== socket.id) {
        connectedUsersBySocketId.delete(socket.id)
        broadcastOnlineUsers(io)
        return
      }

      const joinedRoomId = roomIdByUserId.get(disconnectedUser.id)
      if (joinedRoomId) {
        removeUserFromRoom(io, joinedRoomId, disconnectedUser.id)
      }

      socketIdByUserId.delete(disconnectedUser.id)
      connectedUsersBySocketId.delete(socket.id)
      broadcastOnlineUsers(io)
    })
  })

  const parsedPort = Number(process.env.MOCK_SOCKET_PORT ?? DEFAULT_PORT)
  const listenPort = Number.isNaN(parsedPort) ? DEFAULT_PORT : parsedPort

  httpServer.listen(listenPort, () => {
    console.log(`[socket-mock] listening on http://localhost:${listenPort}`)
  })

  const shutdown = () => {
    io.close(() => {
      httpServer.close(() => {
        process.exit(0)
      })
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

bootstrapSocketMockServer()
