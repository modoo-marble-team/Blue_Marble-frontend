import { useEffect, useMemo, useRef } from 'react'
import { Settings } from 'lucide-react'
import { useLocation, useParams } from 'react-router-dom'
import BoardGame, { BoardGameHandle } from '../components/board/GameBoard'
import RollButton from '../components/game/controls/RollButton'
import PlayerPanel from '../components/game/panels/PlayerPanel'
import { IS_SOCKET_MOCK_ENABLED } from '../config/env'
import { useAuthStore } from '../features/auth/store'
import { DevRoomChatControlPanel } from '../features/room-chat/DevRoomChatControlPanel'
import RoomChat from '../features/room-chat/RoomChat'
import { useDiceRoll } from '../hooks/game/useDiceRoll'
import { useGameState } from '../hooks/game/useGameState'
import { useGameTimer } from '../hooks/game/useGameTimer'
import { useTurn } from '../hooks/game/useTurn'
import { socket } from '../lib/socket'
import { useGameStore } from '../stores/game.store'
import type { ChatMessage } from '../types/domain'
import {
  findBoardCurrentPlayerIndex,
  mapStorePlayersToBoardPlayers,
  mapStoreTilesToBoardTiles,
} from './game/gameViewModel'
import { sendWaitingRoomChat } from './waiting-room/socket'
import type { ChatEventPayload } from './waiting-room/types'

const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED
const ALLOW_ALL_MOCK_TURNS =
  import.meta.env.DEV && import.meta.env.VITE_ALLOW_ALL_MOCK_TURNS === 'true'

const GAME_CHAT_TITLE = '실시간 채팅'
const GAME_START_NOTICE = '게임 시작! 순서를 정했습니다.'
const DEFAULT_MOCK_PLAYER_ID = 'mock-player-1'
const DEFAULT_MOCK_NICKNAME = '플레이어 1'
const DEFAULT_GUEST_ID = 'guest-local'
const MOCK_LOCAL_PLAYER_INDEX = 0

function mapGameChatEventToMessage(payload: ChatEventPayload): ChatMessage {
  return {
    id: `${payload.room_id}-${payload.sender_id}-${payload.sent_at}`,
    sender_id: payload.sender_id,
    sender_nickname: payload.sender_nickname,
    content: payload.message,
    timestamp: payload.sent_at,
    type: 'talk',
  }
}

