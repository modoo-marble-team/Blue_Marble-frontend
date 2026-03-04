import {
  useRef,
  useState,
  useEffect,
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
import { emitConfirmPenalty } from '../../services/socket/game.handler'
import { gameApi } from '../../services/game/game.api'
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
} from './board.constants'
import '../../styles/board.css'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { formatWon } from '../../lib/utils'

// cost helpers are computed per-tile based on price

function getPurchaseCost(tileId: number): number {
  return TILES[tileId]?.price ?? 0
}

function getUpgradeCost(price: number, currentLevel: BuildingLevel): number {
  if (currentLevel === 0) return price * 0.5
  if (currentLevel === 1) return price * 0.5
  if (currentLevel === 2) return price * 0.5
  if (currentLevel === 3) return price * 1.0
  if (currentLevel === 4) return price * 1.5
  return 0
}

function calcToll(price: number, level: BuildingLevel): number {
  if (level === 0) return price
  if (level === 1) return price * 2
  if (level === 2) return price * 3
  if (level === 3) return price * 5
  if (level === 4) return price * 7
  if (level === 5) return price * 10
  return price
}

const USE_GAME_SOCKET_MOCK = IS_SOCKET_MOCK_ENABLED

const AI_PENALTY_RESULTS = [
  '\uB2E4\uC74C \uD134 \uC2DC\uC791 \uC804\uAE4C\uC9C0 \uD1B5\uD589\uB8CC\uAC00 10M \uC99D\uAC00\uD569\uB2C8\uB2E4.',
  '\uC989\uC2DC \uBCF4\uB108\uC2A4 30M\uB97C \uD68D\uB4DD\uD569\uB2C8\uB2E4.',
  '\uB2E4\uC74C \uC774\uB3D9\uC5D0\uC11C \uCD94\uAC00\uB85C 2\uCE78 \uC804\uC9C4\uD569\uB2C8\uB2E4.',
  '\uB2E4\uC74C \uD134 \uC8FC\uC0AC\uC704 \uACB0\uACFC\uC5D0\uC11C 1\uC744 \uCD94\uAC00\uB85C \uBC1B\uC2B5\uB2C8\uB2E4.',
] as const
const BOARD_TITLE = '\uBE14\uB8E8\uB9C8\uBE14'
const BANKRUPT_DESCRIPTION =
  '\uAC8C\uC784\uC5D0\uC11C \uD0C8\uB77D\uD588\uC2B5\uB2C8\uB2E4.'
const DEFAULT_OPPONENT_NAME = '\uC0C1\uB300\uBC29'
const GAME_START_STATUS = '\uAC8C\uC784 \uC2DC\uC791!'
const ROOM_ID_REQUIRED_MESSAGE =
  '\uAC8C\uC784 \uBC29 \uC2DD\uBCC4\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'
const DICE_ICON = '\uD83C\uDFB2'

const LEVEL_LABEL: Record<number, string> = {
  0: '\uBBF8\uAD6C\uB9E4',
  1: '\uAC74\uBB3C 1\uB2E8\uACC4',
  2: '\uAC74\uBB3C 2\uB2E8\uACC4',
  3: '\uAC74\uBB3C 3\uB2E8\uACC4',
  4: '\uD638\uD154',
  5: '\uB79C\uB4DC\uB9C8\uD06C',
}

function getUpgradeStage(
  level: BuildingLevel
): 'building-to-hotel' | 'hotel-to-landmark' {
  return level < 4 ? 'building-to-hotel' : 'hotel-to-landmark'
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
  }>
  onPlayersChange: (players: PlayerState[]) => void
  onCurPlayerChange: (idx: number) => void
  onTileOwnersChange?: (tileOwners: Record<number, TileOwner>) => void
  onBankrupt?: (playerIdx: number) => void
}

