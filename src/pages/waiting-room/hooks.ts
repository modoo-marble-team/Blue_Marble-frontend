import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuthSession } from '../../features/auth/types'
import {
  getWaitingRoomErrorMessage,
  joinWaitingRoom,
  leaveWaitingRoom,
  startWaitingGame,
  toggleWaitingReady,
} from './api'
import {
  enterWaitingRoomSocket,
  leaveWaitingRoomSocket,
  sendWaitingRoomChat,
  subscribeWaitingRoomSocketEvents,
} from './socket'
import type {
  ChatEventPayload,
  GameStartEventPayload,
  WaitingRoomChatMessage,
  WaitingRoomSeat,
  WaitingRoomSnapshot,
} from './types'

const DEFAULT_WAITING_ROOM_MAX_PLAYERS = 4
const AVATAR_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#f97316',
  '#22c55e',
  '#8b5cf6',
  '#14b8a6',
]

interface UseWaitingRoomControllerParams {
  roomId: string
  session: AuthSession | null
  fallbackRoomTitle?: string
  onGameStart: (payload: GameStartEventPayload) => void
}

interface WaitingRoomActionResult {
  ok: boolean
  message?: string
}

function getAvatarColor(playerId: string) {
  const colorIndex =
    playerId
      .split('')
      .reduce((sum, currentChar) => sum + currentChar.charCodeAt(0), 0) %
    AVATAR_COLORS.length

  return AVATAR_COLORS[colorIndex]
}

function getChatMessageId(payload: ChatEventPayload) {
  return `${payload.room_id}-${payload.sender_id}-${payload.sent_at}`
}

function mapChatPayloadToMessage(
  payload: ChatEventPayload
): WaitingRoomChatMessage {
  return {
    id: getChatMessageId(payload),
    senderId: payload.sender_id,
    senderNickname: payload.sender_nickname,
    content: payload.message,
    timestamp: payload.sent_at,
    type: 'talk',
  }
}

function buildWaitingRoomSeats(
  room: WaitingRoomSnapshot | null,
  myUserId: string
): Array<WaitingRoomSeat | null> {
  const maxPlayers = room?.maxPlayers ?? DEFAULT_WAITING_ROOM_MAX_PLAYERS
  const seats = Array.from(
    { length: maxPlayers },
    () => null
  ) as Array<WaitingRoomSeat | null>

  if (!room) {
    return seats
  }

  room.players.slice(0, maxPlayers).forEach((player, index) => {
    seats[index] = {
      id: player.id,
      nickname: player.nickname,
      isReady: player.isReady,
      isHost: player.isHost,
      isMe: player.id === myUserId,
      avatarColor: getAvatarColor(player.id),
    }
  })

  return seats
}

function getStartConditionMet(room: WaitingRoomSnapshot | null) {
  if (!room || room.players.length < 2) {
    return false
  }

  return room.players
    .filter((player) => !player.isHost)
    .every((player) => player.isReady)
}