interface GamePageLocationState {
  roomId?: string
  gameId?: string
}

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const location = useLocation()
  const locationState = location.state as GamePageLocationState | null
  const activeRoomId = locationState?.roomId ?? gameId ?? null
  const session = useAuthStore((state) => state.session)
  const {
    currentTurn,
    messages,
    turnTimeoutSec,
    turnTimerKey,
    players: storePlayers,
    tiles: storeTiles,
  } = useGameStore()
  const [timeLeft] = useGameTimer({
    initialTime: turnTimeoutSec,
    resetSignal: turnTimerKey,
  })
  const boardRef = useRef<BoardGameHandle>(null)

  useGameState(activeRoomId)

  const currentUserId =
    session?.userId ?? (USE_GAME_SOCKET_MOCK ? DEFAULT_MOCK_PLAYER_ID : null)
  const currentNickname =
    session?.nickname ??
    (USE_GAME_SOCKET_MOCK ? DEFAULT_MOCK_NICKNAME : 'Guest')
  const normalizedCurrentTurn =
    USE_GAME_SOCKET_MOCK &&
    (currentTurn === 'me' || currentTurn === DEFAULT_MOCK_PLAYER_ID) &&
    currentUserId
      ? currentUserId
      : currentTurn

  const boardPlayers = useMemo(
    () => mapStorePlayersToBoardPlayers(storePlayers),
    [storePlayers]
  )
  const boardCurPlayer = useMemo(
    () => findBoardCurrentPlayerIndex(storePlayers, normalizedCurrentTurn),
    [normalizedCurrentTurn, storePlayers]
  )
  const normalizedTilesForBoard = useMemo(
    () => mapStoreTilesToBoardTiles(storeTiles, storePlayers, boardPlayers),
    [boardPlayers, storePlayers, storeTiles]
  )
  const isMyTurnFromStore = useTurn(normalizedCurrentTurn, currentUserId)
  const isMyTurn = USE_GAME_SOCKET_MOCK
    ? ALLOW_ALL_MOCK_TURNS || boardCurPlayer === MOCK_LOCAL_PLAYER_INDEX
    : normalizedCurrentTurn === null
      ? true
      : isMyTurnFromStore

  useEffect(() => {
    if (!activeRoomId) {
      return
    }

    const handleChat = (payload: ChatEventPayload) => {
      if (payload.room_id !== activeRoomId) {
        return
      }

      const nextMessage = mapGameChatEventToMessage(payload)
      const gameStore = useGameStore.getState()
      const hasSameMessage = gameStore.messages.some(
        (message) => message.id === nextMessage.id
      )

      if (hasSameMessage) {
        return
      }

      gameStore.addMessage(nextMessage)
    }

    socket.on('chat', handleChat)

    return () => {
      socket.off('chat', handleChat)
    }
  }, [activeRoomId])

  const handleSendMessage = (content: string) => {
    if (!activeRoomId) {
      return
    }

    sendWaitingRoomChat({
      roomId: activeRoomId,
      senderId: currentUserId ?? DEFAULT_GUEST_ID,
      senderNickname: currentNickname,
      message: content,
    })
  }

  const diceRoll = useDiceRoll(boardRef)

  const maxMoney = Math.max(...boardPlayers.map((player) => player.money))
  const currentPlayerState = boardPlayers[boardCurPlayer]
  const isCurrentPlayerBankrupt = currentPlayerState?.money <= 0
  const isCurrentPlayerSkipped = (currentPlayerState?.skipTurns ?? 0) > 0
  const roomChatSenderOptions = useMemo(
    () =>
      storePlayers.map((player) => ({
        id: String(player.id),
        nickname: player.nickname,
      })),
    [storePlayers]
  )
  const currentUserIdForChat =
    currentUserId == null ? undefined : String(currentUserId)
  const preferredRoomChatSenderId =
    roomChatSenderOptions.find(
      (senderOption) => senderOption.id !== currentUserIdForChat
    )?.id ?? roomChatSenderOptions[0]?.id

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
            title={GAME_CHAT_TITLE}
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUserId={currentUserId ?? DEFAULT_GUEST_ID}
            notice={GAME_START_NOTICE}
          />
        </div>

        <div className="flex shrink-0 flex-1 items-center justify-center">
          <div
            className="aspect-square w-full overflow-hidden rounded-[48px] border-white shadow-[0_50px_100px_-20px_rgba(30,58,138,0.3)]"
            style={{ maxWidth: '800px', borderWidth: '8px' }}
          >
            <BoardGame
              ref={boardRef}
              roomId={activeRoomId ?? ''}
              players={boardPlayers}
              curPlayer={boardCurPlayer}
              tiles={normalizedTilesForBoard}
            />
          </div>
        </div>

        <div className="flex h-full w-[320px] shrink-0 flex-col gap-4 overflow-y-auto py-8">
          {boardPlayers
            .map((player, index) => ({ ...player, originalIndex: index }))
            .sort((left, right) => {
              const leftBankrupt = left.money <= 0 ? 1 : 0
              const rightBankrupt = right.money <= 0 ? 1 : 0
              if (leftBankrupt !== rightBankrupt) {
                return leftBankrupt - rightBankrupt
              }

              return left.originalIndex - right.originalIndex
            })
            .map((player) => (
              <PlayerPanel
                key={player.id}
                player={{
                  id: String(player.id),
                  name: player.name ?? `Player ${player.id + 1}`,
                  nickname: player.name ?? `Player ${player.id + 1}`,
                  color: player.color,
                  money: player.money,
                  totalAssets: player.money,
                }}
                isActive={player.originalIndex === boardCurPlayer}
                isRichest={player.money > 0 && player.money === maxMoney}
                isBankrupt={player.money <= 0}
              />
            ))}
        </div>
      </div>

      <div className="absolute bottom-10 right-10">
        {!isCurrentPlayerSkipped && !isCurrentPlayerBankrupt && (
          <RollButton
            timeLeft={timeLeft}
            isMyTurn={isMyTurn}
            onRoll={() => diceRoll(activeRoomId)}
          />
        )}
      </div>

      <DevRoomChatControlPanel
        roomId={activeRoomId ?? ''}
        senderOptions={roomChatSenderOptions}
        preferredSenderId={preferredRoomChatSenderId}
      />
    </div>
  )
}

export default GamePage
