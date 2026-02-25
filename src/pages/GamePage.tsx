import React, { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import Board from '../components/game/Board'
import PlayerCard from '../components/game/PlayerCard'
import ChatSection from '../components/game/ChatSection'
import RollControl from '../components/game/RollControl'
import { useGameStore } from '../stores/game.store'
import { useGameState } from '../features/game/useGameState'

const GamePage: React.FC = () => {
  const { players, tiles, messages, currentTurn, addMessage } = useGameStore()
  const [timeLeft, setTimeLeft] = useState(27)

  // Fetch initial state via hook
  useGameState()

  // Game timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 30))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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

  const handleRollDice = () => {
    console.log('Rolling dice...')
  }

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-[#F2EBD8] px-6 font-['Inter']">
      {/* Settings Tray */}
      <div className="absolute left-6 top-6">
        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white/80 shadow-sm transition-colors hover:bg-white text-[#45556C]">
          <Settings size={20} />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-[1551px] h-full items-center justify-between gap-8 pt-4 pb-12">
        {/* Sidebar Left: Chat */}
        <div className="flex h-[80%] w-[320px] shrink-0 flex-col">
          <ChatSection
            messages={messages}
            onSendMessage={handleSendMessage}
            notice="게임 시작! 순서를 정합니다."
          />
        </div>

        {/* Center: Board */}
        <div className="flex flex-1 items-center justify-center shrink-0">
          <Board tiles={tiles} />
        </div>

        {/* Sidebar Right: Players */}
        <div className="flex h-full w-[320px] shrink-0 flex-col gap-4 overflow-y-auto py-8">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isActive={player.id === currentTurn}
            />
          ))}
        </div>
      </div>

      {/* Control Area */}
      <div className="absolute bottom-10 right-10">
        <RollControl
          timeLeft={timeLeft}
          isMyTurn={currentTurn === 'me'}
          onRoll={handleRollDice}
        />
      </div>
    </div>
  )
}

export default GamePage
