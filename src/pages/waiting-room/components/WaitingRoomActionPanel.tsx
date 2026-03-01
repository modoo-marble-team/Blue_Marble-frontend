import { cn } from '../../../lib/utils'

// 하단 액션 패널 렌더링 입력값 타입
interface WaitingRoomActionPanelProps {
  isHost: boolean
  canStartGame: boolean
  canToggleReady: boolean
  isReady: boolean
  isReadyPending: boolean
  isStartPending: boolean
  onToggleReady: () => void
  onStartGame: () => void
}

// 방장/일반 유저 역할에 따라 시작 또는 준비 버튼을 렌더링
export function WaitingRoomActionPanel({
  isHost,
  canStartGame,
  canToggleReady,
  isReady,
  isReadyPending,
  isStartPending,
  onToggleReady,
  onStartGame,
}: WaitingRoomActionPanelProps) {
  const isStartButtonDisabled = !canStartGame || isStartPending
  const isReadyButtonDisabled = !canToggleReady || isReadyPending
  const readyButtonLabel = isReady ? '준비 취소' : '준비하기'

  return (
    <div className="mt-4">
      {isHost ? (
        <button
          type="button"
          disabled={isStartButtonDisabled}
          onClick={onStartGame}
          className={cn(
            'h-16 w-full rounded-2xl text-[2.1rem] font-bold transition-colors',
            !isStartButtonDisabled
              ? 'bg-ui-brand text-white hover:bg-ui-brand-strong'
              : 'cursor-not-allowed bg-ui-disabled-bg text-ui-disabled-text'
          )}
        >
          시작
        </button>
      ) : (
        <button
          type="button"
          disabled={isReadyButtonDisabled}
          onClick={onToggleReady}
          className={cn(
            'h-16 w-full rounded-2xl text-[2.1rem] font-bold transition-colors',
            isReadyButtonDisabled
              ? 'cursor-not-allowed border border-ui-border bg-ui-surface-soft text-ui-text-subtle'
              : isReady
                ? 'border border-ui-border bg-ui-surface-soft text-ui-text-muted hover:bg-ui-surface-muted'
                : 'bg-[#00c853] text-white hover:bg-[#00b84d]'
          )}
        >
          {readyButtonLabel}
        </button>
      )}
    </div>
  )
}
