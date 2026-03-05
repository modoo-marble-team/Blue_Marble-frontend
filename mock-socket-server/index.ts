import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import process from 'node:process'
import { Server, type Socket } from 'socket.io'
import {
  SOCKET_EVENTS,
  type ContractOnlineUser,
  type SocketAck,
} from '../src/contracts/socket'
import {
  chatEventSchema,
  directMessageReceiveEventSchema,
  directMessageSendEventSchema,
  enterRoomEventSchema,
  leaveRoomEventSchema,
  onlineUsersEventSchema,
  sendChatEventSchema,
  validateSocketEventPayload,
} from '../src/contracts/socket'

interface HandshakeAuth {
  userId?: string
  nickname?: string
}

type AckHandler<T = Record<string, never>> = (response: SocketAck<T>) => void

const DEFAULT_PORT = 3000
const STATUS_IN_ROOM: ContractOnlineUser['status'] = 'in_room'
const STATUS_LOBBY: ContractOnlineUser['status'] = 'lobby'

// 연결된 사용자 목록을 소켓 ID 기준으로 저장
const connectedUsersBySocketId = new Map<string, ContractOnlineUser>()

// DM 송신 시 대상 소켓을 찾기 위해 userId -> socketId 인덱스를 유지
const socketIdByUserId = new Map<string, string>()

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

function updateUserStatus(
  socketId: string,
  status: ContractOnlineUser['status']
) {
  const currentUser = connectedUsersBySocketId.get(socketId)
  if (!currentUser) {
    return
  }

  connectedUsersBySocketId.set(socketId, {
    ...currentUser,
    status,
  })
}

function configureSocketHandlers(io: Server, socket: Socket) {
  socket.on(SOCKET_EVENTS.enterRoom, (payload: unknown, ack?: AckHandler) => {
    const validated = validateSocketEventPayload(enterRoomEventSchema, payload)
    if (!validated.success) {
      ackError(ack, validated.error.detail, validated.error.code)
      return
    }

    socket.join(validated.data.room_id)
    updateUserStatus(socket.id, STATUS_IN_ROOM)
    broadcastOnlineUsers(io)
    ackSuccess(ack, {})
  })

  socket.on(SOCKET_EVENTS.leaveRoom, (payload: unknown, ack?: AckHandler) => {
    const validated = validateSocketEventPayload(leaveRoomEventSchema, payload)
    if (!validated.success) {
      ackError(ack, validated.error.detail, validated.error.code)
      return
    }

    socket.leave(validated.data.room_id)
    updateUserStatus(socket.id, STATUS_LOBBY)
    broadcastOnlineUsers(io)
    ackSuccess(ack, {})
  })

  socket.on(SOCKET_EVENTS.sendChat, (payload: unknown, ack?: AckHandler) => {
    const validated = validateSocketEventPayload(sendChatEventSchema, payload)
    if (!validated.success) {
      ackError(ack, validated.error.detail, validated.error.code)
      return
    }

    const sender = connectedUsersBySocketId.get(socket.id)
    if (!sender) {
      ackError(ack, 'Sender is not connected', 'SENDER_NOT_FOUND')
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
        ackError(ack, 'Sender is not connected', 'SENDER_NOT_FOUND')
        return
      }

      const receiverSocketId = socketIdByUserId.get(validated.data.receiver_id)
      if (!receiverSocketId) {
        ackError(ack, 'Receiver is not connected', 'RECEIVER_NOT_FOUND')
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
    connectedUsersBySocketId.set(socket.id, connectedUser)
    socketIdByUserId.set(connectedUser.id, socket.id)
    broadcastOnlineUsers(io)
    configureSocketHandlers(io, socket)

    socket.on('disconnect', () => {
      const disconnectedUser = connectedUsersBySocketId.get(socket.id)
      connectedUsersBySocketId.delete(socket.id)

      if (disconnectedUser) {
        socketIdByUserId.delete(disconnectedUser.id)
      }

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
