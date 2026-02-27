import { useMemo } from 'react'
import { cn } from '../../../lib/utils'
import RoomChat from '../../../features/room-chat/RoomChat'
import type { ChatMessage } from '../../../types/domain'
import type { WaitingRoomChatMessage } from '../types'

interface WaitingRoomChatPanelProps {
  messages: WaitingRoomChatMessage[]
  currentUserId: string
  canStartGame: boolean
  canToggleReady: boolean
  isReady: boolean
  isReadyPending: boolean
  isStartPending: boolean
  onToggleReady: () => void
  onStartGame: () => void
  onSendMessage: (content: string) => void
}

export function WaitingRoomChatPanel({
  messages,
  currentUserId,
  canStartGame,
  canToggleReady,
  isReady,
  isReadyPending,
  isStartPending,
  onToggleReady,
  onStartGame,
  onSendMessage,
}: WaitingRoomChatPanelProps) {
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

  const isStartButtonDisabled = !canStartGame || isStartPending
  const isReadyButtonDisabled = !canToggleReady || isReadyPending
  const readyButtonLabel = canToggleReady
    ? isReady
      ? '준비 완료!'
      : '준비하기'
    : '방장'

  return (
    <aside className="flex h-full min-h-[320px] flex-col rounded-3xl border border-ui-border bg-ui-surface p-3">
      <RoomChat
        className="flex-1 w-full"
        title="실시간 채팅"
        currentUserId={currentUserId}
        inputPlaceholder="메시지 입력..."
        messages={chatMessages}
        onSendMessage={onSendMessage}
      />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isStartButtonDisabled}
          onClick={onStartGame}
          className={cn(
            'h-16 rounded-2xl text-[2.1rem] font-bold transition-colors',
            !isStartButtonDisabled
              ? 'bg-ui-brand text-white hover:bg-ui-brand-strong'
              : 'cursor-not-allowed bg-ui-disabled-bg text-ui-disabled-text'
          )}
        >
          시작
        </button>
        <button
          type="button"
          disabled={isReadyButtonDisabled}
          onClick={onToggleReady}
          className={cn(
            'h-16 rounded-2xl text-[2.1rem] font-bold transition-colors',
            isReadyButtonDisabled
              ? 'cursor-not-allowed border border-ui-border bg-ui-surface-soft text-ui-text-subtle'
              : isReady
                ? 'border border-ui-border bg-ui-surface-soft text-ui-text-muted hover:bg-ui-surface-muted'
                : 'bg-[#00c853] text-white hover:bg-[#00b84d]'
          )}
        >
          {readyButtonLabel}
        </button>
      </div>
    </aside>
  )
}
