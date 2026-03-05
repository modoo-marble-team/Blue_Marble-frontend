import {
  useRef,
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react'
import BoardTile from './BoardTile'
import BuyModal from '../game/modals/BuyModal'
import BuildModal from '../game/modals/BuildModal'
import CardModal from '../game/modals/CardModal'
import TollModal from '../game/modals/TollModal'
import AIPenaltyModal from '../game/modals/AIPenaltyModal'
import BankruptModal from '../game/modals/BankruptModal'
import DiceTimerModal from '../game/modals/DiceTimerModal'

import {
  TILES,
  TOP_ROW,
  BOTTOM_ROW,
  LEFT_COL,
  RIGHT_COL,
  CORNER_SIZE,
  STRAIGHT_SIZE,
  GRID_GAP,
  PLAYER_COLORS,
  INIT_PLAYERS,
  PlayerState,
  TileOwner,
  BuildingLevel,
  DICE_TIMEOUT,
} from './board.constants'

import {
  syncMockStoreBankrupt,
  syncMockStoreCurrentTurn,
  syncMockStorePlayers,
  syncMockStoreTileOwners,
} from './gameBoardStoreBridge'
import { createGameBoardActionHandlers } from './gameBoardActionHandlers'
import type {
  AIPenaltyModalState,
  BankruptModalState,
  BuildModalState,
  BuyModalState,
  CardModalState,
  TollModalState,
} from './gameBoard.types'
import '../../styles/board.css'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { formatWon } from '../../lib/utils'

function getUpgradeCost(price: number, currentLevel: BuildingLevel): number {
  if (currentLevel === 0) return price * 0.5
  if (currentLevel === 1) return price * 0.5
  if (currentLevel === 2) return price * 0.5
  if (currentLevel === 3) return price * 1.0
  if (currentLevel === 4) return price * 1.0
  if (currentLevel === 5) return price * 1.0
  if (currentLevel === 6) return price * 2.0
  return 0
}

function calcToll(price: number, level: BuildingLevel): number {
  if (level === 0) return price
  if (level === 1) return price * 2
  if (level === 2) return price * 3
  if (level === 3) return price * 5
  if (level === 4) return price * 7
  if (level === 5) return price * 9
  if (level === 6) return price * 12
  if (level === 7) return price * 15
  return price
}

const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

const AI_PENALTY_RESULTS = [
  '다음 턴 시작 전까지 통행료가 10M 증가합니다.',
  '즉시 보너스 30M를 획득합니다.',
  '다음 이동에서 추가로 2칸 전진합니다.',
  '다음 턴 주사위 결과에서 1을 추가로 받습니다.',
] as const

const DEFAULT_OPPONENT_NAME = '상대방'
const GAME_START_STATUS = '게임 시작!'
const ROOM_ID_REQUIRED_MESSAGE = '게임 방 식별자를 찾을 수 없습니다.'

function getUpgradeStage(
  level: BuildingLevel
): 'building-to-hotel' | 'hotel-to-landmark' {
  return level < 6 ? 'building-to-hotel' : 'hotel-to-landmark'
}

const DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 22],
    [72, 22],
    [28, 50],
    [72, 50],
    [28, 78],
    [72, 78],
  ],
}

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        backgroundColor: '#fff',
        borderRadius: 12,
        border: '2px solid #E2E8F0',
        boxShadow: rolling
          ? '0 0 0 3px #93C5FD, 0 6px 20px rgba(59,130,246,0.4)'
          : '0 4px 12px rgba(0,0,0,0.12)',
        position: 'relative',
        transform: rolling ? 'rotate(15deg) scale(1.12)' : 'none',
        transition: 'transform 0.08s ease',
        flexShrink: 0,
      }}
    >
      {(DOTS[value] || DOTS[1]).map(([cx, cy], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 9,
            height: 9,
            borderRadius: '50%',
            backgroundColor: '#1E293B',
            left: `${cx}%`,
            top: `${cy}%`,
            transform: 'translate(-50%,-50%)',
          }}
        />
      ))}
    </div>
  )
}

