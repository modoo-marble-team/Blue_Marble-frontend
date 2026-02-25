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

  // Initialize game state via hook
  useGameState()

  // Timer logic
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
    <div className="flex h-screen w-full bg-[#fdfcf5] p-6">
      {/* Top Left Settings */}
      <div className="absolute left-6 top-6">
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md border border-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          <Settings size={20} />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] gap-8">
        {/* Sidebar Left */}
        <div className="w-[300px] flex flex-col pt-[120px]">
          <ChatSection
            messages={messages}
            onSendMessage={handleSendMessage}
            notice="게임 시작! 순서를 정합니다."
          />
        </div>

        {/* Center Board Area */}
        <div className="flex flex-1 flex-col items-center justify-center gap-10">
          <Board tiles={tiles} />
          <div className="flex w-full items-center justify-end pr-8">
            <RollControl
              timeLeft={timeLeft}
              isMyTurn={currentTurn === 'me'}
              onRoll={handleRollDice}
            />
          </div>
        </div>

        {/* Sidebar Right */}
        <div className="w-[280px] flex flex-col gap-4 pt-[20px]">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isActive={player.id === currentTurn}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default GamePage
