import { useMemo } from 'react'
import RoomChat from '../../../features/room-chat/RoomChat'
import type { ChatMessage } from '../../../types/domain'
import { getAvatarBackgroundColor } from '../../../components/avatar/avatarModel'
import type { WaitingRoomChatMessage, WaitingRoomPlayer } from '../api/types'

// 대기방 채팅 박스 렌더링 입력값 타입
interface WaitingRoomChatBoxProps {
  messages: WaitingRoomChatMessage[]
  roomPlayers: WaitingRoomPlayer[]
  currentUserId: string
  onSendMessage: (content: string) => void
}

// 대기방 채팅 메시지를 RoomChat 공통 포맷으로 변환해 렌더링
export function WaitingRoomChatBox({
  messages,
  roomPlayers,
  currentUserId,
  onSendMessage,
}: WaitingRoomChatBoxProps) {
  // 대기방 채팅 모델을 RoomChat 도메인 타입으로 매핑
  const chatMessages = useMemo<ChatMessage[]>(() => {
    return messages.map((message) => ({
      id: message.id,
      sender_id: message.senderId,
      sender_nickname: message.senderNickname,
      content: message.content,
      timestamp: message.timestamp,
      type: message.type,
    }))
  }, [messages])

  const senderMetaById = useMemo(() => {
    return Object.fromEntries(
      roomPlayers.map((player) => {
        const avatarColor = getAvatarBackgroundColor(player.id)

        return [
          player.id,
          {
            avatarColor,
            displayName: player.nickname,
          },
        ]
      })
    )
  }, [roomPlayers])

  return (
    <RoomChat
      className="min-h-0 flex-1 w-full"
      title="실시간 채팅"
      currentUserId={currentUserId}
      inputPlaceholder="메시지 입력..."
      messages={chatMessages}
      onSendMessage={onSendMessage}
      senderMetaById={senderMetaById}
    />
  )
}
