import { useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { useParams } from 'react-router-dom'
import PlayerPanel from '../components/game/panels/PlayerPanel'
import RoomChat from '../features/room-chat/RoomChat'
import RollButton from '../components/game/controls/RollButton'
import { useAuthStore } from '../features/auth/store'
import { useGameStore } from '../stores/game.store'
import { useGameState } from '../hooks/game/useGameState'
import { useGameTimer } from '../hooks/game/useGameTimer'
import { useDiceRoll } from '../hooks/game/useDiceRoll'
import { useTurn } from '../hooks/game/useTurn'
import BoardGame, { BoardGameHandle } from '../components/board/LegacyBoardGame'
import { INIT_PLAYERS, PlayerState } from '../components/board/board.constants'

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const session = useAuthStore((state) => state.session)
  const { currentTurn, messages, addMessage, turnTimeoutSec, turnTimerKey } =
    useGameStore()
  const [timeLeft] = useGameTimer({
    initialTime: turnTimeoutSec,
    resetSignal: turnTimerKey,
  })
  const boardRef = useRef<BoardGameHandle>(null)

  const [boardPlayers, setBoardPlayers] = useState<PlayerState[]>(INIT_PLAYERS)
  const [boardCurPlayer, setBoardCurPlayer] = useState(0)

  useGameState(roomId ?? null)

  const currentUserId = session?.userId ?? null
  const currentNickname = session?.nickname ?? 'Guest'

  // currentTurn�� null�̸� ���� ���� �� mock ���·� �����Ѵ�.
  const isMyTurnFromStore = useTurn(currentTurn, currentUserId)
  const isMyTurn = currentTurn === null ? true : isMyTurnFromStore

  const handleSendMessage = (content: string) => {
    addMessage({
      id: Date.now().toString(),
      sender_id: currentUserId ?? 'guest-local',
      sender_nickname: currentNickname,
      content,
      timestamp: new Date().toISOString(),
      type: 'talk',
    })
  }

  const diceRoll = useDiceRoll(boardRef)

  const handlePlayersChange = (updated: PlayerState[]) => {
    setBoardPlayers(updated)
  }

  const handleCurPlayerChange = (idx: number) => {
    setBoardCurPlayer(idx)
  }

  const handleBankrupt = () => {
    // �ʿ� �� store ������Ʈ �߰�
  }

  const maxMoney = Math.max(...boardPlayers.map((p) => p.money))

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-[#F2EBD8] px-6 font-['Inter']">
      <div className="absolute left-6 top-6">
        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white/80 text-[#45556C] shadow-sm transition-colors hover:bg-white">
          <Settings size={20} />
        </button>
      </div>

      <div
        className="mx-auto flex h-full w-full items-center justify-between gap-8 pb-12 pt-4"
        style={{ maxWidth: '1551px' }}
      >
        <div className="flex h-[80%] w-[320px] shrink-0 flex-col">
          <RoomChat
            title="�ǽð� ä��"
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUserId={currentUserId ?? 'guest-local'}
            notice="���� ����! ������ ���߽��ϴ�."
          />
        </div>

        <div className="flex shrink-0 flex-1 items-center justify-center">
          <div
            className="aspect-square w-full overflow-hidden rounded-[48px] border-white shadow-[0_50px_100px_-20px_rgba(30,58,138,0.3)]"
            style={{ maxWidth: '800px', borderWidth: '8px' }}
          >
            <BoardGame
              ref={boardRef}
              roomId={roomId ?? ''}
              players={boardPlayers}
              curPlayer={boardCurPlayer}
              onPlayersChange={handlePlayersChange}
              onCurPlayerChange={handleCurPlayerChange}
              onBankrupt={handleBankrupt}
            />
          </div>
        </div>

        <div className="flex h-full w-[320px] shrink-0 flex-col gap-4 overflow-y-auto py-8">
          {boardPlayers.map((bp, idx) => (
            <PlayerPanel
              key={bp.id}
              player={{
                id: String(bp.id),
                name: bp.name ?? `Player ${bp.id + 1}`,
                nickname: bp.name ?? `Player ${bp.id + 1}`,
                color: bp.color,
                money: bp.money,
                totalAssets: bp.money,
              }}
              isActive={idx === boardCurPlayer}
              isRichest={bp.money > 0 && bp.money === maxMoney}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-10 right-10">
        <RollButton
          timeLeft={timeLeft}
          isMyTurn={isMyTurn}
          onRoll={() => diceRoll(roomId ?? null)}
        />
      </div>
    </div>
  )
}

export default GamePage
