import { useEffect, useMemo, useRef, useState } from 'react'
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
import type { BuildingLevel } from '../types/domain'

const USE_GAME_SOCKET_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'

const GAME_CHAT_TITLE = '\uC2E4\uC2DC\uAC04 \uCC44\uD305'
const GAME_START_NOTICE =
  '\uAC8C\uC784 \uC2DC\uC791! \uC21C\uC11C\uB97C \uC815\uD588\uC2B5\uB2C8\uB2E4.'
const DEFAULT_MOCK_PLAYER_ID = 'mock-player-1'
const DEFAULT_MOCK_NICKNAME = '\uD50C\uB808\uC774\uC5B4 1'
const DEFAULT_GUEST_ID = 'guest-local'
const MOCK_LOCAL_PLAYER_INDEX = 0

const toStoreBuildingLevel = (level: number): BuildingLevel =>
  Math.min(Math.max(level, 0), 5) as BuildingLevel

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const session = useAuthStore((state) => state.session)
  const {
    currentTurn,
    messages,
    addMessage,
    turnTimeoutSec,
    turnTimerKey,
    players: storePlayers,
    tiles: storeTiles,
    setGameState,
    setCurrentTurn,
    updatePlayer,
  } = useGameStore()
  const [timeLeft] = useGameTimer({
    initialTime: turnTimeoutSec,
    resetSignal: turnTimerKey,
  })
  const boardRef = useRef<BoardGameHandle>(null)

  const [boardPlayers, setBoardPlayers] = useState<PlayerState[]>(INIT_PLAYERS)
  const [boardCurPlayer, setBoardCurPlayer] = useState(0)

  useGameState(roomId ?? null)

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

  const isMyTurnFromStore = useTurn(normalizedCurrentTurn, currentUserId)
  const isMyTurn = USE_GAME_SOCKET_MOCK
    ? boardCurPlayer === MOCK_LOCAL_PLAYER_INDEX
    : normalizedCurrentTurn === null
      ? true
      : isMyTurnFromStore

  const handleSendMessage = (content: string) => {
    addMessage({
      id: Date.now().toString(),
      sender_id: currentUserId ?? DEFAULT_GUEST_ID,
      sender_nickname: currentNickname,
      content,
      timestamp: new Date().toISOString(),
      type: 'talk',
    })
  }

  const diceRoll = useDiceRoll(boardRef)

  const handlePlayersChange = (updated: PlayerState[]) => {
    setBoardPlayers(updated)

    if (!USE_GAME_SOCKET_MOCK || storePlayers.length === 0) {
      return
    }

    setGameState({
      players: updated.map((player, index) => {
        const storePlayer = storePlayers[index]

        return {
          id: storePlayer?.id ?? String(player.id),
          nickname: player.name,
          position: player.pos,
          balance: player.money,
          owned_tiles: storePlayer?.owned_tiles ?? [],
          is_in_jail: storePlayer?.is_in_jail ?? false,
          jail_turn_count: storePlayer?.jail_turn_count ?? 0,
          is_bankrupt: storePlayer?.is_bankrupt ?? false,
          color: player.color,
          avatar: storePlayer?.avatar,
        }
      }),
    })
  }

  const handleCurPlayerChange = (idx: number) => {
    setBoardCurPlayer(idx)

    if (!USE_GAME_SOCKET_MOCK) {
      return
    }

    const nextTurnPlayer = storePlayers[idx]
    if (nextTurnPlayer) {
      setCurrentTurn(nextTurnPlayer.id)
    }
  }

  const handleBankrupt = (playerIdx: number) => {
    if (!USE_GAME_SOCKET_MOCK) {
      return
    }

    const bankruptPlayer = storePlayers[playerIdx]
    if (!bankruptPlayer) {
      return
    }

    updatePlayer(bankruptPlayer.id, { is_bankrupt: true })
  }

  const handleTileOwnersChange = (
    nextTileOwners: Record<
      number,
      {
        ownerId: number
        level: number
      }
    >
  ) => {
    if (!USE_GAME_SOCKET_MOCK || storeTiles.length === 0) {
      return
    }

    setGameState({
      tiles: storeTiles.map((tile) => {
        const owner = nextTileOwners[tile.index]
        if (!owner) {
          return {
            ...tile,
            owner_id: null,
            building: 0 as BuildingLevel,
          }
        }

        const ownerBoardIndex = boardPlayers.findIndex(
          (player) => player.id === owner.ownerId
        )
        const ownerPlayer =
          (ownerBoardIndex >= 0 ? storePlayers[ownerBoardIndex] : undefined) ??
          storePlayers.find(
            (player) => String(player.id) === String(owner.ownerId)
          )

        return {
          ...tile,
          owner_id: ownerPlayer?.id ?? String(owner.ownerId),
          building: toStoreBuildingLevel(owner.level - 1),
        }
      }),
    })
  }

  const normalizedTilesForBoard = useMemo(() => {
    if (storeTiles.length === 0) {
      return storeTiles
    }

    return storeTiles.map((tile) => {
      if (!tile.owner_id) {
        return tile
      }

      const ownerStoreIndex = storePlayers.findIndex(
        (player) => String(player.id) === String(tile.owner_id)
      )

      if (ownerStoreIndex < 0) {
        return tile
      }

      const boardOwner = boardPlayers[ownerStoreIndex]
      if (!boardOwner) {
        return tile
      }

      return {
        ...tile,
        owner_id: boardOwner.id,
      }
    })
  }, [boardPlayers, storePlayers, storeTiles])

  useEffect(() => {
    if (storePlayers.length === 0) {
      return
    }

    const nextBoardPlayers = INIT_PLAYERS.map((initialPlayer, index) => {
      const storePlayer = storePlayers[index]
      if (!storePlayer) {
        return initialPlayer
      }

      return {
        ...initialPlayer,
        name: storePlayer.nickname || initialPlayer.name,
        color: storePlayer.color || initialPlayer.color,
        pos: storePlayer.position,
        money: storePlayer.balance,
      }
    })

    setBoardPlayers(nextBoardPlayers)

    if (!normalizedCurrentTurn) {
      return
    }

    const nextTurnIndex = storePlayers.findIndex(
      (player) => player.id === normalizedCurrentTurn
    )

    if (nextTurnIndex >= 0) {
      setBoardCurPlayer(nextTurnIndex)
    }
  }, [normalizedCurrentTurn, storePlayers])

  const maxMoney = Math.max(...boardPlayers.map((p) => p.money))
  const currentPlayerState = boardPlayers[boardCurPlayer]
  const isCurrentPlayerBankrupt = currentPlayerState?.money <= 0
  const isCurrentPlayerSkipped = (currentPlayerState?.skipTurns ?? 0) > 0

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
              roomId={roomId ?? ''}
              players={boardPlayers}
              curPlayer={boardCurPlayer}
              tiles={normalizedTilesForBoard}
              onPlayersChange={handlePlayersChange}
              onCurPlayerChange={handleCurPlayerChange}
              onTileOwnersChange={handleTileOwnersChange}
              onBankrupt={handleBankrupt}
            />
          </div>
        </div>

        <div className="flex h-full w-[320px] shrink-0 flex-col gap-4 overflow-y-auto py-8">
          {boardPlayers
            .map((bp, idx) => ({ ...bp, originalIndex: idx }))
            .sort((a, b) => {
              const aBankrupt = a.money <= 0 ? 1 : 0
              const bBankrupt = b.money <= 0 ? 1 : 0
              if (aBankrupt !== bBankrupt) return aBankrupt - bBankrupt
              return a.originalIndex - b.originalIndex
            })
            .map((bp) => (
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
                isActive={bp.originalIndex === boardCurPlayer}
                isRichest={bp.money > 0 && bp.money === maxMoney}
                isBankrupt={bp.money <= 0}
              />
            ))}
        </div>
      </div>

      <div className="absolute bottom-10 right-10">
        {!isCurrentPlayerSkipped && !isCurrentPlayerBankrupt && (
          <RollButton
            timeLeft={timeLeft}
            isMyTurn={isMyTurn}
            onRoll={() => diceRoll(roomId ?? null)}
          />
        )}
      </div>
    </div>
  )
}

export default GamePage
