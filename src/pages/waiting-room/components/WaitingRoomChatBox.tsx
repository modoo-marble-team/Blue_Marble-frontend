import { useMemo } from 'react'
import RoomChat from '../../../features/room-chat/RoomChat'
import type { ChatMessage } from '../../../types/domain'
import type { WaitingRoomChatMessage } from '../types'

interface WaitingRoomChatBoxProps {
  messages: WaitingRoomChatMessage[]
  currentUserId: string
  onSendMessage: (content: string) => void
}

export function WaitingRoomChatBox({
  messages,
  currentUserId,
  onSendMessage,
}: WaitingRoomChatBoxProps) {
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

  return (
    <RoomChat
      className="flex-1 w-full"
      title="실시간 채팅"
      currentUserId={currentUserId}
      inputPlaceholder="메시지 입력..."
      messages={chatMessages}
      onSendMessage={onSendMessage}
    />
  )
}
