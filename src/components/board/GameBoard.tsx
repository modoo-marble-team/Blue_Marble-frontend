import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import BoardTile, { PlayerToken } from './BoardTile'
import BuyModal from '../game/modals/BuyModal'
import BuildModal from '../game/modals/BuildModal'
import CardModal from '../game/modals/CardModal'
import TravelModal from '../game/modals/TravelModal'
import CityAcquisitionModal from '../game/modals/CityAcquisitionModals'
import CitySellModal from '../game/modals/CitySellModal'
import InsufficientFundsModal from '../game/modals/InsufficientFundsModal'
import TollModal from '../game/modals/TollModal'
import BankruptModal from '../game/modals/BankruptModal'
import DoubleDicePopup from '../game/modals/DoubleDicePopup'
import GameResultModal from '../game/modals/GameResultModal'
import GoToIslandModal from '../game/modals/GoToIslandModal'
import IslandModal from '../game/modals/IslandModal'
import GlobalEffectOverlay from '../game/GlobalEffectOverlay'
import { GLOBAL_EFFECT_THEME_BY_TYPE } from '../game/globalEffectTheme'
import {
  getPromptChoiceLabel,
  getPromptPayloadNumber,
  getPromptPayloadString,
  resolvePromptChoiceValue,
  resolvePromptModalKind,
} from '../game/modals/promptModalMapping'

import {
  TILES,
  TOP_ROW,
  BOTTOM_ROW,
  LEFT_COL,
  RIGHT_COL,
  CORNER_SIZE,
  STRAIGHT_SIZE,
  GRID_GAP,
  PlayerState,
  TileOwner,
  BuildingLevel,
  DICE_TIMEOUT,
  type TileData,
  type TileType,
} from './board.constants'

import { getBoardSellFallbackRefund } from './gameBoardActionUtils'
import { syncMockStorePlayers } from './gameBoardStoreBridge'
import { useBoardEventQueue } from './useBoardEventQueue'
import {
  FAST_MOVE_ANIMATION_OPTIONS,
  getPendingMovePlayerIdsFromEvents,
  getBoardEventAnimationHoldMs,
  resolveBoardCardModalContentFromEvent,
  resolveBoardEventTileIndex,
  resolveChanceMoveAnimationHint,
  shouldApplyTravelMoveAnimation,
  shouldDelayPromptModalByMovement,
  type BoardEventAnimationKind,
  type BoardMoveDirection,
} from './gameBoardEventQueueUtils'
import { buildGameResultModalRows } from './gameBoardResultUtils'

import { getBuildCost, getTollCost } from './board.constants'

import { TileDir } from './board.constants'

/**
 * 타일 ID를 기반으로 CSS Grid 상의 위치(row, col)와 방향(dir)을 반환합니다.
 */
const getTileGridPos = (
  id: number
): { row: number; col: number; dir: TileDir } => {
  const topIdx = TOP_ROW.indexOf(id)
  if (topIdx !== -1) return { row: 1, col: topIdx + 1, dir: 'top' }

  const bottomIdx = BOTTOM_ROW.indexOf(id)
  if (bottomIdx !== -1) return { row: 9, col: 9 - bottomIdx, dir: 'bottom' }

  const leftIdx = LEFT_COL.indexOf(id)
  if (leftIdx !== -1) return { row: 8 - leftIdx, col: 1, dir: 'left' }

  const rightIdx = RIGHT_COL.indexOf(id)
  if (rightIdx !== -1) return { row: rightIdx + 2, col: 9, dir: 'right' }

  return { row: 1, col: 1, dir: 'corner' }
}

import type {
  AIPenaltyModalState,
  BankruptModalState,
  BuildModalState,
  CardModalState,
  TravelModalState,
  CitySellModalState,
  InsufficientFundsModalState,
  GameResultModalState,
  DoubleDiceModalState,
  GoToIslandModalState,
  IslandModalState,
} from './gameBoard.types'
import '../../styles/board.css'
import { formatWon } from '../../lib/utils'
import type {
  GamePhase,
  GlobalEffectState,
  GamePrompt,
  GameResult,
  PlayerId,
  ServerEvent,
} from '../../types/domain'
import { playLongSfx, stopLongSfx } from '../../lib/bgm'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { emitGameAction } from '../../services/socket/game.handler'
import { useGameStore } from '../../stores/game.store'

const DEFAULT_OPPONENT_NAME = '상대방'
const GAME_START_STATUS = '게임 시작!'
const BOARD_GRID_BASE_SIZE = CORNER_SIZE * 2 + STRAIGHT_SIZE * 7 + GRID_GAP * 8
const BOARD_INNER_PADDING = 10 * 2
const BOARD_INNER_BORDER = 4 * 2
const BOARD_RENDER_BASE_SIZE =
  BOARD_GRID_BASE_SIZE + BOARD_INNER_PADDING + BOARD_INNER_BORDER
const MIN_BOARD_SCALE = 0.55
const MAX_BOARD_SCALE = 2.4
const OWNED_TILE_SELL_BOX_SHADOW = '0 0 0 3px rgba(245,158,11,0.55)'

const INITIAL_CITY_SELL_MODAL_STATE: CitySellModalState = {
  open: false,
  tileId: null,
  ownerName: '',
  currentLevel: 0,
  sellPrice: 0,
  showBuildOnCancel: false,
}

const INITIAL_CITY_BUILD_MODAL_STATE: BuildModalState = {
  open: false,
  tileId: null,
}

const INITIAL_INSUFFICIENT_FUNDS_MODAL_STATE: InsufficientFundsModalState = {
  open: false,
  buildingLevel: 0,
  onDoneCallback: undefined,
  promptChoiceValue: null,
}

const INITIAL_TRAVEL_SELECTION_STATE = {
  active: false,
  onDoneCallback: undefined as (() => void) | undefined,
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

type BoardTilePayload = {
  index: number
  owner_id?: string | number | null
  ownerId?: string | number | null
  building: number
  level?: number
  price?: number
  name?: string
  type?: string
  transportType?: string
  color?: string
}

const BOARD_TILE_TYPES: TileType[] = [
  'START',
  'PROPERTY',
  'CHANCE',
  'MOVE_TO_ISLAND',
  'ISLAND',
  'EVENT',
  'TRAVEL',
]

const TILE_DECORATIONS: Record<
  TileType,
  Pick<TileData, 'emoji' | 'svgIcon'>
> = {
  START: { emoji: '🚩' },
  PROPERTY: {},
  CHANCE: { svgIcon: '/event-question.svg' },
  MOVE_TO_ISLAND: { emoji: '👮' },
  ISLAND: { emoji: '🏝️' },
  EVENT: { svgIcon: '/chance-box.svg' },
  TRAVEL: { emoji: '✈️' },
}

const resolveBoardTileType = (
  tile: Pick<BoardTilePayload, 'type' | 'transportType'>,
  fallback: TileType
): TileType => {
  const transportType =
    typeof tile.transportType === 'string'
      ? tile.transportType.trim().toUpperCase()
      : ''

  if (BOARD_TILE_TYPES.includes(transportType as TileType)) {
    return transportType as TileType
  }

  if (typeof tile.type !== 'string' || tile.type.trim() === '') {
    return fallback
  }

  const normalized = tile.type.trim().toUpperCase()
  if (BOARD_TILE_TYPES.includes(normalized as TileType)) {
    return normalized as TileType
  }

  const lowered = tile.type.trim().toLowerCase()
  if (lowered === 'property' || lowered === 'city') return 'PROPERTY'
  if (lowered === 'start') return 'START'
  if (lowered === 'chance' || lowered === 'card') return 'CHANCE'
  if (
    lowered === 'event' ||
    lowered === 'tax' ||
    lowered === 'penalty' ||
    lowered === 'park' ||
    lowered === 'ai'
  ) {
    return 'EVENT'
  }
  if (lowered === 'travel' || lowered === 'airport') return 'TRAVEL'
  if (lowered === 'go_to_island') return 'MOVE_TO_ISLAND'
  if (lowered === 'island' || lowered === 'jail') return 'ISLAND'

  return fallback
}

const buildBoardTileCatalog = (tiles: BoardTilePayload[]): TileData[] => {
  if (!tiles || tiles.length === 0) {
    return TILES
  }

  const tileMap = new Map<number, BoardTilePayload>()
  tiles.forEach((tile) => {
    if (typeof tile.index === 'number' && Number.isFinite(tile.index)) {
      tileMap.set(tile.index, tile)
    }
  })

  return TILES.map((fallbackTile) => {
    const storeTile = tileMap.get(fallbackTile.id)
    if (!storeTile) {
      return fallbackTile
    }

    const resolvedType = resolveBoardTileType(storeTile, fallbackTile.type)
    const decoration = TILE_DECORATIONS[resolvedType]
    const name =
      typeof storeTile.name === 'string' && storeTile.name.trim().length > 0
        ? storeTile.name
        : fallbackTile.name
    const price =
      typeof storeTile.price === 'number' ? storeTile.price : fallbackTile.price
    const color =
      resolvedType === 'PROPERTY'
        ? typeof storeTile.color === 'string' &&
          storeTile.color.trim().length > 0
          ? storeTile.color
          : fallbackTile.color
        : undefined

    return {
      ...fallbackTile,
      id: fallbackTile.id,
      name,
      type: resolvedType,
      price,
      color,
      emoji: decoration.emoji,
      svgIcon: decoration.svgIcon,
    }
  })
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
  gameId?: string | null
  players: PlayerState[]
  curPlayer: number
  round?: number
  gamePhase?: GamePhase | null
  allowAssetActions?: boolean
  suppressDiceTimerModal?: boolean
  activePrompt?: GamePrompt | null
  promptSubmittingChoice?: string | null
  onPromptChoice?: (choice: string, payload?: Record<string, unknown>) => void
  tiles?: BoardTilePayload[]
  localPlayerId?: string | number | null
  gameResult?: GameResult | null
  isGameOver?: boolean
  winnerId?: PlayerId | null
  onGameResultConfirm?: () => void
  onBlockingModalChange?: (blocked: boolean) => void
  activeGlobalEffect?: GlobalEffectState | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const toBooleanOrNull = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) {
      return null
    }
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true
    }
    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false
    }
  }

  return null
}

