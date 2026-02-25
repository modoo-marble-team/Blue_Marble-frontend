import { useEffect, useState } from 'react'
import { socket } from '../../lib/socket'
import { mockOnlineUsers } from './mockData'
import type {
  OnlineUser,
  OnlineUserPayload,
  OnlineUsersEventPayload,
} from './types'

const ONLINE_USERS_EVENT = 'online_users'
const SOCKET_MOCK_INTERVAL_MS = 5_000
const USE_SOCKET_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'
const AVATAR_BACKGROUND_COLORS = [
  '#f6c8a9',
  '#7f8ea3',
  '#dbc4f8',
  '#8f7f77',
  '#b5d9ff',
  '#ffd8a6',
]

interface SocketWithListeners {
  listeners: (
    eventName: string
  ) => Array<(payload: OnlineUsersEventPayload) => void>
}

function getAvatarText(nickname: string) {
  const trimmedNickname = nickname.trim()
  if (trimmedNickname.length === 0) {
    return '?'
  }

  return trimmedNickname.slice(0, 1).toUpperCase()
}

function getAvatarBackground(userId: string) {
  const colorIndex =
    userId
      .split('')
      .reduce((acc, character) => acc + character.charCodeAt(0), 0) %
    AVATAR_BACKGROUND_COLORS.length
  return AVATAR_BACKGROUND_COLORS[colorIndex]
}

function mapOnlineUsers(payloadUsers: OnlineUserPayload[]): OnlineUser[] {
  return payloadUsers.map((user) => ({
    ...user,
    avatarText: getAvatarText(user.nickname),
    avatarBackground: getAvatarBackground(user.id),
  }))
}

function emitOnlineUsersMock(payloadUsers: OnlineUserPayload[]) {
  const socketWithListeners = socket as unknown as SocketWithListeners
  const listeners = socketWithListeners.listeners(ONLINE_USERS_EVENT)
  listeners.forEach((listener) => listener({ users: payloadUsers }))
}

export function useOnlineUsersSocket() {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const handleOnlineUsers = ({
      users: payloadUsers,
    }: OnlineUsersEventPayload) => {
      setUsers(mapOnlineUsers(payloadUsers))
      setIsLoading(false)
      setIsError(false)
    }

    const handleConnectError = () => {
      setIsLoading(false)
      setIsError(true)
    }

    const handleDisconnect = () => {
      setIsError(true)
    }

    socket.on(ONLINE_USERS_EVENT, handleOnlineUsers)

    let mockIntervalId: ReturnType<typeof setInterval> | undefined

    if (USE_SOCKET_MOCK) {
      emitOnlineUsersMock(mockOnlineUsers)
      mockIntervalId = setInterval(() => {
        emitOnlineUsersMock(mockOnlineUsers)
      }, SOCKET_MOCK_INTERVAL_MS)
    } else {
      socket.on('connect_error', handleConnectError)
      socket.on('disconnect', handleDisconnect)

      if (!socket.connected) {
        socket.connect()
      }
    }

    return () => {
      socket.off(ONLINE_USERS_EVENT, handleOnlineUsers)
      socket.off('connect_error', handleConnectError)
      socket.off('disconnect', handleDisconnect)

      if (mockIntervalId) {
        clearInterval(mockIntervalId)
      }
    }
  }, [])

  return {
    data: users,
    isLoading,
    isError,
  }
}
