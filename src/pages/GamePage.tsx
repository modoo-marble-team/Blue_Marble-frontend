import { useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import PlayerPanel from '../components/game/panels/PlayerPanel'
import RoomChat from '../features/room-chat/RoomChat'
import RollButton from '../components/game/controls/RollButton'
import { useGameStore } from '../stores/game.store'
import { useGameState } from '../hooks/game/useGameState'
import { useGameTimer } from '../hooks/game/useGameTimer'
import { useDiceRoll } from '../hooks/game/useDiceRoll'
import { useTurn } from '../hooks/game/useTurn'
import BoardGame, { BoardGameHandle } from '../components/board/LegacyBoardGame'
import { INIT_PLAYERS, PlayerState } from '../components/board/board.constants'

const GamePage: React.FC = () => {
  const { currentTurn, messages, addMessage } = useGameStore()
  const [timeLeft] = useGameTimer({ initialTime: 27, resetTime: 30 })
  const boardRef = useRef<BoardGameHandle>(null)
  const isMyTurn = useTurn(currentTurn)

  // ── 보드 플레이어 상태 (위치 + 돈) — 단일 소스 ──────────────────
  const [boardPlayers, setBoardPlayers] = useState<PlayerState[]>(INIT_PLAYERS)
  const [boardCurPlayer, setBoardCurPlayer] = useState(0)

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

  const handlePlayersChange = (updated: PlayerState[]) => {
    setBoardPlayers(updated)
  }

  const handleCurPlayerChange = (idx: number) => {
    setBoardCurPlayer(idx)
  }

  const handleBankrupt = () => {
    // 필요 시 store 업데이트 추가
  }

  // ── 보유금 1위 인덱스 계산 ──────────────────────────────────────
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
        {/* ── 왼쪽 채팅 ── */}
        <div className="flex h-[80%] w-[320px] shrink-0 flex-col">
          <RoomChat
            title="실시간 채팅"
            messages={messages}
            onSendMessage={handleSendMessage}
            notice="게임 시작! 순서를 정했습니다."
          />
        </div>

        {/* ── 보드 ── */}
        <div className="flex shrink-0 flex-1 items-center justify-center">
          <div
            className="aspect-square w-full overflow-hidden rounded-[48px] border-white shadow-[0_50px_100px_-20px_rgba(30,58,138,0.3)]"
            style={{ maxWidth: '800px', borderWidth: '8px' }}
          >
            <BoardGame
              ref={boardRef}
              players={boardPlayers}
              curPlayer={boardCurPlayer}
              onPlayersChange={handlePlayersChange}
              onCurPlayerChange={handleCurPlayerChange}
              onBankrupt={handleBankrupt}
            />
          </div>
        </div>

        {/* ── 오른쪽 플레이어 패널 ── */}
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
              // 공동 1위 포함, 돈이 0이면 왕관 제외
              isRichest={bp.money > 0 && bp.money === maxMoney}
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
