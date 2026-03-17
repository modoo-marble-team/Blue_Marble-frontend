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
import TravelModal from '../game/modals/TravelModal'
import CityAcquisitionModal from '../game/modals/CityAcquisitionModals'
import CitySellModal from '../game/modals/CitySellModal'
import InsufficientFundsModal from '../game/modals/InsufficientFundsModal'
import TollModal from '../game/modals/TollModal'
import AIPenaltyModal from '../game/modals/AIPenaltyModal'
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
} from './board.constants'

import { getBoardSellFallbackRefund } from './gameBoardActionUtils'
import { useBoardEventQueue } from './useBoardEventQueue'
import {
  getBoardEventAnimationHoldMs,
  type BoardEventAnimationKind,
} from './gameBoardEventQueueUtils'
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
import type { GamePrompt } from '../../types/domain'
import { playLongSfx, stopLongSfx } from '../../lib/bgm'

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
  onPromptChoice?: (choice: string) => void
  tiles?: Array<{
    index: number
    owner_id?: string | number | null
    building: number
    level?: number
  }>
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
      players,
      curPlayer,
      suppressDiceTimerModal = false,
      activePrompt = null,
      promptSubmittingChoice = null,
      onPromptChoice,
      tiles = [],
    },
    ref
  ) => {
    const [localTimeLeft, setLocalTimeLeft] = useState(DICE_TIMEOUT)
    const [showTimerModal, setShowTimerModal] = useState(false)
    const [promptTimerLeftSec, setPromptTimerLeftSec] = useState<number | null>(
      null
    )
    const [dice1, setDice1] = useState(1)
    const [dice2, setDice2] = useState(1)
    const rolling = false
    const [status, setStatus] = useState(GAME_START_STATUS)
    const [eventFxKind, setEventFxKind] =
      useState<BoardEventAnimationKind>('none')
    const boardPageRef = useRef<HTMLDivElement | null>(null)
    const boardStatusRef = useRef<HTMLDivElement | null>(null)
    const [boardScale, setBoardScale] = useState(1)

    const curPlayerRef = useRef(curPlayer)
    const playersRef = useRef<PlayerState[]>(players)
    curPlayerRef.current = curPlayer
    playersRef.current = players

    useBoardEventQueue({
      enabled: true,
      playersRef,
      setStatus,
      setDice1,
      setDice2,
      onEventAnimation: setEventFxKind,
    })
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
    const tileOwnersRef = useRef<Record<number, TileOwner>>(tileOwners)
    const promptModalKind = resolvePromptModalKind(activePrompt)
    const isBuyPromptOpen = promptModalKind === 'buy'
    const isBuildPromptOpen = promptModalKind === 'build'
    const isTollPromptOpen = promptModalKind === 'toll'
    const isSellPromptOpen = promptModalKind === 'sell'
    const isAcquisitionPromptOpen = promptModalKind === 'acquisition'
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
    const promptTimerConfirmChoiceValue = resolvePromptChoiceValue(
      activePrompt,
      'timerConfirm'
    )

    const submitPromptChoice = (
      choiceValue: string | null,
      onSuccess?: () => void
    ) => {
      if (!choiceValue || !onPromptChoice || promptSubmittingChoice !== null) {
        return false
      }

      onPromptChoice(choiceValue)
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
      setLocalTimeLeft(DICE_TIMEOUT)
      setShowTimerModal(false)
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
        setLocalTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer) // Stop once triggered
            return 0
          }
          return prev - 1
        })
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

    function getPlayerResults() {
      const results = playersRef.current.map((player, index) => {
        let propertyValue = 0
        let cityCount = 0

        Object.entries(tileOwnersRef.current).forEach(([tileId, owner]) => {
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
    }

    function handleBankruptConfirm() {
      const { onDoneCallback } = bankruptModal
      setBankruptModal({ open: false, playerIdx: -1, playerName: '' })
      onDoneCallback?.()
    }

    function advanceTurn(onDone?: () => void) {
      onDone?.()
    }

    async function handleAITile(onDone?: () => void) {
      setAiModal({ open: true, status: 'loading', onDoneCallback: onDone })

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
      onDone?.()
    }

    useImperativeHandle(ref, () => ({
      rollDice: (onDone) => {
        rollDice(onDone)
      },
    }))

    function handleGoToIslandConfirm() {
      stopLongSfx()
      const { onDoneCallback } = goToIslandModal
      setGoToIslandModal({ open: false })

      const playerIdx = curPlayerRef.current
      const updatedPlayers = [...playersRef.current]
      const islandTile = TILES.find((t) => t.type === 'ISLAND')
      if (islandTile) {
        updatedPlayers[playerIdx] = {
          ...updatedPlayers[playerIdx],
          pos: islandTile.id,
          skipTurns: 3,
        }
        playersRef.current = updatedPlayers
      }
      advanceTurn(onDoneCallback)
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

    function handleCitySellCancel() {
      submitPromptChoice(promptSellCancelChoiceValue)
    }

    async function handleCitySellConfirm() {
      stopLongSfx()
      // 💰 매각 처리 (거래) 소리 재생
      new Audio('/audio/transaction.mp3').play().catch(() => {})
      submitPromptChoice(promptSellConfirmChoiceValue)
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

      setShowTimerModal(false)

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
      const updatedPlayers = [...playersRef.current]
      updatedPlayers[playerIdx] = {
        ...currentPlayer,
        pos: tileId,
      }
      playersRef.current = updatedPlayers
      setTravelSelection(INITIAL_TRAVEL_SELECTION_STATE)

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

    function handleArrival(tileId: number, onDone?: () => void) {
      const tile = TILES[tileId]

      if (tile.type === 'START') {
        setStatus('시작 칸에 도착!')
        advanceTurn(onDone)
        return
      }

      if (tile.type === 'MOVE_TO_ISLAND') {
        setStatus('무인도로 이동!')
        setGoToIslandModal({ open: true, onDoneCallback: onDone })
        // 🏝️ 무인도 칸 도착 소리 재생
        new Audio('/audio/island-trap.mp3').play().catch(() => {})
        return
      }

      if (tile.type === 'ISLAND') {
        setStatus('무인도 칸에 도착!')
        // 🏝️ 무인도(직접 도착) 칸 소리 재생
        new Audio('/audio/island-trap.mp3').play().catch(() => {})

        setIslandModal({ open: true, onDoneCallback: onDone })
        return
      }

      if (tile.type === 'PROPERTY') {
        setStatus('서버 선택 요청을 기다리는 중...')
        onDone?.()
        return
      }

      if (tile.type === 'TRAVEL') {
        setTravelModal({
          open: true,
          onDoneCallback: onDone,
        })
        return
      }

      if (
        tile.type === 'AI' ||
        (tile.type === 'EVENT' && tile.emoji === '🤖')
      ) {
        // 🤖 AI 칸 도착 소리 재생
        playLongSfx('/audio/AI.mp3')

        handleAITile(onDone)
        return
      }

      if (tile.type === 'CHANCE' || tile.type === 'EVENT') {
        setCardModal({
          open: true,
          variant: tile.type === 'CHANCE' ? 'CHANCE' : 'EVENT',
          onDoneCallback: onDone,
        })

        // 🃏 찬스/강화 이벤트 소리 재생
        if (tile.type === 'CHANCE') {
          new Audio('/audio/chance.mp3').play().catch(() => {})
        } else {
          new Audio('/audio/event.mp3').play().catch(() => {})
        }
        return
      }

      advanceTurn(onDone)
    }

    const byTile: Record<number, PlayerState[]> = {}
    players.forEach((p) => {
      if (p.state === 'bankrupt' || p.money <= 0) return
      if (!byTile[p.pos]) byTile[p.pos] = []
      byTile[p.pos].push(p)
    })

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
    const sellTile = promptTile
    const sellModalOpen = isSellPromptOpen
    const sellOwnerName = promptSellerName
    const sellCurrentLevel = promptCurrentLevel
    const sellPrice =
      promptSellPrice ??
      (promptTileId != null
        ? getBoardSellFallbackRefund(promptTileId, promptCurrentLevel)
        : (sellTile?.price ?? 0))
    const acquisitionTile = promptTile
    const acquisitionModalOpenRaw = isAcquisitionPromptOpen
    const acquisitionModalOpen =
      acquisitionModalOpenRaw && !tollModalOpen && !insufficientFundsModal.open
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
    const buyModalVisible =
      buyModalOpen && !isBuyPromptDismissed && !insufficientFundsModal.open
    const buildModalVisible = buildModalOpen && !insufficientFundsModal.open
    const activePlayerMoney = players[curPlayer]?.money ?? 0
    const buildCost =
      getPromptPayloadNumber(activePrompt, [
        'buildCost',
        'build_cost',
        'cost',
        'price',
      ]) ?? getUpgradeCost(buildTile?.price ?? 0, currentLevel as BuildingLevel)
    const nextTollCost =
      getPromptPayloadNumber(activePrompt, [
        'nextToll',
        'next_toll',
        'toll',
        'toll_amount',
        'amount',
      ]) ?? calcToll(buildTile?.price ?? 0, (currentLevel + 1) as BuildingLevel)
    const diceTimerTitle = activePrompt?.title
    const diceTimerMessage = activePrompt?.message
    const diceTimerConfirmLabel = getPromptChoiceLabel(
      activePrompt,
      promptTimerConfirmChoiceValue,
      '확인'
    )
    const scaledBoardSize = BOARD_RENDER_BASE_SIZE * boardScale
    const diceTimerModalOpen =
      !suppressDiceTimerModal && (showTimerModal || isDiceTimerPromptOpen)
    const isTravelSelectableTile = (tileId: number) =>
      travelSelection.active && tileId !== players[curPlayer]?.pos
    const isOwnedTileSellClickable = () => false
    const handleBoardTileClick = (tileId: number) => {
      if (travelSelection.active) {
        if (tileId !== players[curPlayer]?.pos) {
          handleTravelDestinationSelect(tileId)
        }
      }
    }

    return (
      <div
        className="board-page"
        ref={boardPageRef}
        style={{ width: '100%', height: '100%' }}
      >
        <div
          className={
            eventFxKind === 'none'
              ? 'board-status'
              : `board-status board-status--${eventFxKind}`
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
                const isOwnedSellClickable = isOwnedTileSellClickable()
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
                      tile={TILES[id]}
                      dir={isCornerTile ? 'corner' : 'top'}
                      tokens={byTile[id] ?? []}
                      tileOwner={tileOwners[id]}
                      timeLeft={localTimeLeft}
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
                const isOwnedSellClickable = isOwnedTileSellClickable()
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
                      tile={TILES[id]}
                      dir={isCornerTile ? 'corner' : 'bottom'}
                      tokens={byTile[id] ?? []}
                      tileOwner={tileOwners[id]}
                      timeLeft={localTimeLeft}
                      isActivePlayerTile={id === players[curPlayer]?.pos}
                    />
                  </div>
                )
              })()
            )}
            {LEFT_COL.map((id, ri) =>
              (() => {
                const isTravelSelectable = isTravelSelectableTile(id)
                const isOwnedSellClickable = isOwnedTileSellClickable()
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
                      tile={TILES[id]}
                      dir="left"
                      tokens={byTile[id] ?? []}
                      tileOwner={tileOwners[id]}
                      timeLeft={localTimeLeft}
                      isActivePlayerTile={id === players[curPlayer]?.pos}
                    />
                  </div>
                )
              })()
            )}
            {RIGHT_COL.map((id, ri) =>
              (() => {
                const isTravelSelectable = isTravelSelectableTile(id)
                const isOwnedSellClickable = isOwnedTileSellClickable()
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
                      tile={TILES[id]}
                      dir="right"
                      tokens={byTile[id] ?? []}
                      tileOwner={tileOwners[id]}
                      timeLeft={localTimeLeft}
                      isActivePlayerTile={id === players[curPlayer]?.pos}
                    />
                  </div>
                )
              })()
            )}

            <div
              className={
                eventFxKind === 'none'
                  ? 'board-center'
                  : `board-center board-center--${eventFxKind}`
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
          open={tollModalOpen}
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
          open={sellModalOpen}
          ownerName={sellOwnerName}
          currentLevel={sellCurrentLevel}
          sellPriceText={formatWon(sellPrice)}
          onCancel={handleCitySellCancel}
          onSell={() => {
            void handleCitySellConfirm()
          }}
        />
        <CardModal
          open={cardModal.open}
          variant={cardModal.variant}
          onConfirm={handleCardConfirm}
        />
        <TravelModal open={travelModal.open} onConfirm={handleTravelConfirm} />
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
          open={diceTimerModalOpen}
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
          open={gameResultModal.open}
          winnerName={
            getPlayerResults().find((r) => !r.isBankrupt)?.nickname ?? '승리자'
          }
          results={getPlayerResults().map((r) => ({
            id: r.id,
            nickname: r.nickname,
            totalAssetText: formatWon(r.totalAsset),
            ownedCityCountText: `${r.ownedCityCount}개`,
          }))}
          onBackToLobby={() => {
            setGameResultModal({ open: false })
            window.location.href = '/' // Redirect to home/lobby
          }}
        />
        <GoToIslandModal
          open={goToIslandModal.open}
          onConfirm={handleGoToIslandConfirm}
        />
        {/* 🏝️ 무인도 (직접 도착) 팝업 */}
        <IslandModal open={islandModal.open} onConfirm={handleIslandConfirm} />
      </div>
    )
  }
)

GameBoard.displayName = 'GameBoard'

export default GameBoard
