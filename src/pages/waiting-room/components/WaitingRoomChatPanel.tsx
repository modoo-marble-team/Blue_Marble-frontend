import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { cn } from '../../../lib/utils'
import RoomChat from '../../../features/room-chat/RoomChat'
import type { ChatMessage } from '../../../types/domain'
import type { WaitingRoomChatMessage } from '../mockData'

interface WaitingRoomChatPanelProps {
  initialMessages: WaitingRoomChatMessage[]
  canStartGame: boolean
  isReady: boolean
  onToggleReady: () => void
}

export function WaitingRoomChatPanel({
  initialMessages,
  canStartGame,
  isReady,
  onToggleReady,
}: WaitingRoomChatPanelProps) {
  const [messages, setMessages] =
    useState<WaitingRoomChatMessage[]>(initialMessages)

  const chatMessages = useMemo<ChatMessage[]>(() => {
    return messages.map((message) => ({
      id: message.id,
      sender_id: message.senderId,
      sender_nickname: message.senderName,
      content: message.content,
      timestamp: message.timestamp,
      type: message.type,
    }))
  }, [messages])

  function handleSendMessage(content: string) {
    const normalizedInput = content.trim()

    setMessages((previousMessages) => [
      ...previousMessages,
      {
        id: `chat-${Date.now()}`,
        senderId: 'me',
        senderName: 'GoormEE',
        content: normalizedInput,
        timestamp: new Date().toISOString(),
        type: 'talk',
        avatarEmoji: '🐶',
      },
    ])
  }

  return (
    <aside className="flex h-full min-h-[320px] flex-col rounded-3xl border border-ui-border bg-ui-surface p-3">
      <RoomChat
        className="flex-1 w-full"
        title="실시간 채팅"
        currentUserId="me"
        inputPlaceholder="메시지 입력..."
        messages={chatMessages}
        onSendMessage={handleSendMessage}
      />

      <p className="mx-auto mt-4 inline-flex items-center gap-1 rounded-full border border-ui-border bg-ui-surface-muted px-4 py-1.5 text-xs font-semibold text-ui-text-muted">
        <Info className="size-3.5 text-ui-brand" /> 최소 2명 + 모두 준비 완료 시
        시작 가능
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!canStartGame}
          className={cn(
            'h-16 rounded-2xl text-[2.1rem] font-bold transition-colors',
            canStartGame
              ? 'bg-ui-brand text-white hover:bg-ui-brand-strong'
              : 'cursor-not-allowed bg-ui-disabled-bg text-ui-disabled-text'
          )}
        >
          시작
        </button>
        <button
          type="button"
          onClick={onToggleReady}
          className={cn(
            'h-16 rounded-2xl text-[2.1rem] font-bold transition-colors',
            isReady
              ? 'border border-ui-border bg-ui-surface-soft text-ui-text-muted hover:bg-ui-surface-muted'
              : 'bg-[#00c853] text-white hover:bg-[#00b84d]'
          )}
        >
          {isReady ? '준비 완료!' : '준비하기'}
        </button>
      </div>
    </aside>
  )
}
