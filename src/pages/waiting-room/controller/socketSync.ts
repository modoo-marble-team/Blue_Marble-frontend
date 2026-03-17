import { useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { AuthSession } from '../../../features/auth/session/types'
import { requestOnlineUsersSnapshotSync } from '../../../features/presence/online-users/onlineUsersSocket'
import { mapWaitingRoomSnapshotPayload } from '../api/api'
import { subscribeWaitingRoomSocketEvents } from '../socket/socket'
import type {
  GameStartEventPayload,
  LobbyUpdatedEventPayload,
  RoomUpdatedEventPayload,
  WaitingRoomChatMessage,
  WaitingRoomSnapshot,
} from '../api/types'
import { mapChatPayloadToMessage } from './state'

// 소켓 동기화 훅 입력 파라미터 타입
interface UseWaitingRoomSocketSyncParams {
  roomId: string
  session: AuthSession | null
  activeRoomId?: string
  hasReceivedRoomUpdatedRef: MutableRefObject<boolean>
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
  hasReceivedRoomUpdatedRef,
  onGameStart,
  onRoomRemoved,
  setRoom,
  setChatMessages,
}: UseWaitingRoomSocketSyncParams) {
  useEffect(() => {
    if (!roomId || !session) {
      return
    }

    const targetRoomId = activeRoomId ?? roomId

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
        if (payload.room_id !== targetRoomId) {
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
        if (payload.room_id !== targetRoomId) {
          return
        }

        onGameStart(payload)
      },
      onRoomUpdated: (payload: RoomUpdatedEventPayload) => {
        if (payload.room_id !== targetRoomId) {
          return
        }

        hasReceivedRoomUpdatedRef.current = true
        const latestRoomSnapshot = mapWaitingRoomSnapshotPayload(payload)
        setRoom(latestRoomSnapshot)
        setChatMessages(latestRoomSnapshot.chatMessages)
        requestOnlineUsersSnapshotSync()
      },
      onLobbyUpdated: (payload: LobbyUpdatedEventPayload) => {
        if (payload.room.id !== targetRoomId) {
          return
        }

        if (payload.action === 'removed') {
          setRoom(null)
          setChatMessages([])
          onRoomRemoved()
          return
        }
      },
    })

    return () => {
      unsubscribe()
    }
  }, [
    activeRoomId,
    hasReceivedRoomUpdatedRef,
    onGameStart,
    onRoomRemoved,
    roomId,
    session,
    setChatMessages,
    setRoom,
  ])
}
