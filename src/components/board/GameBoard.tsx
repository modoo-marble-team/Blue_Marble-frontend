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
import DiceTimerModal from '../game/modals/DiceTimerModal'
import GameResultModal from '../game/modals/GameResultModal'
import GoToIslandModal from '../game/modals/GoToIslandModal'
import IslandModal from '../game/modals/IslandModal'
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
  LEVEL_LABELS,
} from './board.constants'

import { getBoardSellFallbackRefund } from './gameBoardActionUtils'
import { useBoardEventQueue } from './useBoardEventQueue'
import {
  getBoardEventAnimationHoldMs,
  resolveBoardEventTileIndex,
  type BoardEventAnimationKind,
} from './gameBoardEventQueueUtils'

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
  if (bottomIdx !== -1) return { row: 9, col: bottomIdx + 1, dir: 'bottom' }

  const leftIdx = LEFT_COL.indexOf(id)
  if (leftIdx !== -1) return { row: 7 - leftIdx + 2, col: 1, dir: 'left' }

  const rightIdx = RIGHT_COL.indexOf(id)
  if (rightIdx !== -1) return { row: rightIdx + 2, col: 9, dir: 'right' }

  return { row: 1, col: 1, dir: 'corner' }
}

import type {
  AIPenaltyModalState,
  BankruptModalState,
  BuildModalState,
  BuyModalState,
  CardModalState,
  TravelModalState,
  CityAcquisitionModalState,
  CitySellModalState,
  InsufficientFundsModalState,
  TollModalState,
  GameResultModalState,
  GoToIslandModalState,
  IslandModalState,
} from './gameBoard.types'
import '../../styles/board.css'
import { formatWon } from '../../lib/utils'
import type {
  GamePrompt,
  GameResult,
  PlayerId,
  ServerEvent,
} from '../../types/domain'
import { playLongSfx, stopLongSfx } from '../../lib/bgm'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { emitGameAction } from '../../services/socket/game.handler'

const DEFAULT_OPPONENT_NAME = '상대방'
const GAME_START_STATUS = '게임 시작!'
const BOARD_GRID_BASE_SIZE = CORNER_SIZE * 2 + STRAIGHT_SIZE * 7 + GRID_GAP * 8
const BOARD_INNER_PADDING = 10 * 2
const BOARD_INNER_BORDER = 4 * 2
const BOARD_RENDER_BASE_SIZE =
  BOARD_GRID_BASE_SIZE + BOARD_INNER_PADDING + BOARD_INNER_BORDER
const MIN_BOARD_SCALE = 0.55
const MAX_BOARD_SCALE = 2.4