const resolveDoubleDiceInfo = (event: ServerEvent) => {
  const payloadRecord = isRecord(event.payload) ? event.payload : null
  const eventRecord = isRecord(event) ? event : null
  const rawDoubleCount =
    payloadRecord?.double_count ??
    payloadRecord?.doubleCount ??
    payloadRecord?.extra_roll_count ??
    payloadRecord?.extraRollCount ??
    payloadRecord?.extra_rolls ??
    payloadRecord?.extraRolls ??
    eventRecord?.double_count ??
    eventRecord?.doubleCount ??
    eventRecord?.extra_roll_count ??
    eventRecord?.extraRollCount ??
    eventRecord?.extra_rolls ??
    eventRecord?.extraRolls
  const rawIsDouble =
    payloadRecord?.is_double ??
    payloadRecord?.isDouble ??
    eventRecord?.is_double ??
    eventRecord?.isDouble

  const extraRollCount = toFiniteNumber(rawDoubleCount)
  const hasSignal = rawIsDouble !== undefined || rawDoubleCount !== undefined
  const isDouble =
    toBooleanOrNull(rawIsDouble) ??
    (extraRollCount != null ? extraRollCount > 0 : false)

  return {
    hasSignal,
    isDouble,
    extraRollCount,
  }
}

function toBoardBuildingLevel(
  tile: { building?: number; level?: number },
  hasOwner: boolean
) {
  if (!hasOwner) return 0 as BuildingLevel
  if (typeof tile.level === 'number') {
    return Math.min(Math.max(tile.level, 0), 3) as BuildingLevel
  }
  const buildingLevel = typeof tile.building === 'number' ? tile.building : 0
  return Math.min(Math.max(buildingLevel, 0), 3) as BuildingLevel
}