export interface BoardGameHandle {
  rollDice: (onDone?: () => void) => void
}

interface GameBoardProps {
  roomId?: string | null
  players: PlayerState[]
  curPlayer: number
  tiles?: Array<{
    index: number
    owner_id?: string | number | null
    building: number
    level?: number
  }>
  onPlayersChange?: (players: PlayerState[]) => void
  onCurPlayerChange?: (idx: number) => void
  onTileOwnersChange?: (tileOwners: Record<number, TileOwner>) => void
  onBankrupt?: (playerIdx: number) => void
}

function toBoardBuildingLevel(
  tile: { building?: number; level?: number },
  hasOwner: boolean
) {
  if (!hasOwner) return 0 as BuildingLevel
  if (typeof tile.level === 'number') {
    return Math.min(Math.max(tile.level, 0), 7) as BuildingLevel
  }
  const buildingLevel = typeof tile.building === 'number' ? tile.building : 0
  return Math.min(Math.max(buildingLevel, 0), 7) as BuildingLevel
}

function buildTileOwnersFromProps(
  tiles: Array<{
    index: number
    owner_id?: string | number | null
    building: number
    level?: number
  }>,
  players: PlayerState[]
) {
  const nextOwners: Record<number, TileOwner> = {}

  tiles.forEach((tile) => {
    if (!tile.owner_id) {
      return
    }

    const ownerPlayer = players.find(
      (player) => String(player.id) === String(tile.owner_id)
    )

    if (!ownerPlayer) {
      return
    }

    nextOwners[tile.index] = {
      ownerId: ownerPlayer.id,
      ownerColor: ownerPlayer.color,
      level: toBoardBuildingLevel(tile, true),
    }
  })

  return nextOwners
}