const INITIAL_CITY_ACQUISITION_MODAL_STATE: CityAcquisitionModalState = {
  open: false,
  tileId: null,
  ownerName: '',
  currentLevel: 0,
  acquisitionCost: 0,
}

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
  suppressDiceTimerModal?: boolean
  activePrompt?: GamePrompt | null
  promptSubmittingChoice?: string | null
  onPromptChoice?: (choice: string, payload?: Record<string, unknown>) => void
  tiles?: Array<{
    index: number
    owner_id?: string | number | null
    building: number
    level?: number
    price?: number
  }>
  localPlayerId?: string | number | null
  gameResult?: GameResult | null
  isGameOver?: boolean
  winnerId?: PlayerId | null
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
    if (tile.owner_id === null || tile.owner_id === undefined) {
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
      gameId,
      players,
      curPlayer,
      suppressDiceTimerModal = false,
      activePrompt = null,
      promptSubmittingChoice = null,
      onPromptChoice,
      tiles = [],
      localPlayerId,
      gameResult = null,
      isGameOver = false,
      winnerId = null,
    },
    ref
  ) => {
    const localTimeLeftRef = useRef(DICE_TIMEOUT)
    const [isTimerUrgent, setIsTimerUrgent] = useState(false)
    const [promptTimerLeftSec, setPromptTimerLeftSec] = useState<number | null>(
      null
    )
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
    const isAnimatingRef = useRef(false)

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
      async (playerId: PlayerId, from: number, to: number) => {
        isAnimatingRef.current = true
        const totalTiles = TILES.length
        let current = from

        // 주사위 결과 확인을 위한 대기 (사용자 요청: 주사위 결과 확인 -> 이동)
        await delay(800)

        // 한 칸씩 이동
        while (current !== to) {
          current = (current + 1) % totalTiles
          setAnimatedPositions((prev) => ({
            ...prev,
            [String(playerId)]: current,
          }))

          // 이동 효과음
          new Audio('/audio/move.mp3').play().catch(() => {})

          await delay(350) // 한 칸 이동 간격 (전보다 조금 천천히)
        }

        // 마지막 도착 칸에서 잠시 대기
        await delay(400)

        // 애니메이션 종료 후 로컬 상태 정리 (스토어 위치와 동기화될 때까지 대기하여 점프 방지)
        // 만약 스토어의 위치가 아직 목적지에 도달하지 않았다면 도달할 때까지 대기합니다.
        let retryCount = 0
        while (
          playersRef.current.find((p) => String(p.id) === String(playerId))
            ?.pos !== to &&
          retryCount < 50 // 최대 5초 대기 (안전장치)
        ) {
          await delay(100)
          retryCount++
        }

        setAnimatedPositions((prev) => {
          const next = { ...prev }
          delete next[String(playerId)]
          return next
        })
        isAnimatingRef.current = false
      },
      []
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
        }

        if (normalizedType === 'PLAYER_MOVED') {
          const tileIndex = resolveBoardEventTileIndex(event)
          if (tileIndex == null) {
            return
          }

          const fromIndex =
            (event.payload as { fromIndex?: number })?.fromIndex ??
            playersRef.current.find(
              (p) => String(p.id) === String(event.playerId)
            )?.pos ??
            0

          // 애니메이션 시작 (비동기로 실행하여 이벤트 큐의 지연과 맞춤)
          movePlayerSequentially(event.playerId!, fromIndex, tileIndex).then(
            () => {
              // 애니메이션 종료 후 도착 처리 (모달 띄우기 등)
              handleArrivalRef.current(
                tileIndex,
                emitMockEndTurn,
                event.playerId ?? null
              )
            }
          )
          return
        }
      },
      [
        emitMockEndTurn,
        freezeDiceRollValues,
        flashDiceRollAnimation,
        movePlayerSequentially,
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

    useBoardEventQueue({
      enabled: true,
      playersRef,
      setStatus,
      setDice1,
      setDice2,
      onEventAnimation: handleEventAnimation,
      onEventConsumed: handleBoardEventConsumed,
    })
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
    const derivedTileOwners = useMemo(
      () => buildTileOwnersFromProps(tiles, players),
      [tiles, players]
    )
    const tileOwners = derivedTileOwners
    const tilesWithServerPrice = useMemo(() => {
      const priceMap: Record<number, number> = {}
      for (const t of tiles) {
        if (typeof t.index === 'number' && typeof t.price === 'number') {
          priceMap[t.index] = t.price
        }
      }
      const map: Record<number, TileData> = {}
      for (let i = 0; i < TILES.length; i++) {
        map[i] = i in priceMap ? { ...TILES[i], price: priceMap[i] } : TILES[i]
      }
      return map
    }, [tiles])
    const tileOwnersRef = useRef<Record<number, TileOwner>>(tileOwners)
    const promptModalKind = resolvePromptModalKind(activePrompt)
    const isBuyPromptOpen = promptModalKind === 'buy'
    const isBuildPromptOpen = promptModalKind === 'build'
    const isTollPromptOpen = promptModalKind === 'toll'
    const isSellPromptOpen = promptModalKind === 'sell'
    const isAcquisitionPromptOpen = promptModalKind === 'acquisition'
    const isTravelPromptOpen = promptModalKind === 'travel'
    const isDiceTimerPromptOpen = promptModalKind === 'dice_timer'

    const promptTileId = getPromptPayloadNumber(activePrompt, [
      'tileId',
      'tile_id',
      'targetTileId',
      'target_tile_id',
      'toTileId',
      'to_tile_id',
    ])
    const promptTile = promptTileId != null ? TILES[promptTileId] : null
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
      7,
      Math.max(
        0,
        promptCurrentLevelFromPayload ??
          (promptTileId != null ? (tileOwners[promptTileId]?.level ?? 0) : 0)
      )
    ) as BuildingLevel
    const promptNextLevel = Math.min(promptCurrentLevel + 1, 7) as BuildingLevel

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
    const promptTimerConfirmChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'timerConfirm'
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
      localTimeLeftRef.current = DICE_TIMEOUT
      setIsTimerUrgent(false)
      setPromptTimerLeftSec(null)

      // Close all other modals when turn changes
      setBuyModal({ open: false, tileId: null })
      setBuildModal({ open: false, tileId: null })
      setCardModal({ open: false, variant: 'EVENT' })
      setTravelModal({ open: false })
      setTravelSelection(INITIAL_TRAVEL_SELECTION_STATE)
      setTollModal({ open: false, tileId: null, ownerName: '', tollText: '' })
      setCityAcquisitionModal(INITIAL_CITY_ACQUISITION_MODAL_STATE)
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
        }
      }
    }, [curPlayer])

    useEffect(() => {
      if (rolling) return

      const timer = setInterval(() => {
        const prev = localTimeLeftRef.current
        if (prev <= 1) {
          localTimeLeftRef.current = 0
          clearInterval(timer)
          setIsTimerUrgent(false)
          return
        }
        const next = prev - 1
        localTimeLeftRef.current = next
        const wasUrgent = prev <= 10 && prev > 0
        const isNowUrgent = next <= 10 && next > 0
        if (wasUrgent !== isNowUrgent) {
          setIsTimerUrgent(isNowUrgent)
        }
      }, 1000)

      return () => clearInterval(timer)
    }, [curPlayer, rolling, isDiceTimerPromptOpen])

    useEffect(() => {
      if (!isDiceTimerPromptOpen || !activePrompt) {
        setPromptTimerLeftSec(null)
        return
      }

      const initialTimeoutSec =
        typeof activePrompt.timeoutSec === 'number' &&
        activePrompt.timeoutSec > 0
          ? Math.ceil(activePrompt.timeoutSec)
          : DICE_TIMEOUT

      setPromptTimerLeftSec(initialTimeoutSec)
    }, [activePrompt, isDiceTimerPromptOpen])

    useEffect(() => {
      if (!activePrompt || !isBuyPromptOpen) {
        setDismissedBuyPromptId(null)
      }
    }, [activePrompt, isBuyPromptOpen])

    useEffect(() => {
      if (
        !isDiceTimerPromptOpen ||
        promptTimerLeftSec === null ||
        promptTimerLeftSec <= 0
      ) {
        return
      }

      const timer = window.setTimeout(() => {
        setPromptTimerLeftSec((prev) => {
          if (prev === null || prev <= 0) {
            return 0
          }

          return prev - 1
        })
      }, 1000)

      return () => {
        window.clearTimeout(timer)
      }
    }, [isDiceTimerPromptOpen, promptTimerLeftSec])

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
      variant: 'EVENT',
    })
    const [travelModal, setTravelModal] = useState<TravelModalState>({
      open: false,
    })
    const [travelSelection, setTravelSelection] = useState(
      INITIAL_TRAVEL_SELECTION_STATE
    )

    useEffect(() => {
      if (isTravelPromptOpen && !travelModal.open && !travelSelection.active) {
        setTravelModal({ open: true })
      }
    }, [isTravelPromptOpen, travelModal.open, travelSelection.active])

    const [tollModal, setTollModal] = useState<TollModalState>({
      open: false,
      tileId: null,
      ownerName: '',
      tollText: '',
    })
    const [cityAcquisitionModal, setCityAcquisitionModal] =
      useState<CityAcquisitionModalState>(INITIAL_CITY_ACQUISITION_MODAL_STATE)
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
    const [goToIslandModal, setGoToIslandModal] =
      useState<GoToIslandModalState>({
        open: false,
      })
    const [islandModal, setIslandModal] = useState<IslandModalState>({
      open: false,
    })

    useEffect(() => {
      const shouldOpenGameResultModal = isGameOver || gameResult != null
      if (shouldOpenGameResultModal) {
        setGameResultModal((prev) => (prev.open ? prev : { open: true }))
        return
      }

      setGameResultModal({ open: false })
    }, [gameResult, isGameOver])

    const getPlayerResults = useCallback(() => {
      const results = players.map((player, index) => {
        let propertyValue = 0
        let cityCount = 0

        Object.entries(tileOwners).forEach(([tileId, owner]) => {
          if (String(owner.ownerId) !== String(player.id)) {
            return
          }

          const tile = TILES[Number(tileId)]
          propertyValue += tile?.price ?? 0
          cityCount++
        })

        const isBankrupt =
          player.state === 'bankrupt' || player.money <= 0 || false

        return {
          id: String(player.id),
          nickname: player.name || `Player ${index + 1}`,
          money: player.money,
          totalAsset: player.money + propertyValue,
          ownedCityCount: cityCount,
          isBankrupt,
        }
      })

      return results.sort((left, right) => {
        if (left.isBankrupt && !right.isBankrupt) {
          return 1
        }
        if (!left.isBankrupt && right.isBankrupt) {
          return -1
        }
        return right.totalAsset - left.totalAsset
      })
    }, [players, tileOwners])
    const fallbackPlayerResults = useMemo(
      () => getPlayerResults(),
      [getPlayerResults]
    )
    const serverResultRows = useMemo(() => {
      const rankings = gameResult?.rankings
      if (!rankings || rankings.length === 0) {
        return []
      }

      return [...rankings].sort((left, right) => left.rank - right.rank)
    }, [gameResult])
    const resultModalRows = useMemo(() => {
      if (serverResultRows.length > 0) {
        return serverResultRows.map((result) => ({
          id: String(result.player_id),
          nickname: result.nickname,
          totalAssetText: formatWon(result.final_assets),
          ownedCityCountText: '-',
        }))
      }

      return fallbackPlayerResults.map((result) => ({
        id: result.id,
        nickname: result.nickname,
        totalAssetText: formatWon(result.totalAsset),
        ownedCityCountText: `${result.ownedCityCount}개`,
      }))
    }, [fallbackPlayerResults, serverResultRows])
    const resultModalWinnerName = useMemo(() => {
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

      return (
        fallbackPlayerResults.find((result) => !result.isBankrupt)?.nickname ??
        '승리자'
      )
    }, [fallbackPlayerResults, serverResultRows, winnerId])

    function handleBankruptConfirm() {
      const { onDoneCallback } = bankruptModal
      setBankruptModal({ open: false, playerIdx: -1, playerName: '' })
      onDoneCallback?.()
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

      const playerIdx = curPlayerRef.current
      const player = playersRef.current[playerIdx]
      if (!player) return

      const islandTile = TILES.find((t) => t.type === 'ISLAND')
      if (islandTile) {
        // 무인도 이동 칸(24)에서 무인도(8)까지 전진 애니메이션
        // (24 -> 25 -> ... -> 31 -> 0 -> ... -> 8)
        await movePlayerSequentially(
          player.id,
          player.pos === islandTile.id ? 24 : player.pos,
          islandTile.id
        )

        const updatedPlayers = [...playersRef.current]
        updatedPlayers[playerIdx] = {
          ...updatedPlayers[playerIdx],
          pos: islandTile.id,
          skipTurns: 3,
        }
        playersRef.current = updatedPlayers
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
      setInsufficientFundsModal(INITIAL_INSUFFICIENT_FUNDS_MODAL_STATE)

      submitPromptChoice(promptChoiceValue ?? null)
    }

    function handleDiceTimerConfirm() {
      if (
        isDiceTimerPromptOpen &&
        submitPromptChoice(promptTimerConfirmChoiceValue)
      ) {
        return
      }

      const hasUnderlyingModal =
        buyModal.open ||
        buildModal.open ||
        cardModal.open ||
        travelModal.open ||
        tollModal.open ||
        cityAcquisitionModal.open ||
        citySellModal.open ||
        insufficientFundsModal.open ||
        aiModal.open ||
        goToIslandModal.open

      if (hasUnderlyingModal) {
        return
      }

      advanceTurn()
    }

    function handleCityAcquisitionCancel() {
      setCityAcquisitionModal(INITIAL_CITY_ACQUISITION_MODAL_STATE)

      submitPromptChoice(promptAcquisitionCancelChoiceValue)
    }

    function handleCityAcquisitionConfirm() {
      stopLongSfx()
      const activePlayerIdx = curPlayerRef.current
      const activePlayerMoney = playersRef.current[activePlayerIdx]?.money ?? 0
      const requiredAcquisitionCost =
        promptAcquisitionCost ??
        (promptTileId != null ? (TILES[promptTileId]?.price ?? 0) : 0)

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

    function handleCardConfirm() {
      stopLongSfx()
      const { onDoneCallback } = cardModal
      setCardModal((prev) => ({ ...prev, open: false }))
      onDoneCallback?.()
    }

    function handleTravelConfirm() {
      const { onDoneCallback } = travelModal
      setTravelModal({ open: false })
      setTravelSelection({
        active: true,
        onDoneCallback,
      })
      setStatus('국내여행: 이동할 칸을 클릭하세요.')
    }

    function handleTravelCancel() {
      setTravelModal({ open: false })
      submitPromptChoice(promptTravelCancelChoiceValue ?? 'SKIP')
    }

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

      if (hasTravelPromptContext) {
        const submitted = submitPromptChoice('CONFIRM', undefined, {
          targetTileId: tileId,
        })

        if (!submitted) {
          return
        }

        setTravelSelection(INITIAL_TRAVEL_SELECTION_STATE)
        setStatus('서버 선택 요청을 기다리는 중...')
        return
      }
      const updatedPlayers = [...playersRef.current]
      updatedPlayers[playerIdx] = {
        ...currentPlayer,
        pos: tileId,
      }
      playersRef.current = updatedPlayers
      setTravelSelection(INITIAL_TRAVEL_SELECTION_STATE)

      if (!isMockMode) {
        setStatus('서버 선택 요청을 처리할 수 없는 상태입니다.')
        return
      }

      const destinationName =
        TILES[tileId]?.name.replace('\n', ' ') || '선택 칸'
      setStatus(
        `${currentPlayer.name}님이 ${destinationName} 칸으로 이동합니다.`
      )

      // ✈️ 국내여행 이동 소리 재생
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
      const tile = TILES[tileId]

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
        setStatus('서버 선택 요청을 기다리는 중...')
        onDone?.()
        return
      }

      if (tile.type === 'TRAVEL') {
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

    const byTile = useMemo(() => {
      const map: Record<number, PlayerState[]> = {}
      players.forEach((p) => {
        if (p.state === 'bankrupt' || p.money <= 0) return
        const pos =
          animatedPositions[String(p.id)] !== undefined
            ? animatedPositions[String(p.id)]
            : p.pos
        if (!map[pos]) map[pos] = []
        map[pos].push(p)
      })
      return map
    }, [players, animatedPositions])

    const CS = CORNER_SIZE
    const SS = STRAIGHT_SIZE
    const GAP = GRID_GAP

    const buyTile = promptTile
    const buyModalOpen = isBuyPromptOpen
    const buildTile = promptTile
    const buildModalOpen = isBuildPromptOpen
    const currentLevel = promptCurrentLevel
    const buildTargetLevel = promptNextLevel
    const tollTile = promptTile
    const tollModalOpen = isTollPromptOpen
    const tollOwnerName = promptOwnerName
    const tollAmountText = formatWon(promptAmount ?? 0)
    const sellModalOpen = isSellPromptOpen || citySellModal.open
    const sellTileId = isSellPromptOpen ? promptTileId : citySellModal.tileId
    const sellTile = sellTileId != null ? TILES[sellTileId] : null
    const sellOwnerName = isSellPromptOpen
      ? promptSellerName
      : citySellModal.ownerName
    const sellCurrentLevel = isSellPromptOpen
      ? promptCurrentLevel
      : citySellModal.currentLevel
    const sellPrice = isSellPromptOpen
      ? (promptSellPrice ??
        (sellTileId != null
          ? getBoardSellFallbackRefund(sellTileId, promptCurrentLevel)
          : (sellTile?.price ?? 0)))
      : citySellModal.sellPrice ||
        (sellTileId != null
          ? getBoardSellFallbackRefund(sellTileId, sellCurrentLevel)
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

    const scaledBoardSize = BOARD_RENDER_BASE_SIZE * boardScale
    const diceTimerModalOpen = !suppressDiceTimerModal && isDiceTimerPromptOpen
    const hasAnimationBlocking = isAnimatingRef.current || rolling
    const canShowModal = !hasAnimationBlocking

    const buyModalVisible =
      canShowModal &&
      buyModalOpen &&
      !isBuyPromptDismissed &&
      !insufficientFundsModal.open
    const buildModalVisible =
      canShowModal && buildModalOpen && !insufficientFundsModal.open
    const acquisitionModalOpen =
      canShowModal &&
      acquisitionModalOpenRaw &&
      !tollModalOpen &&
      !insufficientFundsModal.open

    const activePlayerMoney = players[curPlayer]?.money ?? 0
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

    const diceTimerTitle = activePrompt?.title
    const diceTimerMessage = activePrompt?.message
    const diceTimerConfirmLabel = getPromptChoiceLabel(
      activePrompt,
      promptTimerConfirmChoiceValue,
      '확인'
    )

    const hasBlockingModal =
      canShowModal &&
      (buyModalVisible ||
        buildModalVisible ||
        cardModal.open ||
        travelModal.open ||
        tollModalOpen ||
        acquisitionModalOpen ||
        sellModalOpen ||
        insufficientFundsModal.open ||
        aiModal.open ||
        goToIslandModal.open ||
        islandModal.open ||
        diceTimerModalOpen ||
        bankruptModal.open ||
        gameResultModal.open)
    const activePlayerId = players[curPlayer]?.id ?? null
    const isTravelSelectableTile = (tileId: number) =>
      travelSelection.active && tileId !== players[curPlayer]?.pos
    const isOwnedTileSellClickable = (tileId: number) => {
      if (travelSelection.active || hasBlockingModal) {
        return false
      }
      if (activePlayerId == null) {
        return false
      }

      const owner = tileOwners[tileId]
      if (!owner) {
        return false
      }

      // ⚠️ 실서버 모드에서는 내 땅만 매각 가능해야 함 (다른 사람 턴이어도 내 땅만)
      if (localPlayerId != null) {
        return String(owner.ownerId) === String(localPlayerId)
      }

      return String(owner.ownerId) === String(activePlayerId)
    }

    const isOwnedTileUpgradeClickable = (tileId: number) => {
      // 업그레이드는 본인 턴일 때만 가능
      const isMyTurn = String(players[curPlayer]?.id) === String(localPlayerId)
      if (!isMyTurn) return false

      const owner = tileOwners[tileId]
      if (!owner || String(owner.ownerId) !== String(localPlayerId)) {
        return false
      }

      // 이미 최대 레벨(7)이면 업그레이드 불가
      if (owner.level >= 7) return false

      return true
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

      const isMyTurn = String(players[curPlayer]?.id) === String(localPlayerId)

      // 본인 땅인 경우
      if (isOwnedTileSellClickable(tileId)) {
        if (isMyTurn && isOwnedTileUpgradeClickable(tileId)) {
          // 본인 턴이고 업그레이드 가능하면 바로 업그레이드 모달
          setCityBuildModal({ open: true, tileId })
        } else {
          // 본인 턴이 아니거나 이미 최대 레벨이면 바로 매각 모달
          handleTileSellClick(tileId)
        }
      }
    }

    const handleTileSellClick = (tileId: number) => {
      const owner = tileOwners[tileId]
      const ownerPlayer = players.find(
        (p) => String(p.id) === String(owner?.ownerId)
      )
      if (!owner || !ownerPlayer) return

      setCitySellModal({
        open: true,
        tileId,
        ownerName: ownerPlayer.name ?? '',
        currentLevel: owner.level,
        sellPrice: getBoardSellFallbackRefund(tileId, owner.level),
      })
    }

    const handleCityBuildConfirm = (tileId: number) => {
      setCityBuildModal(INITIAL_CITY_BUILD_MODAL_STATE)
      emitGameAction({
        type: 'CITY_BUILD',
        payload: {
          tileId,
        },
      })
    }

    const handleCityBuildCancel = () => {
      const tileId = cityBuildModal.tileId
      setCityBuildModal(INITIAL_CITY_BUILD_MODAL_STATE)

      if (tileId != null) {
        // 업그레이드 취소 시 매각 모달로 연결
        handleTileSellClick(tileId)
      }
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
                const isTravelSelectable = isTravelSelectableTile(id)
                const isOwnedSellClickable = isOwnedTileSellClickable(id)
                const isClickable = isTravelSelectable || isOwnedSellClickable
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
                      boxShadow: isTravelSelectable
                        ? '0 0 0 3px rgba(43,127,255,0.9)'
                        : undefined,
                      transition: 'box-shadow 0.2s ease',
                    }}
                  >
                    <BoardTile
                      tile={tilesWithServerPrice[id]}
                      dir={isCornerTile ? 'corner' : 'top'}
                      tileOwner={tileOwners[id]}
                      isUrgent={isTimerUrgent}
                      isActivePlayerTile={id === players[curPlayer]?.pos}
                    />
                  </div>
                )
              })()
            )}
            {BOTTOM_ROW.map((id, ci) =>
              (() => {
                const isCornerTile = ci === 0 || ci === 8
                const isTravelSelectable = isTravelSelectableTile(id)
                const isOwnedSellClickable = isOwnedTileSellClickable(id)
                const isClickable = isTravelSelectable || isOwnedSellClickable
                return (
                  <div
                    key={id}
                    onClick={
                      isClickable ? () => handleBoardTileClick(id) : undefined
                    }
                    style={{
                      gridRow: 9,
                      gridColumn: ci + 1,
                      cursor: isClickable ? 'pointer' : 'default',
                      borderRadius: isCornerTile ? 18 : 13,
                      boxShadow: isTravelSelectable
                        ? '0 0 0 3px rgba(43,127,255,0.9)'
                        : undefined,
                      transition: 'box-shadow 0.2s ease',
                    }}
                  >
                    <BoardTile
                      tile={tilesWithServerPrice[id]}
                      dir={isCornerTile ? 'corner' : 'bottom'}
                      tileOwner={tileOwners[id]}
                      isUrgent={isTimerUrgent}
                      isActivePlayerTile={id === players[curPlayer]?.pos}
                    />
                  </div>
                )
              })()
            )}
            {LEFT_COL.map((id, ri) =>
              (() => {
                const isTravelSelectable = isTravelSelectableTile(id)
                const isOwnedSellClickable = isOwnedTileSellClickable(id)
                const isClickable = isTravelSelectable || isOwnedSellClickable
                return (
                  <div
                    key={id}
                    onClick={
                      isClickable ? () => handleBoardTileClick(id) : undefined
                    }
                    style={{
                      gridRow: ri + 2,
                      gridColumn: 1,
                      cursor: isClickable ? 'pointer' : 'default',
                      borderRadius: 13,
                      boxShadow: isTravelSelectable
                        ? '0 0 0 3px rgba(43,127,255,0.9)'
                        : undefined,
                      transition: 'box-shadow 0.2s ease',
                    }}
                  >
                    <BoardTile
                      tile={tilesWithServerPrice[id]}
                      dir="left"
                      tileOwner={tileOwners[id]}
                      isUrgent={isTimerUrgent}
                      isActivePlayerTile={id === players[curPlayer]?.pos}
                    />
                  </div>
                )
              })()
            )}
            {RIGHT_COL.map((id, ri) =>
              (() => {
                const isTravelSelectable = isTravelSelectableTile(id)
                const isOwnedSellClickable = isOwnedTileSellClickable(id)
                const isClickable = isTravelSelectable || isOwnedSellClickable
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
                      boxShadow: isTravelSelectable
                        ? '0 0 0 3px rgba(43,127,255,0.9)'
                        : undefined,
                      transition: 'box-shadow 0.2s ease',
                    }}
                  >
                    <BoardTile
                      tile={tilesWithServerPrice[id]}
                      dir="right"
                      tileOwner={tileOwners[id]}
                      isUrgent={isTimerUrgent}
                      isActivePlayerTile={id === players[curPlayer]?.pos}
                    />
                  </div>
                )
              })()
            )}

            {/* ─── 플레이어 토큰 레이어 (중앙 집중 렌더링) ──────────────── */}
            {Object.entries(byTile).map(([tileIdStr, tokens]) => {
              const tileId = parseInt(tileIdStr, 10)
              const { row, col } = getTileGridPos(tileId)
              const hasStrip = ![
                'START',
                'ISLAND',
                'MOVE_TO_ISLAND',
                'TRAVEL',
                'CHANCE',
                'EVENT',
              ].includes(TILES[tileId].type)

              return (
                <div
                  key={`tokens-at-${tileId}`}
                  style={{
                    gridRow: row,
                    gridColumn: col,
                    position: 'relative',
                    pointerEvents: 'none', // 토큰이 타일 클릭을 방해하지 않도록
                    zIndex: 100,
                  }}
                >
                  {tokens.map((p) => (
                    <PlayerToken
                      key={p.id}
                      player={p}
                      stripOffset={hasStrip ? 7 : 0}
                    />
                  ))}
                </div>
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
            if (buildTargetLevel <= 3) {
              new Audio('/audio/house-buy.mp3').play().catch(() => {})
            } else if (buildTargetLevel <= 6) {
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
          open={canShowModal && tollModalOpen}
          onConfirm={() => {
            void handleTollModalConfirm()
          }}
          cityName={promptTileName || tollTile?.name || ''}
          ownerName={tollOwnerName}
          tollText={tollAmountText}
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
          open={canShowModal && sellModalOpen}
          ownerName={sellOwnerName}
          currentLevel={sellCurrentLevel}
          sellPriceText={formatWon(sellPrice)}
          onCancel={handleCitySellCancel}
          onSell={() => {
            void handleCitySellConfirm()
          }}
        />
        <CardModal
          open={canShowModal && cardModal.open}
          variant={cardModal.variant}
          onConfirm={handleCardConfirm}
        />
        <TravelModal
          open={canShowModal && travelModal.open}
          onConfirm={handleTravelConfirm}
          onCancel={handleTravelCancel}
          showCancel={isTravelPromptOpen && !!promptTravelCancelChoiceValue}
        />
        <BankruptModal
          open={canShowModal && bankruptModal.open}
          playerName={bankruptModal.playerName}
          onConfirm={handleBankruptConfirm}
        />
        <DiceTimerModal
          open={canShowModal && diceTimerModalOpen}
          title={diceTimerTitle}
          description={diceTimerMessage}
          timeLeftSec={
            isDiceTimerPromptOpen
              ? (promptTimerLeftSec ??
                (typeof activePrompt?.timeoutSec === 'number'
                  ? activePrompt.timeoutSec
                  : DICE_TIMEOUT))
              : null
          }
          confirmLabel={diceTimerConfirmLabel}
          isSubmitting={
            promptSubmittingChoice !== null && isDiceTimerPromptOpen
          }
          onConfirm={handleDiceTimerConfirm}
        />
        <GameResultModal
          open={canShowModal && gameResultModal.open}
          winnerName={resultModalWinnerName}
          results={resultModalRows}
          onBackToLobby={() => {
            setGameResultModal({ open: false })
            window.location.href = '/' // Redirect to home/lobby
          }}
        />
        <GoToIslandModal
          open={canShowModal && goToIslandModal.open}
          onConfirm={handleGoToIslandConfirm}
        />
        {/* 🏝️ 무인도 (직접 도착) 팝업 */}
        <IslandModal
          open={canShowModal && islandModal.open}
          onConfirm={handleIslandConfirm}
        />
        {/* 수동 건설 모달 (상시 클릭용) */}
        {cityBuildModal.open && cityBuildModal.tileId != null && (
          <BuildModal
            open={true}
            cityName={
              TILES[cityBuildModal.tileId]?.name.replace('\n', ' ') || ''
            }
            nextLevel={
              ((tileOwners[cityBuildModal.tileId]?.level || 0) +
                1) as BuildingLevel
            }
            nextLevelLabel={
              LEVEL_LABELS[
                (tileOwners[cityBuildModal.tileId]?.level || 0) + 1
              ] || ''
            }
            buildCostText={formatWon(
              getBuildCost(
                TILES[cityBuildModal.tileId]?.price || 0,
                (tileOwners[cityBuildModal.tileId]?.level || 0) as BuildingLevel
              )
            )}
            nextTollText={formatWon(
              getTollCost(
                TILES[cityBuildModal.tileId]?.price || 0,
                ((tileOwners[cityBuildModal.tileId]?.level || 0) +
                  1) as BuildingLevel
              )
            )}
            onConfirm={() => handleCityBuildConfirm(cityBuildModal.tileId!)}
            onCancel={handleCityBuildCancel}
          />
        )}
      </div>
    )
  }
)

GameBoard.displayName = 'GameBoard'

export default GameBoard
