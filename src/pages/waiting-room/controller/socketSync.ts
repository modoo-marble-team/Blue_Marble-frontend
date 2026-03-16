import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AuthSession } from '../../../features/auth/types'
import { subscribeWaitingRoomSocketEvents } from '../socket'
import type {
  GameStartEventPayload,
  LobbyUpdatedEventPayload,
  WaitingRoomChatMessage,
  WaitingRoomSnapshot,
} from '../types'
import { mapChatPayloadToMessage } from './state'

// 소켓 동기화 훅 입력 파라미터 타입
interface UseWaitingRoomSocketSyncParams {
  roomId: string
  session: AuthSession | null
  activeRoomId?: string
  onGameStart: (payload: GameStartEventPayload) => void
  onRoomRemoved: () => void
  setRoom: Dispatch<SetStateAction<WaitingRoomSnapshot | null>>
  setChatMessages: Dispatch<SetStateAction<WaitingRoomChatMessage[]>>
}

// 대기방 소켓 이벤트를 구독해 room/chat 상태를 동기화
export function useWaitingRoomSocketSync({
  roomId,
  session,
  activeRoomId,
  onGameStart,
  onRoomRemoved,
  setRoom,
  setChatMessages,
}: UseWaitingRoomSocketSyncParams) {
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
        // 다른 방 채팅 이벤트는 무시
        if (payload.room_id !== activeRoomId) {
          return
        }

        const message = mapChatPayloadToMessage(payload)

        setChatMessages((previousMessages) => {
          const hasSameMessage = previousMessages.some(
            (previousMessage) => previousMessage.id === message.id
          )

          // 동일 메시지 중복 삽입 방지
          if (hasSameMessage) {
            return previousMessages
          }

          return [...previousMessages, message]
        })
      },
      onGameStart: (payload) => {
        // 다른 방 시작 이벤트는 무시
        if (payload.room_id !== activeRoomId) {
          return
        }

        onGameStart(payload)
      },
      onLobbyUpdated: (payload: LobbyUpdatedEventPayload) => {
        if (payload.action !== 'removed' || payload.room.id !== activeRoomId) {
          return
        }

        setRoom(null)
        setChatMessages([])
        onRoomRemoved()
      },
    })

    return () => {
      unsubscribe()
    }
  }, [
    activeRoomId,
    onGameStart,
    onRoomRemoved,
    roomId,
    session,
    setChatMessages,
    setRoom,
  ])
}