const GameBoard = forwardRef<BoardGameHandle, GameBoardProps>(
  (
    {
      roomId = null,
      players,
      curPlayer,
      tiles = [],
      onPlayersChange,
      onCurPlayerChange,
      onTileOwnersChange,
      onBankrupt,
    },
    ref
  ) => {
    const [localTimeLeft, setLocalTimeLeft] = useState(DICE_TIMEOUT)
    const [showTimerModal, setShowTimerModal] = useState(false)
    const [dice1, setDice1] = useState(1)
    const [dice2, setDice2] = useState(1)
    const [rolling, setRolling] = useState(false)
    const [status, setStatus] = useState(GAME_START_STATUS)
    const lock = useRef(false)

    const curPlayerRef = useRef(curPlayer)
    const playersRef = useRef<PlayerState[]>(players)
    curPlayerRef.current = curPlayer
    playersRef.current = players

    const bankruptSetRef = useRef<Set<number>>(new Set())
    const [optimisticTileOwners, setOptimisticTileOwners] = useState<Record<
      number,
      TileOwner
    > | null>(null)
    const derivedTileOwners = useMemo(
      () => buildTileOwnersFromProps(tiles, players),
      [tiles, players]
    )
    const tileOwners =
      optimisticTileOwners === null ? derivedTileOwners : optimisticTileOwners
    const tileOwnersRef = useRef<Record<number, TileOwner>>(tileOwners)

    useEffect(() => {
      setOptimisticTileOwners(null)
      tileOwnersRef.current = derivedTileOwners
    }, [derivedTileOwners])

    // 타이머 관리
    useEffect(() => {
      setLocalTimeLeft(DICE_TIMEOUT)
      setShowTimerModal(false)

      const p = players[curPlayer]
      if (p) {
        if (p.state === 'island') {
          setStatus(
            `${p.name}님은 무인도에 있습니다 (${p.skipTurns ?? 0}턴 대기)`
          )
        } else if ((p.skipTurns ?? 0) > 0) {
          setStatus(
            `${p.name}님은 다음 턴까지 대기 중입니다 (${p.skipTurns}턴)`
          )
        } else if (p.state === 'bankrupt') {
          setStatus(`${p.name}님은 파산 상태입니다`)
        }
      }
    }, [curPlayer, players])

    useEffect(() => {
      if (rolling) return

      const timer = setInterval(() => {
        setLocalTimeLeft((prev) => {
          if (prev <= 1) {
            setShowTimerModal(true)
            clearInterval(timer) // Stop once triggered
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }, [curPlayer, rolling])

    function getPlayerIdByIndex(playerIdx: number): number {
      const rawId = playersRef.current[playerIdx]?.id ?? playerIdx
      return typeof rawId === 'number'
        ? rawId
        : Number.parseInt(String(rawId), 10) || 0
    }

    function getPlayerColorByIndex(playerIdx: number) {
      return (
        playersRef.current[playerIdx]?.color ??
        PLAYER_COLORS[playerIdx % PLAYER_COLORS.length]
      )
    }

    function getPlayerIndexById(playerId: number) {
      return playersRef.current.findIndex((player) => player.id === playerId)
    }

    const [buyModal, setBuyModal] = useState<BuyModalState>({
      open: false,
      tileId: null,
    })
    const [buildModal, setBuildModal] = useState<BuildModalState>({
      open: false,
      tileId: null,
    })
    const [cardModal, setCardModal] = useState<CardModalState>({
      open: false,
      variant: 'event',
    })
    const [tollModal, setTollModal] = useState<TollModalState>({
      open: false,
      tileId: null,
      ownerName: '',
      tollText: '',
    })
    const [aiModal, setAiModal] = useState<AIPenaltyModalState>({
      open: false,
      status: 'loading',
    })
    const [bankruptModal, setBankruptModal] = useState<BankruptModalState>({
      open: false,
      playerIdx: -1,
      playerName: '',
    })

    function updateTileOwners(
      updater: (prev: Record<number, TileOwner>) => Record<number, TileOwner>,
      options?: { notifyParent?: boolean }
    ) {
      const next = updater(tileOwnersRef.current)
      tileOwnersRef.current = next
      setOptimisticTileOwners(next)

      if (options?.notifyParent) {
        if (onTileOwnersChange) {
          onTileOwnersChange(next)
        } else {
          syncMockStoreTileOwners(next)
        }
      }
    }

    function publishPlayers(nextPlayers: PlayerState[]) {
      if (onPlayersChange) {
        onPlayersChange(nextPlayers)
      } else {
        syncMockStorePlayers(nextPlayers)
      }
    }

    function publishCurrentTurn(nextTurnIndex: number) {
      if (onCurPlayerChange) {
        onCurPlayerChange(nextTurnIndex)
      } else {
        syncMockStoreCurrentTurn(nextTurnIndex)
      }
    }

    function publishTileOwners(nextOwners: Record<number, TileOwner>) {
      if (onTileOwnersChange) {
        onTileOwnersChange(nextOwners)
      } else {
        syncMockStoreTileOwners(nextOwners)
      }
    }

    function applyMoney(
      playerIdx: number,
      delta: number,
      onDoneCallback?: () => void
    ): boolean {
      const updated = playersRef.current.map((p, i) => {
        if (i !== playerIdx) return p
        return { ...p, money: Math.max(0, p.money + delta) }
      })
      playersRef.current = updated
      publishPlayers(updated)

      const isBankrupt = updated[playerIdx].money <= 0
      if (isBankrupt) {
        const name = updated[playerIdx]?.name ?? `Player ${playerIdx + 1}`
        setTimeout(
          () =>
            setBankruptModal({
              open: true,
              playerIdx,
              playerName: name,
              onDoneCallback,
            }),
          0
        )
        return true
      }
      return false
    }

    const {
      handleBuy,
      handleBuyPass,
      handleBuildConfirm,
      handleBuildCancel,
      handleTollConfirm,
    } = createGameBoardActionHandlers({
      roomId,
      useGameSocketMock: USE_GAME_SOCKET_MOCK,
      roomIdRequiredMessage: ROOM_ID_REQUIRED_MESSAGE,
      setStatus,
      setOptimisticTileOwners,
      setBuyModal,
      setBuildModal,
      setTollModal,
      playersRef,
      curPlayerRef,
      tileOwnersRef,
      publishPlayers,
      publishCurrentTurn,
      publishTileOwners,
      getPlayerIdByIndex,
      getPlayerColorByIndex,
      getPlayerIndexById,
      toBoardBuildingLevel,
      getPurchaseCost: (id) => TILES[id]?.price ?? 0,
      getUpgradeCost,
      calcToll,
      getTilePrice: (tileId) => TILES[tileId]?.price ?? 0,
      updateTileOwners,
      applyMoney,
      advanceTurn,
    })

    function handleBankruptConfirm() {
      const { playerIdx, onDoneCallback } = bankruptModal
      setBankruptModal({ open: false, playerIdx: -1, playerName: '' })

      bankruptSetRef.current.add(playerIdx)
      const bankruptPlayerId = getPlayerIdByIndex(playerIdx)

      updateTileOwners(
        (prev) => {
          const next = { ...prev }
          Object.keys(next).forEach((k) => {
            if (next[Number(k)].ownerId === bankruptPlayerId)
              delete next[Number(k)]
          })
          return next
        },
        { notifyParent: true }
      )

      if (onBankrupt) {
        onBankrupt(playerIdx)
      } else {
        syncMockStoreBankrupt(playerIdx)
      }
      advanceTurn(onDoneCallback)
    }

    function advanceTurn(onDone?: () => void) {
      const playerCount = playersRef.current.length || INIT_PLAYERS.length
      let next = (curPlayerRef.current + 1) % playerCount
      let tries = 0
      while (bankruptSetRef.current.has(next) && tries < playerCount) {
        next = (next + 1) % playerCount
        tries++
      }

      const nextPlayer = playersRef.current[next]
      if (
        nextPlayer &&
        (nextPlayer.skipTurns ?? 0) > 0 &&
        tries < playerCount
      ) {
        const updatedPlayers = [...playersRef.current]
        updatedPlayers[next] = {
          ...nextPlayer,
          skipTurns: nextPlayer.skipTurns! - 1,
        }
        playersRef.current = updatedPlayers
        publishPlayers(updatedPlayers)

        curPlayerRef.current = next
        if (onCurPlayerChange) {
          onCurPlayerChange(next)
        } else {
          syncMockStoreCurrentTurn(next)
        }

        setTimeout(() => {
          advanceTurn(onDone)
        }, 1500)
        return
      }

      curPlayerRef.current = next
      if (onCurPlayerChange) {
        onCurPlayerChange(next)
      } else {
        syncMockStoreCurrentTurn(next)
      }
      onDone?.()
    }

    async function handleAITile(onDone?: () => void) {
      setAiModal({ open: true, status: 'loading', onDoneCallback: onDone })

      if (USE_GAME_SOCKET_MOCK) {
        const fallbackDescription =
          AI_PENALTY_RESULTS[
            Math.floor(Math.random() * AI_PENALTY_RESULTS.length)
          ]

        window.setTimeout(() => {
          setAiModal((prev) => ({
            ...prev,
            status: 'result',
            resultDescription: fallbackDescription,
          }))
        }, 500)
        return
      }

      window.setTimeout(() => {
        setAiModal((prev) =>
          prev.open
            ? {
                ...prev,
                status: 'error',
              }
            : prev
        )
      }, 1500)
    }

    function rollDice(onDone?: () => void) {
      if (lock.current) return
      lock.current = true
      setRolling(true)

      let count = 0
      let f1 = 1
      let f2 = 1

      const iv = setInterval(() => {
        f1 = Math.ceil(Math.random() * 6)
        f2 = Math.ceil(Math.random() * 6)
        setDice1(f1)
        setDice2(f2)
        count++

        if (count >= 12) {
          clearInterval(iv)
          setRolling(false)
          lock.current = false
          handleDiceResult(f1, f2, onDone)
        }
      }, 80)
    }

    useImperativeHandle(ref, () => ({
      rollDice: (onDone) => {
        rollDice(onDone)
      },
    }))

    function handleDiceResult(v1: number, v2: number, onDone?: () => void) {
      const sum = v1 + v2
      setStatus(`주사위 결과: ${sum}`)

      const playerIdx = curPlayerRef.current
      const p = playersRef.current[playerIdx]
      if (!p) return

      const nextPos = (p.pos + sum) % TILES.length
      const updatedPlayers = [...playersRef.current]
      updatedPlayers[playerIdx] = { ...p, pos: nextPos }
      playersRef.current = updatedPlayers
      publishPlayers(updatedPlayers)

      setTimeout(() => {
        handleArrival(nextPos, onDone)
      }, 600)
    }

    function handleArrival(tileId: number, onDone?: () => void) {
      const playerIdx = curPlayerRef.current
      const tile = TILES[tileId]
      const owner = tileOwnersRef.current[tileId]

      if (tile.type === 'START') {
        setStatus('시작 칸에 도착!')
        advanceTurn(onDone)
        return
      }

      if (tile.type === 'MOVE_TO_ISLAND') {
        setStatus('무인도로 이동!')
        const updatedPlayers = [...playersRef.current]
        const islandTile = TILES.find((t) => t.type === 'ISLAND')
        if (islandTile) {
          updatedPlayers[playerIdx] = {
            ...updatedPlayers[playerIdx],
            pos: islandTile.id,
            skipTurns: 3,
          }
          playersRef.current = updatedPlayers
          publishPlayers(updatedPlayers)
        }
        advanceTurn(onDone)
        return
      }

      if (tile.type === 'PROPERTY') {
        if (!owner) {
          setBuyModal({ open: true, tileId, onDoneCallback: onDone })
        } else if (owner.ownerId !== getPlayerIdByIndex(playerIdx)) {
          const ownerPlayer = playersRef.current.find(
            (p) => String(p.id) === String(owner.ownerId)
          )
          const tollAmount = calcToll(tile.price ?? 0, owner.level)
          setTollModal({
            open: true,
            tileId,
            ownerName: ownerPlayer?.name ?? DEFAULT_OPPONENT_NAME,
            tollText: formatWon(tollAmount),
            onDoneCallback: onDone,
          })
        } else {
          setBuildModal({ open: true, tileId, onDoneCallback: onDone })
        }
        return
      }

      if (tile.type === 'EVENT' && tile.emoji === '🤖') {
        handleAITile(onDone)
        return
      }

      if (tile.type === 'CHANCE' || tile.type === 'EVENT') {
        setCardModal({
          open: true,
          variant: tile.type === 'CHANCE' ? 'chance' : 'event',
          onDoneCallback: onDone,
        })
        return
      }

      advanceTurn(onDone)
    }

    const byTile: Record<number, PlayerState[]> = {}
    players.forEach((p) => {
      const idx = players.indexOf(p)
      if (bankruptSetRef.current.has(idx)) return
      if (!byTile[p.pos]) byTile[p.pos] = []
      byTile[p.pos].push(p)
    })

    const CS = CORNER_SIZE
    const SS = STRAIGHT_SIZE
    const GAP = GRID_GAP

    const buyTile = buyModal.tileId !== null ? TILES[buyModal.tileId] : null
    const buildTile =
      buildModal.tileId !== null ? TILES[buildModal.tileId] : null
    const currentLevel =
      buildModal.tileId !== null
        ? (tileOwners[buildModal.tileId]?.level ?? 0)
        : 0
    const tollTile = tollModal.tileId !== null ? TILES[tollModal.tileId] : null

    return (
      <div className="board-page">
        <div className="board-status">{status}</div>

        <div
          className="board-inner"
          style={{
            gridTemplateColumns: `${CS}px repeat(7, ${SS}px) ${CS}px`,
            gridTemplateRows: `${CS}px repeat(7, ${SS}px) ${CS}px`,
            gap: `${GAP}px`,
          }}
        >
          {TOP_ROW.map((id, ci) => (
            <div key={id} style={{ gridRow: 1, gridColumn: ci + 1 }}>
              <BoardTile
                tile={TILES[id]}
                dir={ci === 0 || ci === 8 ? 'corner' : 'top'}
                tokens={byTile[id] ?? []}
                tileOwner={tileOwners[id]}
                timeLeft={localTimeLeft}
                isActivePlayerTile={id === players[curPlayer]?.pos}
              />
            </div>
          ))}
          {BOTTOM_ROW.map((id, ci) => (
            <div key={id} style={{ gridRow: 9, gridColumn: ci + 1 }}>
              <BoardTile
                tile={TILES[id]}
                dir={ci === 0 || ci === 8 ? 'corner' : 'bottom'}
                tokens={byTile[id] ?? []}
                tileOwner={tileOwners[id]}
                timeLeft={localTimeLeft}
                isActivePlayerTile={id === players[curPlayer]?.pos}
              />
            </div>
          ))}
          {LEFT_COL.map((id, ri) => (
            <div key={id} style={{ gridRow: ri + 2, gridColumn: 1 }}>
              <BoardTile
                tile={TILES[id]}
                dir="left"
                tokens={byTile[id] ?? []}
                tileOwner={tileOwners[id]}
                timeLeft={localTimeLeft}
                isActivePlayerTile={id === players[curPlayer]?.pos}
              />
            </div>
          ))}
          {RIGHT_COL.map((id, ri) => (
            <div key={id} style={{ gridRow: ri + 2, gridColumn: 9 }}>
              <BoardTile
                tile={TILES[id]}
                dir="right"
                tokens={byTile[id] ?? []}
                tileOwner={tileOwners[id]}
                timeLeft={localTimeLeft}
                isActivePlayerTile={id === players[curPlayer]?.pos}
              />
            </div>
          ))}

          <div
            className="board-center"
            style={{
              gridRow: '2 / 9',
              gridColumn: '2 / 9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              background:
                'radial-gradient(circle at center, #ffffff 0%, #f8fafc 100%)',
              borderRadius: 24,
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: '#1E293B',
                letterSpacing: -1,
                textShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              BLUE MARBLE
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <DiceFace value={dice1} rolling={rolling} />
              <DiceFace value={dice2} rolling={rolling} />
            </div>
          </div>
        </div>

        <BuyModal
          open={buyModal.open}
          onBuy={() => handleBuy(buyModal)}
          onPass={() => handleBuyPass(buyModal)}
          cityName={buyTile?.name ?? ''}
          purchaseCostText={formatWon(buyTile?.price ?? 0)}
        />
        <BuildModal
          open={buildModal.open}
          onConfirm={() => handleBuildConfirm(buildModal)}
          onCancel={() => handleBuildCancel(buildModal)}
          cityName={buildTile?.name ?? ''}
          upgradeStage={getUpgradeStage(currentLevel)}
          buildCostText={formatWon(
            getUpgradeCost(buildTile?.price ?? 0, currentLevel)
          )}
        />
        <TollModal
          open={tollModal.open}
          onConfirm={() => handleTollConfirm(tollModal)}
          cityName={tollTile?.name ?? ''}
          ownerName={tollModal.ownerName}
          tollText={tollModal.tollText}
        />
        <CardModal
          open={cardModal.open}
          variant={cardModal.variant}
          onConfirm={() => {
            setCardModal({ open: false, variant: 'event' })
            advanceTurn(cardModal.onDoneCallback)
          }}
        />
        <AIPenaltyModal
          open={aiModal.open}
          status={aiModal.status}
          resultDescription={aiModal.resultDescription}
          onConfirm={() => {
            if (aiModal.status === 'error') {
              handleAITile(aiModal.onDoneCallback)
            } else {
              setAiModal({ open: false, status: 'loading' })
              advanceTurn(aiModal.onDoneCallback)
            }
          }}
        />
        <BankruptModal
          open={bankruptModal.open}
          playerName={bankruptModal.playerName}
          onConfirm={handleBankruptConfirm}
        />
        <DiceTimerModal
          open={showTimerModal}
          onConfirm={() => setShowTimerModal(false)}
        />
      </div>
    )
  }
)

GameBoard.displayName = 'GameBoard'

export default GameBoard
