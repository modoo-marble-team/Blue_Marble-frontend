import { WaitingRoomActionPanel } from './WaitingRoomActionPanel'
import { WaitingRoomChatBox } from './WaitingRoomChatBox'
import type { WaitingRoomChatMessage } from '../types'

interface WaitingRoomSidePanelProps {
  messages: WaitingRoomChatMessage[]
  currentUserId: string
  isHost: boolean
  canStartGame: boolean
  canToggleReady: boolean
  isReady: boolean
  isReadyPending: boolean
  isStartPending: boolean
  onToggleReady: () => void
  onStartGame: () => void
  onSendMessage: (content: string) => void
}

export function WaitingRoomSidePanel({
  messages,
  currentUserId,
  isHost,
  canStartGame,
  canToggleReady,
  isReady,
  isReadyPending,
  isStartPending,
  onToggleReady,
  onStartGame,
  onSendMessage,
}: WaitingRoomSidePanelProps) {
  return (
    <aside className="flex h-full min-h-[320px] flex-col rounded-3xl border border-ui-border bg-ui-surface p-3">
      <WaitingRoomChatBox
        messages={messages}
        currentUserId={currentUserId}
        onSendMessage={onSendMessage}
      />
      <WaitingRoomActionPanel
        isHost={isHost}
        canStartGame={canStartGame}
        canToggleReady={canToggleReady}
        isReady={isReady}
        isReadyPending={isReadyPending}
        isStartPending={isStartPending}
        onToggleReady={onToggleReady}
        onStartGame={onStartGame}
      />
    </aside>
  )
}