export function useWaitingRoomController({
  roomId,
  session,
  fallbackRoomTitle,
  onGameStart,
}: UseWaitingRoomControllerParams) {
  const [room, setRoom] = useState<WaitingRoomSnapshot | null>(null)
  const [chatMessages, setChatMessages] = useState<WaitingRoomChatMessage[]>([])
  const [isRoomLoading, setIsRoomLoading] = useState(true)
  const [roomErrorMessage, setRoomErrorMessage] = useState<string | null>(null)
  const [isReadyPending, setIsReadyPending] = useState(false)
  const [isStartPending, setIsStartPending] = useState(false)
  const [isLeavePending, setIsLeavePending] = useState(false)

  const hasEnteredRoomRef = useRef(false)
  const hasLeftRoomRef = useRef(false)

  useEffect(() => {
    if (!roomId) {
      setRoom(null)
      setChatMessages([])
      setIsRoomLoading(false)
      setRoomErrorMessage(null)
      hasEnteredRoomRef.current = false
      hasLeftRoomRef.current = false
      return
    }

    if (!session) {
      setRoom(null)
      setChatMessages([])
      setIsRoomLoading(false)
      setRoomErrorMessage(null)
      hasEnteredRoomRef.current = false
      hasLeftRoomRef.current = false
      return
    }

    const activeSession = session
    let isMounted = true

    async function joinRoom() {
      setIsRoomLoading(true)
      setRoomErrorMessage(null)

      try {
        const joinedRoom = await joinWaitingRoom({
          roomId,
          userId: activeSession.userId,
          nickname: activeSession.nickname,
          fallbackTitle: fallbackRoomTitle,
        })

        if (!isMounted) {
          return
        }

        setRoom(joinedRoom)
        setChatMessages(joinedRoom.chatMessages)
        enterWaitingRoomSocket({ roomId })
        hasEnteredRoomRef.current = true
        hasLeftRoomRef.current = false
      } catch (error) {
        if (!isMounted) {
          return
        }

        setRoomErrorMessage(
          getWaitingRoomErrorMessage(error, '대기방 입장에 실패했습니다.')
        )
      } finally {
        if (isMounted) {
          setIsRoomLoading(false)
        }
      }
    }

    joinRoom()

    return () => {
      isMounted = false
    }
  }, [fallbackRoomTitle, roomId, session])

  const activeRoomId = room?.roomId

  useEffect(() => {
    if (!roomId || !session || !activeRoomId) {
      return
    }

    const unsubscribe = subscribeWaitingRoomSocketEvents({
      onPlayerReady: (payload) => {
        setRoom((previousRoom) => {
          if (!previousRoom) {
            return previousRoom
          }

          return {
            ...previousRoom,
            players: previousRoom.players.map((player) => {
              if (player.id !== payload.player_id) {
                return player
              }

              return {
                ...player,
                isReady: payload.is_ready,
              }
            }),
          }
        })
      },
      onHostChanged: (payload) => {
        setRoom((previousRoom) => {
          if (!previousRoom) {
            return previousRoom
          }

          return {
            ...previousRoom,
            players: previousRoom.players.map((player) => ({
              ...player,
              isHost: player.id === payload.new_host_id,
              isReady:
                player.id === payload.new_host_id ? false : player.isReady,
            })),
          }
        })
      },
      onChat: (payload) => {
        if (payload.room_id !== activeRoomId) {
          return
        }

        const message = mapChatPayloadToMessage(payload)

        setChatMessages((previousMessages) => {
          const hasSameMessage = previousMessages.some(
            (previousMessage) => previousMessage.id === message.id
          )

          if (hasSameMessage) {
            return previousMessages
          }

          return [...previousMessages, message]
        })
      },
      onGameStart: (payload) => {
        onGameStart(payload)
      },
    })

    return () => {
      unsubscribe()
    }
  }, [activeRoomId, onGameStart, roomId, session])

  useEffect(() => {
    return () => {
      if (!hasEnteredRoomRef.current || hasLeftRoomRef.current) {
        return
      }

      leaveWaitingRoomSocket({ roomId })
    }
  }, [roomId])

  const me = useMemo(() => {
    if (!room || !session) {
      return null
    }

    return room.players.find((player) => player.id === session.userId) ?? null
  }, [room, session])

  const isHost = me?.isHost ?? false
  const isReady = me?.isReady ?? false
  const canToggleReady = Boolean(me) && !isHost
  const canStartGame = isHost && getStartConditionMet(room)

  const seats = useMemo(() => {
    return buildWaitingRoomSeats(room, session?.userId ?? '')
  }, [room, session])

  const sendChatMessage = useCallback(
    (message: string) => {
      if (!room || !session) {
        return
      }

      sendWaitingRoomChat({
        roomId: room.roomId,
        senderId: session.userId,
        senderNickname: session.nickname,
        message,
      })
    },
    [room, session]
  )

  const handleToggleReady =
    useCallback(async (): Promise<WaitingRoomActionResult> => {
      if (!room || !session || !canToggleReady || isReadyPending) {
        return {
          ok: false,
        }
      }

      setIsReadyPending(true)

      try {
        const result = await toggleWaitingReady({
          roomId: room.roomId,
          userId: session.userId,
        })

        setRoom((previousRoom) => {
          if (!previousRoom) {
            return previousRoom
          }

          return {
            ...previousRoom,
            players: previousRoom.players.map((player) => {
              if (player.id !== session.userId) {
                return player
              }

              return {
                ...player,
                isReady: result.isReady,
              }
            }),
          }
        })

        return {
          ok: true,
        }
      } catch (error) {
        return {
          ok: false,
          message: getWaitingRoomErrorMessage(
            error,
            '준비 상태를 변경하지 못했습니다.'
          ),
        }
      } finally {
        setIsReadyPending(false)
      }
    }, [canToggleReady, isReadyPending, room, session])

  const handleStartGame =
    useCallback(async (): Promise<WaitingRoomActionResult> => {
      if (!room || !session || !canStartGame || isStartPending) {
        return {
          ok: false,
        }
      }

      setIsStartPending(true)

      try {
        await startWaitingGame({
          roomId: room.roomId,
          userId: session.userId,
        })

        return {
          ok: true,
        }
      } catch (error) {
        return {
          ok: false,
          message: getWaitingRoomErrorMessage(
            error,
            '게임 시작에 실패했습니다.'
          ),
        }
      } finally {
        setIsStartPending(false)
      }
    }, [canStartGame, isStartPending, room, session])

  const leaveRoom = useCallback(async (): Promise<WaitingRoomActionResult> => {
    if (!room || !session || hasLeftRoomRef.current) {
      return {
        ok: true,
      }
    }

    if (isLeavePending) {
      return {
        ok: false,
      }
    }

    setIsLeavePending(true)

    try {
      await leaveWaitingRoom({
        roomId: room.roomId,
        userId: session.userId,
      })
      leaveWaitingRoomSocket({
        roomId: room.roomId,
      })
      hasLeftRoomRef.current = true

      return {
        ok: true,
      }
    } catch (error) {
      return {
        ok: false,
        message: getWaitingRoomErrorMessage(
          error,
          '대기방 퇴장에 실패했습니다.'
        ),
      }
    } finally {
      setIsLeavePending(false)
    }
  }, [isLeavePending, room, session])

  return {
    room,
    seats,
    chatMessages,
    isRoomLoading,
    roomErrorMessage,
    isReadyPending,
    isStartPending,
    isLeavePending,
    isHost,
    isReady,
    canToggleReady,
    canStartGame,
    sendChatMessage,
    handleToggleReady,
    handleStartGame,
    leaveRoom,
  }
}