function buildTileOwnersFromProps(
  tiles: BoardTilePayload[],
  players: PlayerState[]
) {
  const nextOwners: Record<number, TileOwner> = {}

  tiles.forEach((tile) => {
    const ownerId = tile.owner_id ?? tile.ownerId ?? null
    if (ownerId === null || ownerId === undefined) {
      return
    }

    const ownerPlayer = players.find(
      (player) => String(player.id) === String(ownerId)
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
      gameId,
      players,
      curPlayer,
      round,
      gamePhase = null,
      allowAssetActions = false,
      activePrompt = null,
      promptSubmittingChoice = null,
      onPromptChoice,
      tiles = [],
      localPlayerId,
      gameResult = null,
      isGameOver = false,
      winnerId = null,
      onGameResultConfirm,
      onBlockingModalChange,
      activeGlobalEffect = null,
    },
    ref
  ) => {
    const localTimeLeftRef = useRef(DICE_TIMEOUT)
    const [isTimerUrgent, setIsTimerUrgent] = useState(false)
    const [dice1, setDice1] = useState(1)
    const [dice2, setDice2] = useState(1)
    const [isDiceRolling, setIsDiceRolling] = useState(false)
    const [status, setStatus] = useState(GAME_START_STATUS)
    const [eventFxKind, setEventFxKind] =
      useState<BoardEventAnimationKind>('none')
    const boardPageRef = useRef<HTMLDivElement | null>(null)
    const boardStatusRef = useRef<HTMLDivElement | null>(null)
    const [boardScale, setBoardScale] = useState(1)
    const [animatedPositions, setAnimatedPositions] = useState<
      Record<string, number>
    >({})
    const [isMoving, setIsMoving] = useState(false)
    const [boardActionModalBarrier, setBoardActionModalBarrier] =
      useState(false)
    const [travelingPlayerIds, setTravelingPlayerIds] = useState<
      Record<string, boolean>
    >({})
    const travelFxTimeoutRef = useRef<Record<string, number>>({})
    const boardActionModalBarrierFrameRef = useRef<number | null>(null)
    const lastMovePositionRef = useRef<Record<string, number>>({})
    const pendingChanceMoveHintRef = useRef<
      Record<string, { direction: BoardMoveDirection; steps: number }>
    >({})
    const isAnimatingRef = useRef(false)
    useEffect(() => {
      isAnimatingRef.current = isMoving
    }, [isMoving])
    const eventQueue = useGameStore((state) => state.eventQueue)
    const pendingMovePlayerIds = useMemo(
      () => getPendingMovePlayerIdsFromEvents(eventQueue),
      [eventQueue]
    )
    const pendingMovePlayerIdSet = useMemo(
      () => new Set(pendingMovePlayerIds),
      [pendingMovePlayerIds]
    )
    const boardTiles = useMemo(() => buildBoardTileCatalog(tiles), [tiles])
    const clearTravelTokenFx = useCallback((playerId: PlayerId) => {
      const playerKey = String(playerId)
      const timeoutId = travelFxTimeoutRef.current[playerKey]
      if (timeoutId != null) {
        window.clearTimeout(timeoutId)
        delete travelFxTimeoutRef.current[playerKey]
      }
      setTravelingPlayerIds((prev) => {
        if (!prev[playerKey]) {
          return prev
        }
        const next = { ...prev }
        delete next[playerKey]
        return next
      })
    }, [])
    const clearBoardActionModalBarrierFrame = useCallback(() => {
      if (boardActionModalBarrierFrameRef.current != null) {
        window.cancelAnimationFrame(boardActionModalBarrierFrameRef.current)
        boardActionModalBarrierFrameRef.current = null
      }
    }, [])
    const lockBoardActionModals = useCallback(() => {
      clearBoardActionModalBarrierFrame()
      setBoardActionModalBarrier(true)
    }, [clearBoardActionModalBarrierFrame])
    const releaseBoardActionModalsNextFrame = useCallback(() => {
      clearBoardActionModalBarrierFrame()
      boardActionModalBarrierFrameRef.current = window.requestAnimationFrame(
        () => {
          boardActionModalBarrierFrameRef.current = null
          setBoardActionModalBarrier(false)
        }
      )
    }, [clearBoardActionModalBarrierFrame])
    const startTravelTokenFx = useCallback(
      (playerId: PlayerId, durationMs = 1400) => {
        const playerKey = String(playerId)
        const prevTimeout = travelFxTimeoutRef.current[playerKey]
        if (prevTimeout != null) {
          window.clearTimeout(prevTimeout)
        }
        setTravelingPlayerIds((prev) => ({ ...prev, [playerKey]: true }))
        travelFxTimeoutRef.current[playerKey] = window.setTimeout(() => {
          clearTravelTokenFx(playerId)
        }, durationMs)
      },
      [clearTravelTokenFx]
    )

    const curPlayerRef = useRef(curPlayer)
    const playersRef = useRef<PlayerState[]>(players)
    curPlayerRef.current = curPlayer
    playersRef.current = players

    const isMockMode = IS_SOCKET_MOCK_ENABLED
    const handleArrivalRef = useRef<
      (
        tileId: number,
        onDone?: () => void,
        eventPlayerId?: PlayerId | null
      ) => void
    >(() => {})
    const rollAnimationIntervalRef = useRef<number | null>(null)
    const rollAnimationTimeoutRef = useRef<number | null>(null)
    const freezeDiceRollValues = useCallback(() => {
      if (rollAnimationIntervalRef.current !== null) {
        window.clearInterval(rollAnimationIntervalRef.current)
        rollAnimationIntervalRef.current = null
      }
    }, [])
    const stopDiceRollAnimation = useCallback(() => {
      freezeDiceRollValues()
      if (rollAnimationTimeoutRef.current !== null) {
        window.clearTimeout(rollAnimationTimeoutRef.current)
        rollAnimationTimeoutRef.current = null
      }
      setIsDiceRolling(false)
    }, [freezeDiceRollValues])
    useEffect(() => {
      return () => {
        clearBoardActionModalBarrierFrame()
      }
    }, [clearBoardActionModalBarrierFrame])
    const flashDiceRollAnimation = useCallback(
      (durationMs = 260) => {
        stopDiceRollAnimation()
        setIsDiceRolling(true)
        rollAnimationTimeoutRef.current = window.setTimeout(() => {
          stopDiceRollAnimation()
        }, durationMs)
      },
      [stopDiceRollAnimation]
    )
    const triggerDiceRollAnimation = useCallback(
      (durationMs = 520) => {
        stopDiceRollAnimation()
        setIsDiceRolling(true)

        rollAnimationIntervalRef.current = window.setInterval(() => {
          setDice1(Math.floor(Math.random() * 6) + 1)
          setDice2(Math.floor(Math.random() * 6) + 1)
        }, 80)

        rollAnimationTimeoutRef.current = window.setTimeout(() => {
          stopDiceRollAnimation()
        }, durationMs)
      },
      [stopDiceRollAnimation]
    )
    const rolling = isDiceRolling || eventFxKind === 'dice'
    const delay = (ms: number) =>
      new Promise((resolve) => window.setTimeout(resolve, ms))

    const movePlayerSequentially = useCallback(
      async (
        playerId: PlayerId,
        from: number,
        to: number,
        options?: {
          initialDelayMs?: number
          stepDelayMs?: number
          endDelayMs?: number
          direction?: BoardMoveDirection
        }
      ) => {
        setIsMoving(true)
        const totalTiles = boardTiles.length
        const direction = options?.direction ?? 'clockwise'
        let current = from
        const initialDelayMs = options?.initialDelayMs ?? 800
        const stepDelayMs = options?.stepDelayMs ?? 380
        const endDelayMs = options?.endDelayMs ?? 400

        // 이동 시작 즉시 현재 칸에 고정 (스토어 선반영으로 인한 점프 방지)
        setAnimatedPositions((prev) => ({
          ...prev,
          [String(playerId)]: current,
        }))

        // 연출 대기
        if (initialDelayMs > 0) {
          await delay(initialDelayMs)
        }

        // 한 칸씩 이동
        while (current !== to) {
          current =
            direction === 'counterclockwise'
              ? (current - 1 + totalTiles) % totalTiles
              : (current + 1) % totalTiles
          setAnimatedPositions((prev) => ({
            ...prev,
            [String(playerId)]: current,
          }))

          // 이동 효과음
          new Audio('/audio/move.mp3').play().catch(() => {})

          await delay(stepDelayMs) // 한 칸 이동 간격
        }

        // 마지막 도착 칸에서 잠시 대기
        if (endDelayMs > 0) {
          await delay(endDelayMs)
        }

        setAnimatedPositions((prev) => {
          const next = { ...prev }
          delete next[String(playerId)]
          return next
        })
        setIsMoving(false)
      },
      [boardTiles.length]
    )
    const emitMockEndTurn = useCallback(() => {
      if (!isMockMode || !gameId) {
        return
      }

      emitGameAction({
        type: 'END_TURN',
        gameId,
      })
    }, [isMockMode, gameId])
    const handleBoardEventConsumed = useCallback(
      (event: ServerEvent) => {
        const normalizedType =
          typeof event.type === 'string' ? event.type.trim().toUpperCase() : ''
        const isLocalPlayerEvent =
          localPlayerId == null ||
          event.playerId == null ||
          String(event.playerId) === String(localPlayerId)

        if (normalizedType === 'DICE_ROLLED') {
          if (rollAnimationIntervalRef.current !== null) {
            freezeDiceRollValues()
          } else {
            flashDiceRollAnimation()
          }

          const dicePayload = event.payload as
            | { dice?: [number, number] }
            | undefined
          if (dicePayload?.dice && dicePayload.dice.length >= 2) {
            setDice1(dicePayload.dice[0])
            setDice2(dicePayload.dice[1])
          }

          try {
            new Audio('/audio/dice-roll.mp3').play().catch(() => {})
          } catch {
            // audio playback blocked
          }

          const doubleInfo = resolveDoubleDiceInfo(event)
          if (
            isLocalPlayerEvent &&
            doubleInfo.hasSignal &&
            doubleInfo.isDouble
          ) {
            setDoubleDiceModal({
              open: true,
              extraRollCount:
                typeof doubleInfo.extraRollCount === 'number' &&
                doubleInfo.extraRollCount > 0
                  ? doubleInfo.extraRollCount
                  : null,
            })
          }
        }

        if (normalizedType === 'PLAYER_MOVED') {
          const tileIndex = resolveBoardEventTileIndex(event)
          if (tileIndex == null) {
            return
          }

          const payloadRecord = isRecord(event.payload) ? event.payload : null
          const eventRecord = isRecord(event) ? event : null
          const rawFromIndex =
            payloadRecord?.fromIndex ??
            payloadRecord?.from_index ??
            payloadRecord?.fromTileId ??
            payloadRecord?.from_tile_id ??
            payloadRecord?.fromTile ??
            payloadRecord?.from_tile ??
            eventRecord?.fromIndex ??
            eventRecord?.from_index ??
            eventRecord?.fromTileId ??
            eventRecord?.from_tile_id
          const parsedFromIndex =
            typeof rawFromIndex === 'number' && Number.isFinite(rawFromIndex)
              ? rawFromIndex
              : typeof rawFromIndex === 'string' && rawFromIndex.trim() !== ''
                ? Number.parseInt(rawFromIndex, 10)
                : null
          const playerKey = String(event.playerId ?? '')
          const rawTrigger =
            payloadRecord?.trigger ??
            payloadRecord?.moveTrigger ??
            payloadRecord?.move_trigger ??
            eventRecord?.trigger ??
            eventRecord?.moveTrigger ??
            eventRecord?.move_trigger
          const normalizedTrigger =
            typeof rawTrigger === 'string'
              ? rawTrigger.trim().toLowerCase()
              : ''
          const isChanceTriggeredMove = normalizedTrigger === 'chance'
          const chanceMoveHint =
            playerKey && playerKey !== 'null'
              ? pendingChanceMoveHintRef.current[playerKey]
              : undefined
          const lastKnownFrom =
            playerKey && playerKey !== 'null'
              ? lastMovePositionRef.current[playerKey]
              : undefined
          let fromIndex =
            (Number.isFinite(parsedFromIndex ?? Number.NaN)
              ? Number(parsedFromIndex)
              : null) ??
            lastKnownFrom ??
            playersRef.current.find(
              (p) => String(p.id) === String(event.playerId)
            )?.pos ??
            0

          const rawSteps =
            payloadRecord?.total ??
            payloadRecord?.steps ??
            payloadRecord?.move ??
            payloadRecord?.distance ??
            payloadRecord?.diceTotal ??
            payloadRecord?.dice_total ??
            eventRecord?.total ??
            eventRecord?.steps
          const parsedSteps =
            typeof rawSteps === 'number' && Number.isFinite(rawSteps)
              ? rawSteps
              : typeof rawSteps === 'string' && rawSteps.trim() !== ''
                ? Number.parseInt(rawSteps, 10)
                : null
          const moveSteps =
            parsedSteps != null && Number.isFinite(parsedSteps)
              ? Math.trunc(Math.abs(parsedSteps))
              : (chanceMoveHint?.steps ?? null)

          let moveDirection: BoardMoveDirection = 'clockwise'
          if (isChanceTriggeredMove && chanceMoveHint) {
            moveDirection = chanceMoveHint.direction
          } else if (
            isChanceTriggeredMove &&
            moveSteps != null &&
            moveSteps > 0
          ) {
            const totalTiles = boardTiles.length
            const normalizedSteps = moveSteps % totalTiles
            const clockwiseTo = (fromIndex + normalizedSteps) % totalTiles
            const counterclockwiseTo =
              (fromIndex - normalizedSteps + totalTiles) % totalTiles

            if (counterclockwiseTo === tileIndex && clockwiseTo !== tileIndex) {
              moveDirection = 'counterclockwise'
            }
          }

          if (fromIndex === tileIndex) {
            if (moveSteps != null && moveSteps > 0) {
              const totalTiles = boardTiles.length
              const normalizedSteps = moveSteps % totalTiles
              fromIndex =
                moveDirection === 'counterclockwise'
                  ? (tileIndex + normalizedSteps) % totalTiles
                  : (tileIndex - normalizedSteps + totalTiles) % totalTiles
            }
          }

          const isTravelMove = shouldApplyTravelMoveAnimation({
            normalizedTrigger,
            fromIndex,
            toIndex: tileIndex,
            tiles: boardTiles,
          })
          lockBoardActionModals()
          if (isTravelMove && event.playerId != null) {
            startTravelTokenFx(event.playerId, 1600)
          }

          const movePromise = movePlayerSequentially(
            event.playerId!,
            fromIndex,
            tileIndex,
            {
              direction: moveDirection,
              ...(isTravelMove ? FAST_MOVE_ANIMATION_OPTIONS : {}),
            }
          )

          // 애니메이션 시작 (비동기로 실행하여 이벤트 큐의 지연과 맞춤)
          void movePromise
            .then(() => {
              if (isChanceTriggeredMove && playerKey && playerKey !== 'null') {
                delete pendingChanceMoveHintRef.current[playerKey]
              }
              if (playerKey && playerKey !== 'null') {
                lastMovePositionRef.current[playerKey] = tileIndex
              }
              if (isTravelMove && event.playerId != null) {
                clearTravelTokenFx(event.playerId)
              }
              // 애니메이션 종료 후 도착 처리 (모달 띄우기 등)
              handleArrivalRef.current(
                tileIndex,
                emitMockEndTurn,
                event.playerId ?? null
              )
            })
            .finally(() => {
              releaseBoardActionModalsNextFrame()
            })
          return
        }

        if (normalizedType === 'CHANCE_RESOLVED') {
          const chanceMoveHint = resolveChanceMoveAnimationHint(event)
          if (chanceMoveHint) {
            pendingChanceMoveHintRef.current[chanceMoveHint.playerId] = {
              direction: chanceMoveHint.direction,
              steps: chanceMoveHint.steps,
            }
          }

          if (!isLocalPlayerEvent) {
            return
          }

          const cardModalContent = resolveBoardCardModalContentFromEvent(
            event,
            boardTiles
          )

          if (!cardModalContent) {
            return
          }

          setCardModal({
            open: true,
            variant: cardModalContent.variant,
            title: cardModalContent.title,
            descriptionLine1: cardModalContent.descriptionLine1,
            descriptionLine2: cardModalContent.descriptionLine2,
            onDoneCallback: undefined,
          })

          if (cardModalContent.variant === 'CHANCE') {
            new Audio('/audio/chance.mp3').play().catch(() => {})
          } else {
            new Audio('/audio/event.mp3').play().catch(() => {})
          }
        }
      },
      [
        boardTiles,
        clearTravelTokenFx,
        emitMockEndTurn,
        freezeDiceRollValues,
        flashDiceRollAnimation,
        lockBoardActionModals,
        localPlayerId,
        movePlayerSequentially,
        releaseBoardActionModalsNextFrame,
        startTravelTokenFx,
      ]
    )
    const handleEventAnimation = useCallback(
      (kind: BoardEventAnimationKind) => {
        if (isMockMode && kind !== 'dice') {
          return
        }

        if (kind === 'dice') {
          freezeDiceRollValues()
        }

        setEventFxKind(kind)
      },
      [isMockMode, freezeDiceRollValues]
    )

    useEffect(() => {
      return () => {
        stopDiceRollAnimation()
      }
    }, [stopDiceRollAnimation])
    useEffect(() => {
      if (eventFxKind === 'none') {
        return
      }

      const holdMs = getBoardEventAnimationHoldMs(eventFxKind)
      if (holdMs <= 0) {
        setEventFxKind('none')
        return
      }

      const timer = window.setTimeout(() => {
        setEventFxKind('none')
      }, holdMs)

      return () => {
        window.clearTimeout(timer)
      }
    }, [eventFxKind])
    useEffect(() => {
      if (players.length === 0) {
        return
      }

      const nextPositions = { ...lastMovePositionRef.current }
      for (const player of players) {
        const key = String(player.id)
        const isAnimatingPlayer = animatedPositions[key] != null
        const hasPendingMove = pendingMovePlayerIdSet.has(key)

        if (nextPositions[key] == null) {
          nextPositions[key] = player.pos
          continue
        }

        if (!isAnimatingPlayer && !hasPendingMove) {
          nextPositions[key] = player.pos
        }
      }
      lastMovePositionRef.current = nextPositions
    }, [animatedPositions, pendingMovePlayerIdSet, players])
    const derivedTileOwners = useMemo(
      () => buildTileOwnersFromProps(tiles, players),
      [tiles, players]
    )
    const tileOwners = derivedTileOwners
    const tileOwnersRef = useRef<Record<number, TileOwner>>(tileOwners)
    const promptModalKind = resolvePromptModalKind(activePrompt)
    const isBuyPromptOpen = promptModalKind === 'buy'
    const isBuildPromptOpen = promptModalKind === 'build'
    const isTollPromptOpen = promptModalKind === 'toll'
    const isSellPromptOpen = promptModalKind === 'sell'
    const isAcquisitionPromptOpen = promptModalKind === 'acquisition'
    const isTravelPromptOpen = promptModalKind === 'travel'
    const isIslandPromptOpen = promptModalKind === 'island'
    const isGoToIslandPromptOpen = promptModalKind === 'go_to_island'

    const promptTileId = getPromptPayloadNumber(activePrompt, [
      'tileId',
      'tile_id',
      'targetTileId',
      'target_tile_id',
      'toTileId',
      'to_tile_id',
    ])
    const promptTile = promptTileId != null ? boardTiles[promptTileId] : null
    const promptOwnerId = getPromptPayloadNumber(activePrompt, [
      'ownerId',
      'owner_id',
      'toPlayerId',
      'to_player_id',
    ])
    const promptOwnerNameFromPayload = getPromptPayloadString(activePrompt, [
      'ownerName',
      'owner_name',
      'ownerNickname',
      'owner_nickname',
    ])
    const promptOwnerName =
      promptOwnerNameFromPayload ??
      (promptOwnerId != null
        ? players.find((player) => Number(player.id) === promptOwnerId)?.name
        : null) ??
      DEFAULT_OPPONENT_NAME
    const promptSellerName =
      getPromptPayloadString(activePrompt, [
        'sellerName',
        'seller_name',
        'sellerNickname',
        'seller_nickname',
        'playerName',
        'player_name',
        'ownerName',
        'owner_name',
      ]) ??
      (activePrompt?.playerId != null
        ? players.find(
            (player) => String(player.id) === String(activePrompt.playerId)
          )?.name
        : null) ??
      players[curPlayer]?.name ??
      ''
    const promptAmount = getPromptPayloadNumber(activePrompt, [
      'amount',
      'toll',
      'tollAmount',
      'toll_amount',
      'price',
    ])
    const promptAcquisitionCost = getPromptPayloadNumber(activePrompt, [
      'acquisitionCost',
      'acquisition_cost',
      'buyoutCost',
      'buyout_cost',
      'purchaseCost',
      'purchase_cost',
      'cost',
      'price',
    ])
    const promptSellPrice = getPromptPayloadNumber(activePrompt, [
      'sellPrice',
      'sell_price',
      'refund',
      'amount',
      'price',
    ])
    const promptTileName =
      getPromptPayloadString(activePrompt, [
        'tileName',
        'tile_name',
        'cityName',
        'city_name',
      ]) ??
      promptTile?.name ??
      ''
    const promptCurrentLevelFromPayload = getPromptPayloadNumber(activePrompt, [
      'buildingLevel',
      'building_level',
      'currentLevel',
      'current_level',
    ])
    const promptCurrentLevel = Math.min(
      3,
      Math.max(
        0,
        promptCurrentLevelFromPayload ??
          (promptTileId != null ? (tileOwners[promptTileId]?.level ?? 0) : 0)
      )
    ) as BuildingLevel
    const promptNextLevel = Math.min(promptCurrentLevel + 1, 3) as BuildingLevel

    const promptBuyChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'buyConfirm'
    )
    const promptBuyPassChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'buyCancel'
    )
    const promptBuildConfirmChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'buildConfirm'
    )
    const promptBuildCancelChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'buildCancel'
    )
    const promptTollConfirmChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'tollConfirm'
    )
    const promptSellConfirmChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'sellConfirm'
    )
    const promptSellCancelChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'sellCancel'
    )
    const promptAcquisitionConfirmChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'acquisitionConfirm'
    )
    const promptAcquisitionCancelChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'acquisitionCancel'
    )
    const promptTravelCancelChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'travelCancel'
    )

    const submitPromptChoice = (
      choiceValue: string | null,
      onSuccess?: () => void,
      payload?: Record<string, unknown>
    ) => {
      if (!choiceValue || !onPromptChoice || promptSubmittingChoice !== null) {
        return false
      }

      onPromptChoice(choiceValue, payload)
      onSuccess?.()
      return true
    }

    useEffect(() => {
      if (!activePrompt) {
        return
      }

      if (promptSubmittingChoice !== null) {
        setStatus('선택을 전송했습니다. 서버 응답을 기다리는 중...')
        return
      }

      const promptTitle =
        typeof activePrompt.title === 'string' &&
        activePrompt.title.trim() !== ''
          ? activePrompt.title.trim()
          : '선택'
      setStatus(`${promptTitle} 진행 중`)
    }, [activePrompt, promptSubmittingChoice])

    useEffect(() => {
      tileOwnersRef.current = derivedTileOwners
    }, [derivedTileOwners])

    useEffect(() => {
      const pageElement = boardPageRef.current
      if (!pageElement) {
        return
      }

      const updateBoardScale = () => {
        const pageRect = pageElement.getBoundingClientRect()
        const pageStyle = window.getComputedStyle(pageElement)
        const paddingX =
          Number.parseFloat(pageStyle.paddingLeft) +
          Number.parseFloat(pageStyle.paddingRight)
        const paddingY =
          Number.parseFloat(pageStyle.paddingTop) +
          Number.parseFloat(pageStyle.paddingBottom)
        const rowGap = Number.parseFloat(
          pageStyle.rowGap || pageStyle.gap || '0'
        )
        const statusHeight =
          boardStatusRef.current?.getBoundingClientRect().height ?? 0
        const availableWidth = pageRect.width - paddingX
        const availableHeight =
          pageRect.height - paddingY - statusHeight - rowGap

        if (availableWidth <= 0 || availableHeight <= 0) {
          return
        }

        const nextScaleRaw = Math.min(
          availableWidth / BOARD_RENDER_BASE_SIZE,
          availableHeight / BOARD_RENDER_BASE_SIZE
        )
        const nextScale = Math.max(
          MIN_BOARD_SCALE,
          Math.min(nextScaleRaw, MAX_BOARD_SCALE)
        )
        const roundedScale = Math.round(nextScale * 1000) / 1000

        setBoardScale((prev) =>
          Math.abs(prev - roundedScale) < 0.001 ? prev : roundedScale
        )
      }

      const resizeObserver = new ResizeObserver(updateBoardScale)
      resizeObserver.observe(pageElement)
      if (boardStatusRef.current) {
        resizeObserver.observe(boardStatusRef.current)
      }

      updateBoardScale()
      return () => {
        resizeObserver.disconnect()
      }
    }, [])

    // 타이머 관리
    useEffect(() => {
      stopDiceRollAnimation()
      setDice1(1)
      setDice2(1)
      localTimeLeftRef.current = DICE_TIMEOUT
      setIsTimerUrgent(false)
      // timer removed

      // Close all other modals when turn changes
      setCardModal({ open: false, variant: 'EVENT' })
      setTravelModal({ open: false })
      setTravelSelection(INITIAL_TRAVEL_SELECTION_STATE)
      setCitySellModal(INITIAL_CITY_SELL_MODAL_STATE)
      setCityBuildModal(INITIAL_CITY_BUILD_MODAL_STATE)
      setInsufficientFundsModal(INITIAL_INSUFFICIENT_FUNDS_MODAL_STATE)
      setAiModal({ open: false, status: 'loading' })
      setGoToIslandModal({ open: false })

      const p = playersRef.current[curPlayer]
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
        } else {
          setStatus(`${p.name}님의 차례입니다`)
        }
      }
    }, [curPlayer, round, stopDiceRollAnimation])

    useEffect(() => {
      if (!activePrompt || !isBuyPromptOpen) {
        setDismissedBuyPromptId(null)
      }
    }, [activePrompt, isBuyPromptOpen])

    useEffect(() => {
      if (!activePrompt || !isBuildPromptOpen) {
        setDismissedBuildPromptId(null)
      }
    }, [activePrompt, isBuildPromptOpen])

    const [cardModal, setCardModal] = useState<CardModalState>({
      open: false,
      variant: 'EVENT',
    })
    const [travelModal, setTravelModal] = useState<TravelModalState>({
      open: false,
    })
    const [travelSelection, setTravelSelection] = useState(
      INITIAL_TRAVEL_SELECTION_STATE
    )
    const [dismissedTravelPromptId, setDismissedTravelPromptId] = useState<
      string | null
    >(null)

    useEffect(() => {
      if (!isTravelPromptOpen) {
        return
      }

      if (
        activePrompt?.id != null &&
        dismissedTravelPromptId === activePrompt.id
      ) {
        return
      }

      const promptPlayerId =
        activePrompt?.playerId != null ? String(activePrompt.playerId) : null
      const shouldDelayTravelModalOpen = shouldDelayPromptModalByMovement({
        promptPlayerId,
        pendingMovePlayerIdSet,
        animatedPositions,
        isMoving: isMoving || rolling || boardActionModalBarrier,
      })
      if (shouldDelayTravelModalOpen) {
        return
      }

      const travelPromptTileId = getPromptPayloadNumber(activePrompt, [
        'tileId',
        'tile_id',
        'targetTileId',
        'target_tile_id',
        'toTileId',
        'to_tile_id',
      ])
      const promptPlayerPosition =
        promptPlayerId != null
          ? players.find((player) => String(player.id) === promptPlayerId)?.pos
          : players[curPlayer]?.pos
      if (
        travelPromptTileId != null &&
        promptPlayerPosition != null &&
        promptPlayerPosition !== travelPromptTileId
      ) {
        return
      }

      if (!travelModal.open && !travelSelection.active) {
        setTravelModal({ open: true })
      }
    }, [
      activePrompt,
      activePrompt?.id,
      activePrompt?.playerId,
      animatedPositions,
      curPlayer,
      dismissedTravelPromptId,
      boardActionModalBarrier,
      isTravelPromptOpen,
      isMoving,
      pendingMovePlayerIdSet,
      players,
      rolling,
      travelModal.open,
      travelSelection.active,
    ])

    useEffect(() => {
      if (!activePrompt || !isTravelPromptOpen) {
        setDismissedTravelPromptId(null)
      }
    }, [activePrompt, isTravelPromptOpen])

    const [citySellModal, setCitySellModal] = useState<CitySellModalState>(
      INITIAL_CITY_SELL_MODAL_STATE
    )
    const [cityBuildModal, setCityBuildModal] = useState<BuildModalState>(
      INITIAL_CITY_BUILD_MODAL_STATE
    )
    const [insufficientFundsModal, setInsufficientFundsModal] =
      useState<InsufficientFundsModalState>(
        INITIAL_INSUFFICIENT_FUNDS_MODAL_STATE
      )
    const [dismissedBuyPromptId, setDismissedBuyPromptId] = useState<
      string | null
    >(null)
    const [dismissedBuildPromptId, setDismissedBuildPromptId] = useState<
      string | null
    >(null)
    useEffect(() => {
      if (
        promptSubmittingChoice === null &&
        dismissedBuildPromptId != null &&
        activePrompt?.id === dismissedBuildPromptId
      ) {
        setDismissedBuildPromptId(null)
      }
    }, [activePrompt?.id, dismissedBuildPromptId, promptSubmittingChoice])

    const [aiModal, setAiModal] = useState<AIPenaltyModalState>({
      open: false,
      status: 'loading',
    })
    const [bankruptModal, setBankruptModal] = useState<BankruptModalState>({
      open: false,
      playerIdx: -1,
      playerName: '',
    })
    const [gameResultModal, setGameResultModal] =
      useState<GameResultModalState>({
        open: false,
      })
    const [doubleDiceModal, setDoubleDiceModal] =
      useState<DoubleDiceModalState>({
        open: false,
        extraRollCount: null,
      })
    const [goToIslandModal, setGoToIslandModal] =
      useState<GoToIslandModalState>({
        open: false,
      })
    const [islandModal, setIslandModal] = useState<IslandModalState>({
      open: false,
    })

    const hasAuthoritativeGameResult = Boolean(
      gameResult?.winner ||
      (Array.isArray(gameResult?.rankings) && gameResult.rankings.length > 0)
    )

    useEffect(() => {
      const shouldOpenGameResultModal = hasAuthoritativeGameResult
      if (shouldOpenGameResultModal) {
        setGameResultModal((prev) => (prev.open ? prev : { open: true }))
        return
      }

      setGameResultModal({ open: false })
    }, [hasAuthoritativeGameResult])
    const serverResultRows = useMemo(() => {
      const rankings = gameResult?.rankings
      if (!rankings || rankings.length === 0) {
        return []
      }

      return [...rankings].sort((left, right) => left.rank - right.rank)
    }, [gameResult])
    const resultModalRows = useMemo(() => {
      return buildGameResultModalRows({
        rankings: serverResultRows,
        winner: gameResult?.winner,
        tiles,
      })
    }, [gameResult?.winner, serverResultRows, tiles])
    const resultModalWinnerName = useMemo(() => {
      if (gameResult?.winner?.nickname) {
        return gameResult.winner.nickname
      }
      if (serverResultRows.length > 0) {
        const winnerByFlag = serverResultRows.find((result) => result.is_winner)
        const winnerById =
          winnerId == null
            ? null
            : serverResultRows.find(
                (result) => String(result.player_id) === String(winnerId)
              )
        return (
          winnerByFlag?.nickname ??
          winnerById?.nickname ??
          serverResultRows[0]?.nickname ??
          '승리자'
        )
      }

      return '승리자'
    }, [gameResult, serverResultRows, winnerId])

    function handleBankruptConfirm() {
      const { onDoneCallback } = bankruptModal
      setBankruptModal({ open: false, playerIdx: -1, playerName: '' })
      onDoneCallback?.()
    }

    function handleDoubleDiceConfirm() {
      setDoubleDiceModal({ open: false, extraRollCount: null })
    }

    function advanceTurn(onDone?: () => void) {
      onDone?.()
    }

    function rollDice(onDone?: () => void) {
      triggerDiceRollAnimation()
      onDone?.()
    }

    useImperativeHandle(ref, () => ({
      rollDice: (onDone) => {
        rollDice(onDone)
      },
    }))

    async function handleGoToIslandConfirm() {
      stopLongSfx()
      const { onDoneCallback } = goToIslandModal
      setGoToIslandModal({ open: false })

      if (!isMockMode) {
        // Real server mode: authoritative movement/state update comes from
        // subsequent PLAYER_MOVED / PLAYER_STATE_CHANGED events.
        onDoneCallback?.()
        return
      }

      const playerIdx = curPlayerRef.current
      const player = playersRef.current[playerIdx]
      if (!player) return

      const islandTile = boardTiles.find((t) => t.type === 'ISLAND')
      if (islandTile) {
        // 무인도 이동도 한 칸씩 전진 애니메이션 적용
        await movePlayerSequentially(
          player.id,
          player.pos === islandTile.id ? 24 : player.pos,
          islandTile.id,
          FAST_MOVE_ANIMATION_OPTIONS
        )

        const updatedPlayers = [...playersRef.current]
        updatedPlayers[playerIdx] = {
          ...updatedPlayers[playerIdx],
          pos: islandTile.id,
          skipTurns: 3,
        }
        playersRef.current = updatedPlayers
        if (isMockMode) {
          syncMockStorePlayers(updatedPlayers)
        }
      }

      setIslandModal({
        open: true,
        onDoneCallback,
      })
    }

    function handleIslandConfirm() {
      stopLongSfx()
      const { onDoneCallback } = islandModal
      setIslandModal({ open: false })
      advanceTurn(onDoneCallback)
    }

    async function handleTollModalConfirm() {
      stopLongSfx()
      // 💰 통행료(보유금) 지불 소리 재생
      new Audio('/audio/transaction.mp3').play().catch(() => {})
      submitPromptChoice(promptTollConfirmChoiceValue)
    }

    function closeLocalSellModal() {
      setCitySellModal(INITIAL_CITY_SELL_MODAL_STATE)
    }

    function handleCitySellCancel() {
      if (isSellPromptOpen) {
        submitPromptChoice(promptSellCancelChoiceValue)
        return
      }

      closeLocalSellModal()
    }

    async function handleCitySellConfirm() {
      stopLongSfx()
      // 💰 매각 처리 (거래) 소리 재생
      new Audio('/audio/transaction.mp3').play().catch(() => {})

      if (isSellPromptOpen) {
        submitPromptChoice(promptSellConfirmChoiceValue)
        return
      }

      const tileId = citySellModal.tileId
      if (tileId == null) {
        closeLocalSellModal()
        return
      }

      const owner = tileOwnersRef.current[tileId]
      const activePlayer = playersRef.current[curPlayerRef.current]
      if (
        !owner ||
        !activePlayer ||
        String(owner.ownerId) !== String(activePlayer.id)
      ) {
        closeLocalSellModal()
        return
      }

      emitGameAction({
        type: 'SELL_PROPERTY',
        gameId: gameId ?? undefined,
        payload: {
          tileId,
          buildingLevel: owner.level,
        },
      })
      closeLocalSellModal()
    }

    function handleInsufficientFundsConfirm() {
      const { promptChoiceValue } = insufficientFundsModal
      if (isBuildPromptOpen && activePrompt?.id) {
        setDismissedBuildPromptId(activePrompt.id)
      }
      setInsufficientFundsModal(INITIAL_INSUFFICIENT_FUNDS_MODAL_STATE)

      submitPromptChoice(promptChoiceValue ?? null)
    }

    function handleCityAcquisitionCancel() {
      submitPromptChoice(promptAcquisitionCancelChoiceValue)
    }

    function handleCityAcquisitionConfirm() {
      stopLongSfx()
      const activePlayerIdx = curPlayerRef.current
      const activePlayerMoney = playersRef.current[activePlayerIdx]?.money ?? 0
      const requiredAcquisitionCost =
        promptAcquisitionCost ??
        (promptTileId != null ? (boardTiles[promptTileId]?.price ?? 0) : 0)

      if (activePlayerMoney < requiredAcquisitionCost) {
        setInsufficientFundsModal({
          open: true,
          buildingLevel: promptCurrentLevel,
          promptChoiceValue: promptAcquisitionCancelChoiceValue,
        })
        return
      }

      // 💰 인수 확인 소리 재생
      new Audio('/audio/transaction.mp3').play().catch(() => {})
      submitPromptChoice(promptAcquisitionConfirmChoiceValue)
    }

    async function handleCardConfirm() {
      stopLongSfx()
      const { onDoneCallback } = cardModal
      setCardModal((prev) => ({ ...prev, open: false }))

      const hasIslandKeyword =
        cardModal.title?.includes('무인도') ||
        cardModal.descriptionLine1?.includes('무인도') ||
        cardModal.descriptionLine2?.includes('무인도')
      const isFallbackIslandEventCard =
        cardModal.variant === 'EVENT' &&
        !cardModal.descriptionLine1 &&
        !cardModal.descriptionLine2

      if (isMockMode && (hasIslandKeyword || isFallbackIslandEventCard)) {
        const playerIdx = curPlayerRef.current
        const player = playersRef.current[playerIdx]
        const islandTile = boardTiles.find((t) => t.type === 'ISLAND')

        if (player && islandTile) {
          await movePlayerSequentially(
            player.id,
            player.pos,
            islandTile.id,
            FAST_MOVE_ANIMATION_OPTIONS
          )

          const updatedPlayers = [...playersRef.current]
          updatedPlayers[playerIdx] = {
            ...updatedPlayers[playerIdx],
            pos: islandTile.id,
            skipTurns: 3,
          }
          playersRef.current = updatedPlayers
          if (isMockMode) {
            syncMockStorePlayers(updatedPlayers)
          }

          setIslandModal({
            open: true,
            onDoneCallback,
          })
          return
        }
      }

      onDoneCallback?.()
    }

    function handleTravelConfirm() {
      const { onDoneCallback } = travelModal
      setTravelModal({ open: false })
      setTravelSelection({
        active: true,
        onDoneCallback,
      })
      const travelTileName =
        boardTiles.find((tile) => tile.type === 'TRAVEL')?.name ?? '여행'
      setStatus(`${travelTileName}: 이동할 칸을 클릭하세요.`)
    }

    function handleTravelCancel() {
      setTravelModal({ open: false })
      if (isTravelPromptOpen && activePrompt?.id) {
        setDismissedTravelPromptId(activePrompt.id)
      }
      submitPromptChoice(promptTravelCancelChoiceValue ?? 'SKIP')
    }

    useEffect(() => {
      return () => {
        Object.values(travelFxTimeoutRef.current).forEach((timeoutId) => {
          window.clearTimeout(timeoutId)
        })
        travelFxTimeoutRef.current = {}
      }
    }, [])

    function handleTravelDestinationSelect(tileId: number) {
      if (!travelSelection.active) {
        return
      }

      const playerIdx = curPlayerRef.current
      const currentPlayer = playersRef.current[playerIdx]
      if (!currentPlayer || tileId === currentPlayer.pos) {
        return
      }

      const { onDoneCallback } = travelSelection
      const hasTravelPromptContext = isTravelPromptOpen && !!activePrompt?.id
      startTravelTokenFx(currentPlayer.id, hasTravelPromptContext ? 2500 : 1200)

      if (hasTravelPromptContext) {
        const submitted = submitPromptChoice('CONFIRM', undefined, {
          targetTileId: tileId,
        })

        if (!submitted) {
          return
        }

        if (activePrompt?.id) {
          setDismissedTravelPromptId(activePrompt.id)
        }

        setTravelSelection(INITIAL_TRAVEL_SELECTION_STATE)
        setStatus('선택을 전송했습니다. 서버 응답을 기다리는 중...')
        return
      }
      const updatedPlayers = [...playersRef.current]
      updatedPlayers[playerIdx] = {
        ...currentPlayer,
        pos: tileId,
      }
      playersRef.current = updatedPlayers
      if (isMockMode) {
        syncMockStorePlayers(updatedPlayers)
      }
      setTravelSelection(INITIAL_TRAVEL_SELECTION_STATE)

      if (!isMockMode) {
        setStatus('서버 선택 요청을 처리할 수 없는 상태입니다.')
        return
      }

      const destinationName =
        boardTiles[tileId]?.name.replace('\n', ' ') || '선택 칸'
      setStatus(
        `${currentPlayer.name}님이 ${destinationName} 칸으로 이동합니다.`
      )

      // ✈️ 여행 이동 소리 재생
      playLongSfx('/audio/plane-fly.mp3')

      window.setTimeout(() => {
        handleArrival(tileId, onDoneCallback)
      }, 300)
    }

    function handleArrival(
      tileId: number,
      onDone?: () => void,
      eventPlayerId?: PlayerId | null
    ) {
      const tile = boardTiles[tileId]

      const isLocalPlayerTurn =
        localPlayerId == null ||
        eventPlayerId == null ||
        String(eventPlayerId) === String(localPlayerId)

      if (tile.type === 'START') {
        setStatus('시작 칸에 도착!')
        advanceTurn(onDone)
        return
      }

      if (tile.type === 'MOVE_TO_ISLAND') {
        setStatus('무인도로 이동!')
        if (isLocalPlayerTurn) {
          if (goToIslandModal.open || islandModal.open) {
            return
          }

          // 만약 이미 스토어 위치가 8(무인도)로 바뀌어 있다면,
          // 애니메이션이 끝나고 삭제되면서 8로 점프하는 것을 막기 위해
          // 현재 칸(24)에 애니메이션 위치를 고정(Pin)합니다.
          const pid = eventPlayerId ?? localPlayerId
          if (pid != null) {
            setAnimatedPositions((prev) => ({
              ...prev,
              [String(pid)]: 24,
            }))
          }

          setGoToIslandModal({ open: true, onDoneCallback: onDone })
          new Audio('/audio/island-trap.mp3').play().catch(() => {})
        } else {
          onDone?.()
        }
        return
      }

      if (tile.type === 'ISLAND') {
        setStatus('무인도 칸에 도착!')
        if (isLocalPlayerTurn) {
          if (goToIslandModal.open || islandModal.open) {
            return
          }
          new Audio('/audio/island-trap.mp3').play().catch(() => {})
          setIslandModal({ open: true, onDoneCallback: onDone })
        } else {
          onDone?.()
        }
        return
      }

      if (tile.type === 'PROPERTY') {
        setStatus('다음 선택지를 준비하는 중...')
        onDone?.()
        return
      }

      if (tile.type === 'TRAVEL' && tile.id === 16) {
        if (!isMockMode) {
          onDone?.()
          return
        }

        if (isLocalPlayerTurn) {
          setTravelModal({
            open: true,
            onDoneCallback: onDone,
          })
        } else {
          onDone?.()
        }
        return
      }
      if (tile.type === 'CHANCE' || tile.type === 'EVENT') {
        if (!isMockMode) {
          onDone?.()
          return
        }

        if (isLocalPlayerTurn) {
          setCardModal({
            open: true,
            variant: tile.type === 'CHANCE' ? 'CHANCE' : 'EVENT',
            onDoneCallback: onDone,
          })
          if (tile.type === 'CHANCE') {
            new Audio('/audio/chance.mp3').play().catch(() => {})
          } else {
            new Audio('/audio/event.mp3').play().catch(() => {})
          }
        } else {
          onDone?.()
        }
        return
      }

      advanceTurn(onDone)
    }
    handleArrivalRef.current = handleArrival

    /* byTile logic refactored out for flat token rendering */

    const getTokenOffset = (
      playerIdx: number,
      totalInTile: number,
      tileId: number
    ) => {
      const owner = tileOwners[tileId]
      const hasBuilding =
        owner && owner.level > 0 && boardTiles[tileId]?.type === 'PROPERTY'
      // 건물이 있으면 토큰을 14px 아래로 내려서 건물을 가리지 않게 함
      const baseY = hasBuilding ? 14 : 0

      if (totalInTile <= 1) return { x: 0, y: baseY }

      // 4인 기준 바둑판 배치 (토큰 크기 26px 대비 넉넉하게 16px 오프셋)
      // 중심 간 거리 32px로 토큰 사이 6px 간격 확보 (완판 오버랩 방지)
      const d = 16
      const offsets = [
        { x: -d, y: -d + baseY },
        { x: d, y: -d + baseY },
        { x: -d, y: d + baseY },
        { x: d, y: d + baseY },
      ]
      return offsets[playerIdx % 4] || { x: 0, y: baseY }
    }

    const CS = CORNER_SIZE
    const SS = STRAIGHT_SIZE
    const GAP = GRID_GAP

    const buyTile = promptTile
    const buyModalOpen = isBuyPromptOpen
    const buildModalOpen = isBuildPromptOpen
    const buildTile = promptTile
    const currentLevel = promptCurrentLevel
    const buildTargetLevel = promptNextLevel
    const tollTile = promptTile
    const tollModalOpen = isTollPromptOpen
    const tollOwnerName = promptOwnerName
    const tollAmountText = formatWon(promptAmount ?? 0)
    const activeEffectTheme = activeGlobalEffect
      ? GLOBAL_EFFECT_THEME_BY_TYPE[activeGlobalEffect.effect]
      : null
    const sellTileId = isSellPromptOpen ? promptTileId : citySellModal.tileId
    const sellTile = sellTileId != null ? boardTiles[sellTileId] : null
    const sellOwnerName = isSellPromptOpen
      ? promptSellerName
      : citySellModal.ownerName
    const sellCurrentLevel = isSellPromptOpen
      ? promptCurrentLevel
      : citySellModal.currentLevel
    const sellPrice = isSellPromptOpen
      ? (promptSellPrice ??
        (sellTileId != null
          ? getBoardSellFallbackRefund(sellTile?.price ?? 0, promptCurrentLevel)
          : (sellTile?.price ?? 0)))
      : citySellModal.sellPrice ||
        (sellTileId != null
          ? getBoardSellFallbackRefund(sellTile?.price ?? 0, sellCurrentLevel)
          : (sellTile?.price ?? 0))
    const acquisitionTile = promptTile
    const acquisitionModalOpenRaw = isAcquisitionPromptOpen
    const acquisitionOwnerName = promptOwnerName
    const acquisitionCurrentLevel = promptCurrentLevel
    const acquisitionCost = promptAcquisitionCost ?? acquisitionTile?.price ?? 0

    const buyCost =
      getPromptPayloadNumber(activePrompt, [
        'price',
        'purchaseCost',
        'purchase_cost',
        'cost',
      ]) ??
      buyTile?.price ??
      0

    const isBuyPromptDismissed =
      activePrompt?.id != null && dismissedBuyPromptId === activePrompt.id
    const isBuildPromptDismissed =
      activePrompt?.id != null && dismissedBuildPromptId === activePrompt.id

    const scaledBoardSize = BOARD_RENDER_BASE_SIZE * boardScale

    const hasAnimationBlocking = isMoving || rolling
    const canShowModal = !hasAnimationBlocking
    const boardActionAnimationBlocking =
      hasAnimationBlocking || boardActionModalBarrier
    const activePromptPlayerId =
      activePrompt?.playerId != null ? String(activePrompt.playerId) : null
    const shouldDelayPromptModal = shouldDelayPromptModalByMovement({
      promptPlayerId: activePromptPlayerId,
      pendingMovePlayerIdSet,
      animatedPositions,
      isMoving: boardActionAnimationBlocking,
    })
    const canRevealBoardActionModal =
      canShowModal && !shouldDelayPromptModal && !boardActionModalBarrier

    const buyModalVisible =
      canRevealBoardActionModal &&
      buyModalOpen &&
      !isBuyPromptDismissed &&
      !insufficientFundsModal.open
    const buildModalVisible =
      canRevealBoardActionModal &&
      buildModalOpen &&
      !isBuildPromptDismissed &&
      !insufficientFundsModal.open
    const tollModalVisible = canRevealBoardActionModal && tollModalOpen
    const acquisitionModalOpen =
      canRevealBoardActionModal &&
      acquisitionModalOpenRaw &&
      !tollModalOpen &&
      !insufficientFundsModal.open
    const sellModalVisible =
      canRevealBoardActionModal && (citySellModal.open || isSellPromptOpen)

    const doubleDiceModalVisible = canShowModal && doubleDiceModal.open

    const activePlayerMoney = players[curPlayer]?.money ?? 0
    const islandRestTurns = (() => {
      const promptTurns = getPromptPayloadNumber(activePrompt, [
        'restTurns',
        'rest_turns',
        'skipTurns',
        'skip_turns',
        'duration',
      ])
      if (promptTurns != null) return promptTurns

      const player = players[curPlayer]
      if (!player) return null
      const rawTurns =
        typeof player.skipTurns === 'number'
          ? player.skipTurns
          : typeof player.stateDuration === 'number'
            ? player.stateDuration
            : null
      if (rawTurns == null || !Number.isFinite(rawTurns) || rawTurns <= 0) {
        return null
      }
      return rawTurns
    })()
    const buildCost =
      getPromptPayloadNumber(activePrompt, [
        'buildCost',
        'build_cost',
        'cost',
        'price',
      ]) ?? getBuildCost(buildTile?.price ?? 0, currentLevel as BuildingLevel)
    const nextTollCost =
      getPromptPayloadNumber(activePrompt, [
        'nextToll',
        'next_toll',
        'toll',
        'toll_amount',
        'amount',
      ]) ??
      getTollCost(buildTile?.price ?? 0, (currentLevel + 1) as BuildingLevel)

    const hasBlockingModalOpen =
      buyModalVisible ||
      buildModalVisible ||
      (canRevealBoardActionModal && cardModal.open) ||
      (canRevealBoardActionModal && travelModal.open) ||
      tollModalVisible ||
      acquisitionModalOpen ||
      sellModalVisible ||
      insufficientFundsModal.open ||
      aiModal.open ||
      (canRevealBoardActionModal && goToIslandModal.open) ||
      (canRevealBoardActionModal && islandModal.open) ||
      doubleDiceModalVisible ||
      bankruptModal.open ||
      gameResultModal.open
    const isEventQueuePaused =
      hasAnimationBlocking ||
      boardActionModalBarrier ||
      hasBlockingModalOpen ||
      travelSelection.active ||
      promptSubmittingChoice !== null

    useEffect(() => {
      onBlockingModalChange?.(isEventQueuePaused)
    }, [isEventQueuePaused, onBlockingModalChange])

    useBoardEventQueue({
      enabled: true,
      paused: isEventQueuePaused,
      playersRef,
      tiles: boardTiles,
      setStatus,
      setDice1,
      setDice2,
      onEventAnimation: handleEventAnimation,
      onEventConsumed: handleBoardEventConsumed,
    })
    const activePlayerId = players[curPlayer]?.id ?? null
    const isAssetActionPhase =
      gamePhase === 'rolling' || gamePhase === 'resolving'
    const isLocalPlayersTurn =
      localPlayerId != null &&
      activePlayerId != null &&
      String(activePlayerId) === String(localPlayerId)
    const canManageOwnAssets =
      isLocalPlayersTurn && allowAssetActions && isAssetActionPhase
    const isTravelSelectableTile = (tileId: number) =>
      travelSelection.active && tileId !== players[curPlayer]?.pos
    const openLocalSellModal = (tileId: number) => {
      const tile = boardTiles[tileId]
      const owner = tileOwnersRef.current[tileId]
      const activePlayer = players[curPlayer]

      if (
        !tile ||
        tile.type !== 'PROPERTY' ||
        !owner ||
        !activePlayer ||
        String(owner.ownerId) !== String(activePlayer.id)
      ) {
        return
      }

      const ownerName =
        players.find((player) => String(player.id) === String(owner.ownerId))
          ?.name ??
        activePlayer.name ??
        ''

      setCitySellModal({
        open: true,
        tileId,
        ownerName,
        currentLevel: owner.level,
        sellPrice: getBoardSellFallbackRefund(tile.price ?? 0, owner.level),
        showBuildOnCancel: false,
      })
    }
    const isOwnedTileSellClickable = (tileId: number) => {
      if (!canManageOwnAssets || travelSelection.active || activePrompt) {
        return false
      }

      const tile = boardTiles[tileId]
      const owner = tileOwnersRef.current[tileId]
      if (
        !tile ||
        tile.type !== 'PROPERTY' ||
        !owner ||
        activePlayerId == null
      ) {
        return false
      }

      return String(owner.ownerId) === String(activePlayerId)
    }
    const getTileClickState = (tileId: number) => {
      const isTravelSelectable = isTravelSelectableTile(tileId)
      const isOwnedSellClickable = isOwnedTileSellClickable(tileId)

      return {
        isClickable: isTravelSelectable || isOwnedSellClickable,
        boxShadow: isTravelSelectable
          ? '0 0 0 3px rgba(43,127,255,0.9)'
          : isOwnedSellClickable
            ? OWNED_TILE_SELL_BOX_SHADOW
            : undefined,
      }
    }
    const handleBoardTileClick = (tileId: number) => {
      if (isGameOver) return

      // 주사위가 굴러가는 중이거나 애니메이션 중이면 클릭 차단
      if (isDiceRolling || isAnimatingRef.current) return

      if (travelSelection.active) {
        if (tileId !== players[curPlayer]?.pos) {
          handleTravelDestinationSelect(tileId)
        }
        return
      }

      if (!canManageOwnAssets) {
        return
      }

      if (!isOwnedTileSellClickable(tileId)) {
        return
      }

      openLocalSellModal(tileId)
    }

    const handleCityBuildConfirm = (tileId: number) => {
      setCityBuildModal(INITIAL_CITY_BUILD_MODAL_STATE)

      // 서버 프롬프트가 대기 중인 경우 프롬프트 응답으로 처리
      if (
        activePrompt?.type === 'BUILD_OR_SKIP' &&
        String(tileId) === String(promptTileId)
      ) {
        submitPromptChoice(promptBuildConfirmChoiceValue)
      } else {
        // 서버 계약 변경: 착지 prompt 기반(BUILD_OR_SKIP)만 허용
        return
      }
    }

    const handleCityBuildCancel = () => {
      setCityBuildModal(INITIAL_CITY_BUILD_MODAL_STATE)

      // 업그레이드 취소 후 매각 팝업 강제 노출 제거
    }

    const displayEventFxKind =
      isMockMode || eventFxKind === 'dice' ? 'none' : eventFxKind

    return (
      <div
        className="board-page"
        ref={boardPageRef}
        style={{ width: '100%', height: '100%' }}
      >
        <div
          className={
            displayEventFxKind === 'none'
              ? 'board-status'
              : `board-status board-status--${displayEventFxKind}`
          }
          ref={boardStatusRef}
        >
          {status}
        </div>

        <div
          style={{
            position: 'relative',
            width: `${scaledBoardSize}px`,
            height: `${scaledBoardSize}px`,
            flexShrink: 0,
          }}
        >
          <div
            className="board-inner"
            style={{
              position: 'absolute',
              inset: 0,
              width: `${BOARD_GRID_BASE_SIZE}px`,
              height: `${BOARD_GRID_BASE_SIZE}px`,
              transform: `scale(${boardScale})`,
              transformOrigin: 'top left',
              gridTemplateColumns: `${CS}px repeat(7, ${SS}px) ${CS}px`,
              gridTemplateRows: `${CS}px repeat(7, ${SS}px) ${CS}px`,
              gap: `${GAP}px`,
            }}
          >
            {TOP_ROW.map((id, ci) =>
              (() => {
                const isCornerTile = ci === 0 || ci === 8
                const { isClickable, boxShadow } = getTileClickState(id)
                return (
                  <div
                    key={id}
                    onClick={
                      isClickable ? () => handleBoardTileClick(id) : undefined
                    }
                    style={{
                      gridRow: 1,
                      gridColumn: ci + 1,
                      cursor: isClickable ? 'pointer' : 'default',
                      borderRadius: isCornerTile ? 18 : 13,
                      boxShadow,
                      transition: 'box-shadow 0.2s ease',
                    }}
                  >
                    <BoardTile
                      tile={boardTiles[id]}
                      dir={isCornerTile ? 'corner' : 'top'}
                      tileOwner={tileOwners[id]}
                      isUrgent={isTimerUrgent}
                      isActivePlayerTile={id === players[curPlayer]?.pos}
                      activeEffectTileBorderColor={
                        activeEffectTheme?.tileBorderColor
                      }
                    />
                  </div>
                )
              })()
            )}
            {BOTTOM_ROW.map((id, ci) =>
              (() => {
                const isCornerTile = ci === 0 || ci === 8
                const { isClickable, boxShadow } = getTileClickState(id)
                return (
                  <div
                    key={id}
                    onClick={
                      isClickable ? () => handleBoardTileClick(id) : undefined
                    }
                    style={{
                      gridRow: 9,
                      gridColumn: 9 - ci,
                      cursor: isClickable ? 'pointer' : 'default',
                      borderRadius: isCornerTile ? 18 : 13,
                      boxShadow,
                      transition: 'box-shadow 0.2s ease',
                    }}
                  >
                    <BoardTile
                      tile={boardTiles[id]}
                      dir={isCornerTile ? 'corner' : 'bottom'}
                      tileOwner={tileOwners[id]}
                      isUrgent={isTimerUrgent}
                      isActivePlayerTile={id === players[curPlayer]?.pos}
                      activeEffectTileBorderColor={
                        activeEffectTheme?.tileBorderColor
                      }
                    />
                  </div>
                )
              })()
            )}
            {LEFT_COL.map((id, ri) =>
              (() => {
                const { isClickable, boxShadow } = getTileClickState(id)
                return (
                  <div
                    key={id}
                    onClick={
                      isClickable ? () => handleBoardTileClick(id) : undefined
                    }
                    style={{
                      gridRow: 8 - ri,
                      gridColumn: 1,
                      cursor: isClickable ? 'pointer' : 'default',
                      borderRadius: 13,
                      boxShadow,
                      transition: 'box-shadow 0.2s ease',
                    }}
                  >
                    <BoardTile
                      tile={boardTiles[id]}
                      dir="left"
                      tileOwner={tileOwners[id]}
                      isUrgent={isTimerUrgent}
                      isActivePlayerTile={id === players[curPlayer]?.pos}
                      activeEffectTileBorderColor={
                        activeEffectTheme?.tileBorderColor
                      }
                    />
                  </div>
                )
              })()
            )}
            {RIGHT_COL.map((id, ri) =>
              (() => {
                const { isClickable, boxShadow } = getTileClickState(id)
                return (
                  <div
                    key={id}
                    onClick={
                      isClickable ? () => handleBoardTileClick(id) : undefined
                    }
                    style={{
                      gridRow: ri + 2,
                      gridColumn: 9,
                      cursor: isClickable ? 'pointer' : 'default',
                      borderRadius: 13,
                      boxShadow,
                      transition: 'box-shadow 0.2s ease',
                    }}
                  >
                    <BoardTile
                      tile={boardTiles[id]}
                      dir="right"
                      tileOwner={tileOwners[id]}
                      isUrgent={isTimerUrgent}
                      isActivePlayerTile={id === players[curPlayer]?.pos}
                      activeEffectTileBorderColor={
                        activeEffectTheme?.tileBorderColor
                      }
                    />
                  </div>
                )
              })()
            )}

            {/* ─── 플레이어 토큰 레이어 (절대 좌표 대신 Grid 활용 정점 방식) ──────────────── */}
            {players
              .filter((p) => p.state !== 'bankrupt' && p.money > 0)
              .map((p) => {
                const playerKey = String(p.id)
                const animatedPos = animatedPositions[playerKey]
                const pendingPos = pendingMovePlayerIdSet.has(playerKey)
                  ? lastMovePositionRef.current[playerKey]
                  : undefined
                const pos = animatedPos ?? pendingPos ?? p.pos
                const { row, col } = getTileGridPos(pos)
                const tokensAtThisPos = players.filter((pl) => {
                  if (pl.state === 'bankrupt' || pl.money <= 0) {
                    return false
                  }
                  const key = String(pl.id)
                  const plAnimatedPos = animatedPositions[key]
                  const plPendingPos = pendingMovePlayerIdSet.has(key)
                    ? lastMovePositionRef.current[key]
                    : undefined
                  const renderPos = plAnimatedPos ?? plPendingPos ?? pl.pos
                  return renderPos === pos
                })
                const pIdx = players.findIndex((pl) => pl.id === p.id)
                const offset = getTokenOffset(pIdx, tokensAtThisPos.length, pos)
                const hasStrip = ![
                  'START',
                  'ISLAND',
                  'MOVE_TO_ISLAND',
                  'TRAVEL',
                  'CHANCE',
                  'EVENT',
                ].includes(boardTiles[pos].type)

                return (
                  <PlayerToken
                    key={p.id}
                    player={p}
                    stripOffset={hasStrip ? 7 : 0}
                    offset={offset}
                    isTraveling={Boolean(travelingPlayerIds[playerKey])}
                    travelIconSrc="/Travel- airplane.svg"
                    // Grid 직접 컨트롤 (움찔거림 방지 핵심)
                    style={{
                      gridRow: row,
                      gridColumn: col,
                      justifySelf: 'center',
                      alignSelf: 'center',
                      pointerEvents: 'none',
                      zIndex: 100,
                    }}
                  />
                )
              })}

            <div
              className={
                displayEventFxKind === 'none'
                  ? 'board-center'
                  : `board-center board-center--${displayEventFxKind}`
              }
              style={{
                gridRow: '2 / 9',
                gridColumn: '2 / 9',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                backgroundColor: '#F0F9FF',
                borderRadius: 24,
                boxShadow: 'inset 0 0 0 1px rgba(203,213,225,0.35)',
              }}
            >
              <svg
                viewBox="0 0 520 520"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '47.5%',
                  transform: 'translate(-50%, -50%)',
                  width: '92%',
                  maxWidth: 640,
                  opacity: 0.3,
                  pointerEvents: 'none',
                }}
              >
                <path
                  d="M50 156 L196 194 L260 58 L324 194 L470 156 L398 382 H122 Z"
                  fill="none"
                  stroke="#DBEAFE"
                  strokeWidth="30"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M136 452 H384"
                  fill="none"
                  stroke="#DBEAFE"
                  strokeWidth="30"
                  strokeLinecap="round"
                />
              </svg>

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '49%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  zIndex: 1,
                }}
              >
                <DiceFace value={dice1} rolling={rolling} />
                <DiceFace value={dice2} rolling={rolling} />
              </div>
            </div>
          </div>
          <GlobalEffectOverlay activeEffect={activeGlobalEffect} />
        </div>

        <BuyModal
          open={buyModalVisible}
          onBuy={() => {
            if (activePlayerMoney < buyCost) {
              if (activePrompt?.id) {
                setDismissedBuyPromptId(activePrompt.id)
              }
              setInsufficientFundsModal({
                open: true,
                buildingLevel: 0,
                promptChoiceValue: promptBuyPassChoiceValue,
              })
              return
            }

            // 💰 토지 구매 소리 재생
            new Audio('/audio/land-buy.mp3').play().catch(() => {})
            submitPromptChoice(promptBuyChoiceValue)
          }}
          onPass={() => {
            submitPromptChoice(promptBuyPassChoiceValue)
          }}
          passLabel={getPromptChoiceLabel(
            activePrompt,
            promptBuyPassChoiceValue,
            '건너뛰기'
          )}
          buyLabel={getPromptChoiceLabel(
            activePrompt,
            promptBuyChoiceValue,
            '구매하기'
          )}
          isSubmitting={promptSubmittingChoice !== null}
          cityName={promptTileName}
          purchaseCostText={formatWon(buyCost)}
        />
        <InsufficientFundsModal
          open={insufficientFundsModal.open}
          buildingLevel={insufficientFundsModal.buildingLevel}
          onConfirm={handleInsufficientFundsConfirm}
        />
        <BuildModal
          open={buildModalVisible}
          onConfirm={() => {
            if (activePlayerMoney < buildCost) {
              setInsufficientFundsModal({
                open: true,
                buildingLevel: buildTargetLevel,
                promptChoiceValue: promptBuildCancelChoiceValue,
              })
              return
            }

            // 🏗️ 건설 목표 레벨에 따른 소리 재생
            if (buildTargetLevel <= 1) {
              new Audio('/audio/house-buy.mp3').play().catch(() => {})
            } else if (buildTargetLevel === 2) {
              new Audio('/audio/hotel-build.mp3').play().catch(() => {})
            } else {
              new Audio('/audio/landmark-build.mp3').play().catch(() => {})
            }
            submitPromptChoice(promptBuildConfirmChoiceValue)
          }}
          onCancel={() => submitPromptChoice(promptBuildCancelChoiceValue)}
          cityName={promptTileName}
          nextLevel={buildTargetLevel}
          cancelLabel={getPromptChoiceLabel(
            activePrompt,
            promptBuildCancelChoiceValue,
            '취소'
          )}
          confirmLabel={getPromptChoiceLabel(
            activePrompt,
            promptBuildConfirmChoiceValue,
            '건설하기'
          )}
          isSubmitting={promptSubmittingChoice !== null}
          buildCostText={formatWon(buildCost)}
          nextTollText={formatWon(nextTollCost)}
        />
        <TollModal
          open={tollModalVisible}
          onConfirm={() => {
            void handleTollModalConfirm()
          }}
          cityName={promptTileName || tollTile?.name || ''}
          ownerName={tollOwnerName}
          tollText={tollAmountText}
          tollTextColor={activeEffectTheme?.tollTextColor}
          confirmLabel={getPromptChoiceLabel(
            activePrompt,
            promptTollConfirmChoiceValue,
            '확인하기'
          )}
          isSubmitting={promptSubmittingChoice !== null}
        />
        <CityAcquisitionModal
          open={acquisitionModalOpen}
          cityName={promptTileName || acquisitionTile?.name || ''}
          ownerName={acquisitionOwnerName}
          purchaseCostText={formatWon(acquisitionCost)}
          currentLevel={acquisitionCurrentLevel}
          onCancel={handleCityAcquisitionCancel}
          onAcquire={handleCityAcquisitionConfirm}
        />
        <CitySellModal
          open={sellModalVisible}
          ownerName={sellOwnerName}
          currentLevel={sellCurrentLevel}
          sellPriceText={formatWon(sellPrice)}
          onCancel={handleCitySellCancel}
          onSell={() => {
            void handleCitySellConfirm()
          }}
        />
        <CardModal
          open={canRevealBoardActionModal && cardModal.open}
          variant={cardModal.variant}
          title={cardModal.title}
          descriptionLine1={cardModal.descriptionLine1}
          descriptionLine2={cardModal.descriptionLine2}
          highlightText={cardModal.highlightText}
          onConfirm={handleCardConfirm}
        />
        <TravelModal
          open={canRevealBoardActionModal && travelModal.open}
          onConfirm={handleTravelConfirm}
          onCancel={handleTravelCancel}
          showCancel={false}
        />
        <BankruptModal
          open={canShowModal && bankruptModal.open}
          playerName={bankruptModal.playerName}
          onConfirm={handleBankruptConfirm}
        />
        <DoubleDicePopup
          open={doubleDiceModalVisible}
          extraRollCount={doubleDiceModal.extraRollCount}
          onConfirm={handleDoubleDiceConfirm}
        />
        <GameResultModal
          open={canShowModal && gameResultModal.open}
          winnerName={resultModalWinnerName}
          results={resultModalRows}
          returnToWaitingRoomLabel="대기방으로 돌아가기"
          onReturnToWaitingRoom={() => {
            setGameResultModal({ open: false })
            onGameResultConfirm?.()
          }}
        />
        <GoToIslandModal
          open={
            canRevealBoardActionModal &&
            (isGoToIslandPromptOpen || goToIslandModal.open)
          }
          onConfirm={handleGoToIslandConfirm}
        />
        {/* 🏝️ 무인도 (직접 도착) 팝업 */}
        <IslandModal
          open={
            canRevealBoardActionModal &&
            (isIslandPromptOpen || islandModal.open)
          }
          restTurns={islandRestTurns}
          onConfirm={handleIslandConfirm}
        />
        {cityBuildModal.open && cityBuildModal.tileId != null && (
          <BuildModal
            open={true}
            cityName={
              boardTiles[cityBuildModal.tileId]?.name.replace('\n', ' ') || ''
            }
            nextLevel={
              Math.min(
                (tileOwners[cityBuildModal.tileId]?.level || 0) + 1,
                3
              ) as BuildingLevel
            }
            buildCostText={formatWon(
              getBuildCost(
                boardTiles[cityBuildModal.tileId]?.price || 0,
                (tileOwners[cityBuildModal.tileId]?.level || 0) as BuildingLevel
              )
            )}
            nextTollText={formatWon(
              getTollCost(
                boardTiles[cityBuildModal.tileId]?.price || 0,
                Math.min(
                  (tileOwners[cityBuildModal.tileId]?.level || 0) + 1,
                  3
                ) as BuildingLevel
              )
            )}
            onConfirm={() => handleCityBuildConfirm(cityBuildModal.tileId!)}
            onCancel={handleCityBuildCancel}
          />
        )}
        {/* 수동 건설 모달 (상시 클릭용) */}
      </div>
    )
  }
)

GameBoard.displayName = 'GameBoard'

export default GameBoard
