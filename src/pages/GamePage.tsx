import { useRef } from 'react'
import { Settings } from 'lucide-react'
import PlayerPanel from '../components/game/panels/PlayerPanel'
import GameChat from '../components/game/chat/GameChat'
import RollButton from '../components/game/controls/RollButton'
import { useGameStore } from '../stores/game.store'
import { useGameState } from '../hooks/game/useGameState'
import { useGameTimer } from '../hooks/game/useGameTimer'
import { useDiceRoll } from '../hooks/game/useDiceRoll'
import { useTurn } from '../hooks/game/useTurn'
import BoardGame, { BoardGameHandle } from '../components/board/LegacyBoardGame'

const GamePage: React.FC = () => {
  const { players, currentTurn, messages, addMessage } = useGameStore()
  const [timeLeft] = useGameTimer({ initialTime: 27, resetTime: 30 })
  const boardRef = useRef<BoardGameHandle>(null)
  const isMyTurn = useTurn(currentTurn)

  useGameState()

  const handleSendMessage = (content: string) => {
    addMessage({
      id: Date.now().toString(),
      sender_id: 'me',
      sender_nickname: 'GoormEE',
      content,
      timestamp: new Date().toISOString(),
      type: 'talk',
    })
  }

  const handleRollDice = useDiceRoll(boardRef)

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
          <GameChat
            messages={messages}
            onSendMessage={handleSendMessage}
            notice="寃뚯엫 ?쒖옉! ?쒖꽌瑜??뺥빀?덈떎."
          />
        </div>

        <div className="flex shrink-0 flex-1 items-center justify-center">
          <div
            className="aspect-square w-full overflow-hidden rounded-[48px] border-white shadow-[0_50px_100px_-20px_rgba(30,58,138,0.3)]"
            style={{ maxWidth: '800px', borderWidth: '8px' }}
          >
            <BoardGame ref={boardRef} />
          </div>
        </div>

        <div className="flex h-full w-[320px] shrink-0 flex-col gap-4 overflow-y-auto py-8">
          {players.map((player) => (
            <PlayerPanel
              key={player.id}
              player={player}
              isActive={player.id === currentTurn}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-10 right-10">
        <RollButton
          timeLeft={timeLeft}
          isMyTurn={isMyTurn}
          onRoll={handleRollDice}
        />
      </div>
    </div>
  )
}

export default GamePage
