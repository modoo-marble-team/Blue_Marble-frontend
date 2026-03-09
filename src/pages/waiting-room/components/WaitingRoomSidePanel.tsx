import { WaitingRoomActionPanel } from './WaitingRoomActionPanel'
import { WaitingRoomChatBox } from './WaitingRoomChatBox'
import type { WaitingRoomChatMessage } from '../types'

// 우측 사이드 패널 렌더링 입력값 타입
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

// 채팅 박스와 액션 패널을 결합한 대기방 우측 패널 렌더링
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
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-ui-border bg-ui-surface p-3">
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