interface BuyModalState {
  open: boolean
  tileId: number | null
  onDoneCallback?: () => void
}
interface BuildModalState {
  open: boolean
  tileId: number | null
  onDoneCallback?: () => void
}
interface CardModalState {
  open: boolean
  variant: 'event' | 'chance'
  onDoneCallback?: () => void
}
interface TollModalState {
  open: boolean
  tileId: number | null
  ownerName: string
  tollText: string
  onDoneCallback?: () => void
}
interface AIPenaltyModalState {
  open: boolean
  status: 'loading' | 'result' | 'error'
  resultDescription?: string
  onDoneCallback?: () => void
}
interface BankruptModalState {
  open: boolean
  playerIdx: number
  playerName: string
  onDoneCallback?: () => void
}

type SyncStatePayload = {
  players?: Array<{
    id: string | number
    nickname?: string
    name?: string
    position?: number
    pos?: number
    balance?: number
    money?: number
    color?: string
  }>
  tiles?: Array<{
    index?: number
    id?: number
    owner_id?: string | number | null
    ownerId?: string | number | null
    building?: number
    level?: number
  }>
  current_turn?: string | number | null
  currentTurn?: string | number | null
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
    const [tileOwners, setTileOwners] = useState<Record<number, TileOwner>>({})
    const tileOwnersRef = useRef<Record<number, TileOwner>>({})

    useEffect(() => {
      if (tiles.length === 0) {
        tileOwnersRef.current = {}
        setTileOwners({})
        return
      }

      const nextOwners: Record<number, TileOwner> = {}

      tiles.forEach((tile) => {
        if (!tile.owner_id) {
          return
        }

        const ownerPlayer = playersRef.current.find(
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

      tileOwnersRef.current = nextOwners
      setTileOwners(nextOwners)
    }, [tiles])

    function getPlayerIdByIndex(playerIdx: number) {
      return playersRef.current[playerIdx]?.id ?? playerIdx
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

    function toBoardBuildingLevel(
      tile: { building?: number; level?: number },
      hasOwner: boolean
    ) {
      if (!hasOwner) return 0 as BuildingLevel
      if (typeof tile.level === 'number') {
        return Math.min(Math.max(tile.level, 1), 5) as BuildingLevel
      }
      const buildingLevel =
        typeof tile.building === 'number' ? tile.building : 0
      return Math.min(Math.max(buildingLevel + 1, 1), 5) as BuildingLevel
    }

    async function syncBoardStateFromServer() {
      if (!roomId) return false

      const syncResult = await gameApi.syncState(roomId)
      if (!syncResult.ok) return false

      const payload = syncResult.data as SyncStatePayload
      const payloadPlayers = payload.players ?? []
      const prevById = new Map(
        playersRef.current.map((player) => [String(player.id), player])
      )
      const serverToBoardId = new Map<string, number>()

      if (payloadPlayers.length > 0) {
        const nextById = new Map<string, PlayerState>()

        payloadPlayers.forEach((player, idx) => {
          const prevPlayer = prevById.get(String(player.id))
          const parsedPlayerId =
            typeof player.id === 'number'
              ? player.id
              : Number.parseInt(String(player.id), 10)
          const boardPlayerId = Number.isNaN(parsedPlayerId)
            ? (prevPlayer?.id ?? idx)
            : parsedPlayerId

          serverToBoardId.set(String(player.id), boardPlayerId)

          nextById.set(String(player.id), {
            id: boardPlayerId,
            name:
              player.nickname ??
              player.name ??
              prevPlayer?.name ??
              `Player ${idx + 1}`,
            color:
              player.color ??
              prevPlayer?.color ??
              PLAYER_COLORS[idx % PLAYER_COLORS.length],
            pos: player.position ?? player.pos ?? prevPlayer?.pos ?? 0,
            money: player.balance ?? player.money ?? prevPlayer?.money ?? 0,
          })
        })

        const orderedPlayers = playersRef.current.map((prevPlayer) => {
          return nextById.get(String(prevPlayer.id)) ?? prevPlayer
        })
        const additionalPlayers = Array.from(nextById.values()).filter(
          (nextPlayer) =>
            !orderedPlayers.some(
              (orderedPlayer) => orderedPlayer.id === nextPlayer.id
            )
        )

        const nextPlayers = [...orderedPlayers, ...additionalPlayers]
        playersRef.current = nextPlayers
        onPlayersChange(nextPlayers)
      }

      if (payload.tiles) {
        const nextOwners: Record<number, TileOwner> = {}

        payload.tiles.forEach((tile) => {
          const tileIndex = tile.index ?? tile.id
          const ownerRaw = tile.owner_id ?? tile.ownerId
          if (
            tileIndex === undefined ||
            ownerRaw === null ||
            ownerRaw === undefined
          ) {
            return
          }

          const mappedOwnerId = serverToBoardId.get(String(ownerRaw))
          const parsedOwnerId =
            typeof ownerRaw === 'number'
              ? ownerRaw
              : Number.parseInt(String(ownerRaw), 10)
          const ownerId =
            mappedOwnerId ??
            (Number.isNaN(parsedOwnerId) ? null : parsedOwnerId)
          if (ownerId === null) return

          const ownerPlayer = playersRef.current.find(
            (player) => String(player.id) === String(ownerId)
          )
          nextOwners[tileIndex] = {
            ownerId,
            ownerColor:
              ownerPlayer?.color ??
              PLAYER_COLORS[ownerId % PLAYER_COLORS.length],
            level: toBoardBuildingLevel(tile, true),
          }
        })

        tileOwnersRef.current = nextOwners
        setTileOwners(nextOwners)
        onTileOwnersChange?.(nextOwners)
      }

      const nextTurnRaw = payload.current_turn ?? payload.currentTurn
      if (nextTurnRaw !== undefined && nextTurnRaw !== null) {
        const mappedTurnId = serverToBoardId.get(String(nextTurnRaw))
        const nextTurnIndex = playersRef.current.findIndex(
          (player) =>
            player.id === mappedTurnId ||
            String(player.id) === String(nextTurnRaw)
        )
        if (nextTurnIndex >= 0) {
          curPlayerRef.current = nextTurnIndex
          onCurPlayerChange(nextTurnIndex)
        }
      }

      return true
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
      setTileOwners(next)

      if (options?.notifyParent) {
        onTileOwnersChange?.(next)
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
      onPlayersChange([...updated])

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

      onBankrupt?.(playerIdx)
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

      // 턴 스킵 처리 (남은 스킵 턴이 있으면 차감하고 다시 건너뛴다)
      const nextPlayer = playersRef.current[next]
      if (
        nextPlayer &&
        (nextPlayer.skipTurns ?? 0) > 0 &&
        tries < playerCount
      ) {
        // 스킵 턴 1회를 차감해 반영한다
        const updatedPlayers = [...playersRef.current]
        updatedPlayers[next] = {
          ...nextPlayer,
          skipTurns: nextPlayer.skipTurns! - 1,
        }
        playersRef.current = updatedPlayers
        onPlayersChange(updatedPlayers)

        // 스킵 상태를 보여주기 위해 잠시 현재 턴으로 바꾼 뒤 다시 턴을 넘긴다
        curPlayerRef.current = next
        onCurPlayerChange(next)

        setTimeout(() => {
          advanceTurn(onDone)
        }, 1500)
        return
      }

      curPlayerRef.current = next
      onCurPlayerChange(next)
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

          const total = f1 + f2
          const activeCurPlayer = curPlayerRef.current

          const movedPlayers = playersRef.current.map((p, i) => {
            if (i !== activeCurPlayer) return p

            let newPos = (p.pos + total) % TILES.length
            let newSkipTurns = p.skipTurns ?? 0

            if (TILES[newPos].type === 'go_to_island') {
              newPos = 8
              newSkipTurns += 1
              setStatus(`${p.name} 무인도로 이동! (1턴 휴식)`)
            } else {
              setStatus(`${p.name} → ${TILES[newPos].name} (+${total}칸)`)
            }

            return { ...p, pos: newPos, skipTurns: newSkipTurns }
          })
          playersRef.current = movedPlayers
          onPlayersChange([...movedPlayers])

          const landedTileId = movedPlayers[activeCurPlayer].pos

          setTimeout(() => {
            const tile = TILES[landedTileId]

            if (tile.type === 'city') {
              const owner = tileOwnersRef.current[landedTileId]
              const activePlayer = movedPlayers[activeCurPlayer]
              const price = tile.price ?? 0

              if (!owner) {
                setBuyModal({
                  open: true,
                  tileId: landedTileId,
                  onDoneCallback: onDone,
                })
              } else if (owner.ownerId === activePlayer.id) {
                if (owner.level < 5) {
                  setBuildModal({
                    open: true,
                    tileId: landedTileId,
                    onDoneCallback: onDone,
                  })
                } else {
                  advanceTurn(onDone)
                }
              } else {
                const ownerPlayer = playersRef.current.find(
                  (p) => p.id === owner.ownerId
                )
                const tollAmount = calcToll(price, owner.level)
                setTollModal({
                  open: true,
                  tileId: landedTileId,
                  ownerName: ownerPlayer?.name ?? DEFAULT_OPPONENT_NAME,
                  tollText: formatWon(tollAmount),
                  onDoneCallback: onDone,
                })
              }
            } else if (tile.type === 'ai') {
              handleAITile(onDone)
            } else if (tile.type === 'event') {
              setCardModal({
                open: true,
                variant: 'event',
                onDoneCallback: onDone,
              })
            } else if (tile.type === 'chance') {
              setCardModal({
                open: true,
                variant: 'chance',
                onDoneCallback: onDone,
              })
            } else {
              advanceTurn(onDone)
            }
          }, 50)
        }
      }, 70)
    }

    function toActionErrorMessage(statusCode: number) {
      if (statusCode === 401)
        return '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.'
      if (statusCode === 403)
        return '\uD604\uC7AC \uD134\uC5D0\uB294 \uCC98\uB9AC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'
      if (statusCode === 404)
        return '\uB300\uC0C1\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'
      if (statusCode === 409)
        return '\uC870\uAC74\uC774 \uB9DE\uC9C0 \uC54A\uC544 \uCC98\uB9AC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'
      return '\uC694\uCCAD \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.'
    }

    function getSellFallbackRefund(tileId: number, level: BuildingLevel) {
      // calculate how much to refund when the server sync fails
      // start with purchase price plus each upgrade cost up to current level
      const basePrice = TILES[tileId]?.price ?? 0
      if (level <= 0 || basePrice === 0) return 0
      let refund = basePrice
      for (let l = 1; l < level; l++) {
        refund += getUpgradeCost(basePrice, l as BuildingLevel)
      }
      return refund
    }

    async function sellOwnedTileForPlayer(playerIdx: number) {
      const playerId = getPlayerIdByIndex(playerIdx)
      const ownedTileEntries = Object.entries(tileOwnersRef.current)
        .filter(([, owner]) => owner.ownerId === playerId)
        .sort(([, a], [, b]) => b.level - a.level)

      if (ownedTileEntries.length === 0) return false

      const [tileIdText, owner] = ownedTileEntries[0]
      const tileId = Number(tileIdText)
      if (!roomId) return false

      const sellResult = await gameApi.sellTile(roomId, {
        tile_index: tileId,
        level: owner.level,
      })

      if (!sellResult.ok) {
        setStatus(toActionErrorMessage(sellResult.status))
        return false
      }

      const synced = await syncBoardStateFromServer()
      if (!synced) {
        updateTileOwners(
          (prev) => {
            const next = { ...prev }
            delete next[tileId]
            return next
          },
          { notifyParent: true }
        )
        applyMoney(playerIdx, +getSellFallbackRefund(tileId, owner.level))
      }

      return true
    }

    async function handleBuy() {
      const { tileId, onDoneCallback } = buyModal
      if (tileId === null) return
      if (!roomId) {
        setStatus(ROOM_ID_REQUIRED_MESSAGE)
        return
      }
      const active = curPlayerRef.current
      const activePlayerId = getPlayerIdByIndex(active)
      const activePlayerColor = getPlayerColorByIndex(active)
      const price = getPurchaseCost(tileId)

      const actionResult = await gameApi.buyTile(roomId, { tile_index: tileId })
      if (!actionResult.ok) {
        setStatus(toActionErrorMessage(actionResult.status))
        return
      }

      setBuyModal({ open: false, tileId: null })
      const bankrupt = applyMoney(active, -price, onDoneCallback)
      if (!bankrupt) {
        updateTileOwners(
          (prev) => ({
            ...prev,
            [tileId]: {
              ownerId: activePlayerId,
              ownerColor: activePlayerColor,
              level: 1,
            },
          }),
          { notifyParent: true }
        )
        if (USE_GAME_SOCKET_MOCK) {
          onDoneCallback?.()
        } else {
          advanceTurn(onDoneCallback)
        }
      }
    }

    function handleBuyPass() {
      const { onDoneCallback } = buyModal
      setBuyModal({ open: false, tileId: null })
      advanceTurn(onDoneCallback)
    }

    async function handleBuildConfirm() {
      const { tileId, onDoneCallback } = buildModal
      if (tileId === null) return
      if (!roomId) {
        setStatus(ROOM_ID_REQUIRED_MESSAGE)
        return
      }
      const active = curPlayerRef.current
      const owner = tileOwnersRef.current[tileId]
      const price = getPurchaseCost(tileId)
      const upgradeCost = owner ? getUpgradeCost(price, owner.level) : 0

      const actionResult = await gameApi.buildTile(roomId, {
        tile_index: tileId,
      })
      if (!actionResult.ok) {
        setStatus(toActionErrorMessage(actionResult.status))
        return
      }

      setBuildModal({ open: false, tileId: null })
      const bankrupt = applyMoney(active, -upgradeCost, onDoneCallback)
      if (!bankrupt) {
        updateTileOwners(
          (prev) => {
            const existing = prev[tileId]
            if (!existing) return prev
            return {
              ...prev,
              [tileId]: {
                ...existing,
                level: Math.min(existing.level + 1, 5) as BuildingLevel,
              },
            }
          },
          { notifyParent: true }
        )
        if (USE_GAME_SOCKET_MOCK) {
          onDoneCallback?.()
        } else {
          advanceTurn(onDoneCallback)
        }
      }
    }

    function handleBuildCancel() {
      const { onDoneCallback } = buildModal
      setBuildModal({ open: false, tileId: null })
      advanceTurn(onDoneCallback)
    }

    async function handleTollConfirm() {
      const { tileId, onDoneCallback } = tollModal
      const active = curPlayerRef.current
      setTollModal({
        open: false,
        tileId: null,
        ownerName: '',
        tollText: '',
      })

      if (tileId !== null) {
        const owner = tileOwnersRef.current[tileId]
        const price = TILES[tileId]?.price ?? 0
        const tollAmount = owner ? calcToll(price, owner.level) : 0
        if (owner) {
          if (playersRef.current[active].money < tollAmount) {
            const sold = await sellOwnedTileForPlayer(active)
            if (!sold) {
              const bankrupt = applyMoney(active, -tollAmount, onDoneCallback)
              if (!bankrupt) advanceTurn(onDoneCallback)
              return
            }
          }
          const ownerPlayerIndex = getPlayerIndexById(owner.ownerId)
          if (ownerPlayerIndex >= 0) {
            applyMoney(ownerPlayerIndex, +tollAmount)
          }
          const bankrupt = applyMoney(active, -tollAmount, onDoneCallback)
          if (!bankrupt) advanceTurn(onDoneCallback)
          return
        }
      }
      advanceTurn(onDoneCallback)
    }

    function handleCardConfirm() {
      const { onDoneCallback, variant } = cardModal

      // 찬스 카드에서 주사위 1턴 쉬기 결과가 나왔을 때의 프런트 처리
      // 실서버 연동 전까지는 서버 이벤트 대신 화면 동작만 확인한다
      if (variant === 'chance') {
        const active = curPlayerRef.current
        const activePlayer = playersRef.current[active]
        const updatedPlayers = [...playersRef.current]
        updatedPlayers[active] = {
          ...activePlayer,
          skipTurns: (activePlayer.skipTurns ?? 0) + 1,
        }
        playersRef.current = updatedPlayers
        onPlayersChange(updatedPlayers)
        setStatus(`${activePlayer.name} 주사위 1턴 쉬기!`)
      }

      setCardModal({ open: false, variant: 'event' })
      advanceTurn(onDoneCallback)
    }

    function handleAIConfirm() {
      if (aiModal.status === 'loading') return
      const { onDoneCallback } = aiModal
      if (aiModal.status === 'error') {
        handleAITile(onDoneCallback)
        return
      }

      const active = curPlayerRef.current
      const activePlayer = playersRef.current[active]
      if (activePlayer && roomId) {
        emitConfirmPenalty({
          room_id: roomId,
          player_id: String(activePlayer.id),
        })
      }

      setAiModal({ open: false, status: 'loading' })
      advanceTurn(onDoneCallback)
    }

    useImperativeHandle(ref, () => ({ rollDice }))

    const byTile: Record<number, PlayerState[]> = {}
    players.forEach((p) => {
      if (!byTile[p.pos]) byTile[p.pos] = []
      byTile[p.pos].push(p)
    })

    const CS = CORNER_SIZE
    const SS = STRAIGHT_SIZE
    const GAP = GRID_GAP
    const buyTile = buyModal.tileId !== null ? TILES[buyModal.tileId] : null
    const buildTile =
      buildModal.tileId !== null ? TILES[buildModal.tileId] : null
    const buildOwner =
      buildModal.tileId !== null ? tileOwners[buildModal.tileId] : undefined
    const tollTile = tollModal.tileId !== null ? TILES[tollModal.tileId] : null
    const currentLevel = (buildOwner?.level ?? 0) as BuildingLevel

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
              />
            </div>
          ))}

          <div className="board-center">
            <span style={{ fontSize: 52 }}>{DICE_ICON}</span>
            <span className="board-center__title">{BOARD_TITLE}</span>
            <div className="board-dice-pair">
              <DiceFace value={dice1} rolling={rolling} />
              <DiceFace value={dice2} rolling={rolling} />
            </div>
          </div>
        </div>

        <BuyModal
          open={buyModal.open}
          cityName={buyTile?.name ?? ''}
          purchaseCostText={formatWon(buyTile?.price ?? 0)}
          isUpgrade={false}
          currentLevel={0}
          onPass={handleBuyPass}
          onBuy={handleBuy}
        />
        <BuildModal
          open={buildModal.open}
          cityName={buildTile?.name ?? ''}
          upgradeStage={getUpgradeStage(currentLevel)}
          currentLevelLabel={LEVEL_LABEL[currentLevel]}
          nextLevelLabel={LEVEL_LABEL[Math.min(currentLevel + 1, 5)]}
          buildCostText={formatWon(
            getUpgradeCost(buildTile?.price ?? 0, currentLevel)
          )}
          nextTollText={formatWon(
            calcToll(buildTile?.price ?? 0, (currentLevel + 1) as BuildingLevel)
          )}
          canBuild={currentLevel < 5}
          onCancel={handleBuildCancel}
          onConfirm={handleBuildConfirm}
        />
        <CardModal
          open={cardModal.open}
          variant={cardModal.variant}
          onConfirm={handleCardConfirm}
        />
        <TollModal
          open={tollModal.open}
          cityName={tollTile?.name}
          ownerName={tollModal.ownerName}
          tollText={tollModal.tollText}
          onConfirm={handleTollConfirm}
        />
        <AIPenaltyModal
          open={aiModal.open}
          status={aiModal.status}
          resultDescription={aiModal.resultDescription}
          onConfirm={handleAIConfirm}
        />
        <BankruptModal
          open={bankruptModal.open}
          playerName={bankruptModal.playerName}
          description={BANKRUPT_DESCRIPTION}
          onConfirm={handleBankruptConfirm}
        />
      </div>
    )
  }
)

GameBoard.displayName = 'GameBoard'
export default GameBoard
