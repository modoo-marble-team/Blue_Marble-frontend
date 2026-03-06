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
import CityAcquisitionModal from '../game/modals/CityAcquisitionModals'
import CitySellModal from '../game/modals/CitySellModal'
import InsufficientFundsModal from '../game/modals/InsufficientFundsModal'
import TollModal from '../game/modals/TollModal'
import AIPenaltyModal from '../game/modals/AIPenaltyModal'
import BankruptModal from '../game/modals/BankruptModal'
import DiceTimerModal from '../game/modals/DiceTimerModal'
import GameResultModal from '../game/modals/GameResultModal'
import GoToIslandModal from '../game/modals/GoToIslandModal'
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
import { getBoardSellFallbackRefund } from './gameBoardActionUtils'
import type {
  AIPenaltyModalState,
  BankruptModalState,
  BuildModalState,
  BuyModalState,
  CardModalState,
  CityAcquisitionModalState,
  CitySellModalState,
  InsufficientFundsModalState,
  TollModalState,
  GameResultModalState,
  GoToIslandModalState,
} from './gameBoard.types'
import '../../styles/board.css'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { formatWon } from '../../lib/utils'
import type { GamePrompt } from '../../types/domain'

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
}

const INITIAL_INSUFFICIENT_FUNDS_MODAL_STATE: InsufficientFundsModalState = {
  open: false,
  buildingLevel: 0,
  onDoneCallback: undefined,
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
  activePrompt?: GamePrompt | null
  promptSubmittingChoice?: string | null
  onPromptChoice?: (choice: string) => void
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
      roomId = null,
      players,
      curPlayer,
      activePrompt = null,
      promptSubmittingChoice = null,
      onPromptChoice,
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
    const [promptTimerLeftSec, setPromptTimerLeftSec] = useState<number | null>(
      null
    )
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
    const promptModalKind = resolvePromptModalKind(activePrompt)
    const isBuyPromptOpen = promptModalKind === 'buy'
    const isBuildPromptOpen = promptModalKind === 'build'
    const isTollPromptOpen = promptModalKind === 'toll'
    const isSellPromptOpen = promptModalKind === 'sell'
    const isAcquisitionPromptOpen = promptModalKind === 'acquisition'
    const isDiceTimerPromptOpen = promptModalKind === 'dice_timer'

    const promptTileId = getPromptPayloadNumber(activePrompt, [
      'tileId',
      'targetTileId',
      'toTileId',
    ])
    const promptTile = promptTileId != null ? TILES[promptTileId] : null
    const promptOwnerId = getPromptPayloadNumber(activePrompt, [
      'ownerId',
      'toPlayerId',
    ])
    const promptOwnerNameFromPayload = getPromptPayloadString(activePrompt, [
      'ownerName',
      'ownerNickname',
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
        'sellerNickname',
        'playerName',
        'ownerName',
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
      'price',
    ])
    const promptAcquisitionCost = getPromptPayloadNumber(activePrompt, [
      'acquisitionCost',
      'buyoutCost',
      'purchaseCost',
      'cost',
      'price',
    ])
    const promptSellPrice = getPromptPayloadNumber(activePrompt, [
      'sellPrice',
      'refund',
      'amount',
      'price',
    ])
    const promptTileName =
      getPromptPayloadString(activePrompt, ['tileName', 'cityName']) ??
      promptTile?.name ??
      ''
    const promptCurrentLevelFromPayload = getPromptPayloadNumber(activePrompt, [
      'buildingLevel',
      'currentLevel',
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
      setOptimisticTileOwners(null)
      tileOwnersRef.current = derivedTileOwners
    }, [derivedTileOwners])

    // 타이머 관리
    useEffect(() => {
      setLocalTimeLeft(DICE_TIMEOUT)
      setShowTimerModal(false)
      setPromptTimerLeftSec(null)

      // Close all other modals when turn changes
      setBuyModal({ open: false, tileId: null })
      setBuildModal({ open: false, tileId: null })
      setCardModal({ open: false, variant: 'EVENT' })
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
            if (USE_GAME_SOCKET_MOCK && !isDiceTimerPromptOpen) {
              setShowTimerModal(true)
            }
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
      variant: 'EVENT',
    })
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
      sellOwnedTileForPlayer,
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
      setBuyModal,
      setBuildModal,
      setTollModal,
      curPlayerRef,
      tileOwnersRef,
      getPlayerIdByIndex,
      getPlayerColorByIndex,
      getPlayerIndexById,
      getPurchaseCost: (id) => TILES[id]?.price ?? 0,
      getUpgradeCost,
      calcToll,
      getTilePrice: (tileId) => TILES[tileId]?.price ?? 0,
      updateTileOwners,
      applyMoney,
      advanceTurn,
      onTollResolved: ({ tileId, ownerLevel, ownerName, onDoneCallback }) => {
        if (ownerLevel >= 7) {
          return false
        }

        const acquisitionCost = TILES[tileId]?.price ?? 0
        setCityAcquisitionModal({
          open: true,
          tileId,
          ownerName,
          currentLevel: ownerLevel,
          acquisitionCost,
          onDoneCallback,
        })
        return true
      },
    })

    function getPlayerResults() {
      const allPlayers = playersRef.current
      const owners = tileOwnersRef.current

      const results = allPlayers.map((p, idx) => {
        let propertyValue = 0
        let cityCount = 0
        Object.entries(owners).forEach(([tileId, owner]) => {
          if (String(owner.ownerId) === String(p.id)) {
            const tile = TILES[Number(tileId)]
            propertyValue += tile.price ?? 0
            cityCount++
          }
        })

        return {
          id: String(p.id),
          nickname: p.name || `Player ${idx + 1}`,
          money: p.money,
          totalAsset: p.money + propertyValue,
          ownedCityCount: cityCount,
          isBankrupt: bankruptSetRef.current.has(idx),
        }
      })

      // Sort by total asset descending
      return results.sort((a, b) => {
        if (a.isBankrupt && !b.isBankrupt) return 1
        if (!a.isBankrupt && b.isBankrupt) return -1
        return b.totalAsset - a.totalAsset
      })
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

      if (onBankrupt) {
        onBankrupt(playerIdx)
      } else {
        syncMockStoreBankrupt(playerIdx)
      }

      // Check for Game Over: Only one player not bankrupt
      const playerCount = playersRef.current.length || INIT_PLAYERS.length
      const remainingPlayers = []
      for (let i = 0; i < playerCount; i++) {
        if (!bankruptSetRef.current.has(i)) {
          remainingPlayers.push(i)
        }
      }

      if (remainingPlayers.length <= 1) {
        setGameResultModal({ open: true })
        return // Stop the game
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

    function handleGoToIslandConfirm() {
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
        publishPlayers(updatedPlayers)
      }
      advanceTurn(onDoneCallback)
    }

    async function handleTollModalConfirm() {
      if (!useLocalPromptFallback) {
        submitPromptChoice(promptTollConfirmChoiceValue)
        return
      }

      await handleTollConfirm(tollModal)
    }

    function openCitySellModalForOwnedTile(
      tileId: number,
      onDoneCallback?: () => void
    ) {
      const owner = tileOwnersRef.current[tileId]
      const activePlayerIdx = curPlayerRef.current
      const activePlayerId = getPlayerIdByIndex(activePlayerIdx)
      const activePlayer = playersRef.current[activePlayerIdx]

      if (!owner || owner.ownerId !== activePlayerId || !activePlayer) {
        return false
      }

      setBuildModal({ open: false, tileId: null })
      setCitySellModal({
        open: true,
        tileId,
        ownerName: activePlayer.name,
        currentLevel: owner.level,
        sellPrice: getBoardSellFallbackRefund(tileId, owner.level),
        onDoneCallback,
      })
      return true
    }

    function handleCitySellCancel() {
      if (!useLocalPromptFallback) {
        submitPromptChoice(promptSellCancelChoiceValue)
        return
      }

      const { tileId, onDoneCallback } = citySellModal
      setCitySellModal(INITIAL_CITY_SELL_MODAL_STATE)

      if (tileId !== null) {
        setBuildModal({
          open: true,
          tileId,
          onDoneCallback,
        })
        return
      }

      advanceTurn(onDoneCallback)
    }

    async function handleCitySellConfirm() {
      if (!useLocalPromptFallback) {
        submitPromptChoice(promptSellConfirmChoiceValue)
        return
      }

      const activePlayerIdx = curPlayerRef.current
      const { tileId, onDoneCallback } = citySellModal
      setCitySellModal(INITIAL_CITY_SELL_MODAL_STATE)

      if (tileId === null) {
        advanceTurn(onDoneCallback)
        return
      }

      const sold = await sellOwnedTileForPlayer(activePlayerIdx, { tileId })
      if (!sold) {
        setBuildModal({
          open: true,
          tileId,
          onDoneCallback,
        })
        return
      }

      advanceTurn(onDoneCallback)
    }

    function handleInsufficientFundsConfirm() {
      const { onDoneCallback } = insufficientFundsModal
      setInsufficientFundsModal(INITIAL_INSUFFICIENT_FUNDS_MODAL_STATE)

      if (useLocalPromptFallback) {
        advanceTurn(onDoneCallback)
        return
      }

      submitPromptChoice(promptBuyPassChoiceValue)
    }

    function handleDiceTimerConfirm() {
      if (
        isDiceTimerPromptOpen &&
        submitPromptChoice(promptTimerConfirmChoiceValue)
      ) {
        return
      }

      setShowTimerModal(false)
      // Clear all other possible modals
      setBuyModal({ open: false, tileId: null })
      setBuildModal({ open: false, tileId: null })
      setCardModal({ open: false, variant: 'EVENT' })
      setTollModal({ open: false, tileId: null, ownerName: '', tollText: '' })
      setCityAcquisitionModal(INITIAL_CITY_ACQUISITION_MODAL_STATE)
      setCitySellModal(INITIAL_CITY_SELL_MODAL_STATE)
      setInsufficientFundsModal(INITIAL_INSUFFICIENT_FUNDS_MODAL_STATE)
      setAiModal({ open: false, status: 'loading' })
      setGoToIslandModal({ open: false })

      advanceTurn()
    }

    function handleCityAcquisitionCancel() {
      const { onDoneCallback } = cityAcquisitionModal
      setCityAcquisitionModal(INITIAL_CITY_ACQUISITION_MODAL_STATE)

      if (useLocalPromptFallback) {
        advanceTurn(onDoneCallback)
        return
      }

      submitPromptChoice(promptAcquisitionCancelChoiceValue)
    }

    function handleCityAcquisitionConfirm() {
      if (!useLocalPromptFallback) {
        submitPromptChoice(promptAcquisitionConfirmChoiceValue)
        return
      }

      const { tileId, acquisitionCost, onDoneCallback } = cityAcquisitionModal
      setCityAcquisitionModal(INITIAL_CITY_ACQUISITION_MODAL_STATE)

      if (tileId === null) {
        advanceTurn(onDoneCallback)
        return
      }

      const owner = tileOwnersRef.current[tileId]
      if (!owner || owner.level >= 7) {
        advanceTurn(onDoneCallback)
        return
      }

      const activePlayerIdx = curPlayerRef.current
      const activePlayerId = getPlayerIdByIndex(activePlayerIdx)
      const activePlayerColor = getPlayerColorByIndex(activePlayerIdx)
      const ownerPlayerIdx = getPlayerIndexById(owner.ownerId)

      const bankrupt = applyMoney(
        activePlayerIdx,
        -acquisitionCost,
        onDoneCallback
      )
      if (bankrupt) {
        return
      }

      if (ownerPlayerIdx >= 0 && ownerPlayerIdx !== activePlayerIdx) {
        applyMoney(ownerPlayerIdx, +acquisitionCost)
      }

      updateTileOwners(
        (prev) => {
          const currentOwner = prev[tileId]
          if (!currentOwner || currentOwner.level >= 7) {
            return prev
          }

          return {
            ...prev,
            [tileId]: {
              ...currentOwner,
              ownerId: activePlayerId,
              ownerColor: activePlayerColor,
            },
          }
        },
        { notifyParent: true }
      )

      advanceTurn(onDoneCallback)
    }

    function handleCardConfirm() {
      const { variant, onDoneCallback } = cardModal
      setCardModal((prev) => ({ ...prev, open: false }))

      if (!USE_GAME_SOCKET_MOCK) {
        onDoneCallback?.()
        return
      }

      if (variant === 'CHANCE') {
        const playerIdx = curPlayerRef.current
        const currentPlayer = playersRef.current[playerIdx]

        if (currentPlayer) {
          const updatedPlayers = [...playersRef.current]
          updatedPlayers[playerIdx] = {
            ...currentPlayer,
            skipTurns: (currentPlayer.skipTurns ?? 0) + 1,
          }
          playersRef.current = updatedPlayers
          publishPlayers(updatedPlayers)
        }

        advanceTurn(onDoneCallback)
        return
      }

      setGoToIslandModal({ open: true, onDoneCallback })
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
        setGoToIslandModal({ open: true, onDoneCallback: onDone })
        return
      }

      if (tile.type === 'PROPERTY') {
        if (!USE_GAME_SOCKET_MOCK) {
          setStatus('서버 선택 요청을 기다리는 중...')
          onDone?.()
          return
        }

        if (!owner) {
          setBuyModal({ open: true, tileId, onDoneCallback: onDone })
        } else if (owner.ownerId !== getPlayerIdByIndex(playerIdx)) {
          setCityAcquisitionModal(INITIAL_CITY_ACQUISITION_MODAL_STATE)
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
          const openedSellModal = openCitySellModalForOwnedTile(tileId, onDone)
          if (!openedSellModal) {
            setBuildModal({ open: true, tileId, onDoneCallback: onDone })
          }
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
          variant: tile.type === 'CHANCE' ? 'CHANCE' : 'EVENT',
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

    const useLocalPromptFallback = USE_GAME_SOCKET_MOCK
    const buyTile = useLocalPromptFallback
      ? buyModal.tileId !== null
        ? TILES[buyModal.tileId]
        : null
      : promptTile
    const buyModalOpen = useLocalPromptFallback
      ? buyModal.open
      : isBuyPromptOpen
    const buildTile = useLocalPromptFallback
      ? buildModal.tileId !== null
        ? TILES[buildModal.tileId]
        : null
      : promptTile
    const buildModalOpen = useLocalPromptFallback
      ? buildModal.open
      : isBuildPromptOpen
    const currentLevel = useLocalPromptFallback
      ? buildModal.tileId !== null
        ? (tileOwners[buildModal.tileId]?.level ?? 0)
        : 0
      : promptCurrentLevel
    const tollTile = useLocalPromptFallback
      ? tollModal.tileId !== null
        ? TILES[tollModal.tileId]
        : null
      : promptTile
    const tollModalOpen = useLocalPromptFallback
      ? tollModal.open
      : isTollPromptOpen
    const tollOwnerName = useLocalPromptFallback
      ? tollModal.ownerName
      : promptOwnerName
    const tollAmountText = useLocalPromptFallback
      ? tollModal.tollText
      : formatWon(promptAmount ?? 0)
    const sellTile = useLocalPromptFallback
      ? citySellModal.tileId !== null
        ? TILES[citySellModal.tileId]
        : null
      : promptTile
    const sellModalOpen = useLocalPromptFallback
      ? citySellModal.open
      : isSellPromptOpen
    const sellOwnerName = useLocalPromptFallback
      ? citySellModal.ownerName
      : promptSellerName
    const sellCurrentLevel = useLocalPromptFallback
      ? citySellModal.currentLevel
      : promptCurrentLevel
    const sellPrice = useLocalPromptFallback
      ? citySellModal.sellPrice
      : (promptSellPrice ??
        (promptTileId != null
          ? getBoardSellFallbackRefund(promptTileId, promptCurrentLevel)
          : (sellTile?.price ?? 0)))
    const acquisitionTile = useLocalPromptFallback
      ? cityAcquisitionModal.tileId !== null
        ? TILES[cityAcquisitionModal.tileId]
        : null
      : promptTile
    const acquisitionModalOpenRaw = useLocalPromptFallback
      ? cityAcquisitionModal.open
      : isAcquisitionPromptOpen
    const acquisitionModalOpen = acquisitionModalOpenRaw && !tollModalOpen
    const acquisitionOwnerName = useLocalPromptFallback
      ? cityAcquisitionModal.ownerName
      : promptOwnerName
    const acquisitionCurrentLevel = useLocalPromptFallback
      ? cityAcquisitionModal.currentLevel
      : promptCurrentLevel
    const acquisitionCost = useLocalPromptFallback
      ? cityAcquisitionModal.acquisitionCost
      : (promptAcquisitionCost ?? acquisitionTile?.price ?? 0)
    const buyCost = useLocalPromptFallback
      ? (buyTile?.price ?? 0)
      : (getPromptPayloadNumber(activePrompt, ['price', 'purchaseCost']) ??
        buyTile?.price ??
        0)
    const isBuyPromptDismissed =
      !useLocalPromptFallback &&
      activePrompt?.id != null &&
      dismissedBuyPromptId === activePrompt.id
    const buyModalVisible =
      buyModalOpen && !isBuyPromptDismissed && !insufficientFundsModal.open
    const activePlayerMoney = players[curPlayer]?.money ?? 0
    const buildCost = useLocalPromptFallback
      ? getUpgradeCost(buildTile?.price ?? 0, currentLevel as BuildingLevel)
      : (getPromptPayloadNumber(activePrompt, ['buildCost', 'cost', 'price']) ??
        getUpgradeCost(buildTile?.price ?? 0, currentLevel as BuildingLevel))
    const nextTollCost = useLocalPromptFallback
      ? calcToll(buildTile?.price ?? 0, (currentLevel + 1) as BuildingLevel)
      : (getPromptPayloadNumber(activePrompt, ['nextToll', 'toll', 'amount']) ??
        calcToll(buildTile?.price ?? 0, (currentLevel + 1) as BuildingLevel))
    const diceTimerTitle = activePrompt?.title
    const diceTimerMessage = activePrompt?.message
    const diceTimerConfirmLabel = getPromptChoiceLabel(
      activePrompt,
      promptTimerConfirmChoiceValue,
      '확인'
    )

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
          open={buyModalVisible}
          onBuy={() => {
            if (activePlayerMoney < buyCost) {
              if (useLocalPromptFallback) {
                setBuyModal({ open: false, tileId: null })
              } else if (activePrompt?.id) {
                setDismissedBuyPromptId(activePrompt.id)
              }
              setInsufficientFundsModal({
                open: true,
                buildingLevel: 0,
                onDoneCallback: useLocalPromptFallback
                  ? buyModal.onDoneCallback
                  : undefined,
              })
              return
            }

            if (useLocalPromptFallback) {
              handleBuy(buyModal)
              return
            }

            submitPromptChoice(promptBuyChoiceValue)
          }}
          onPass={() => {
            if (useLocalPromptFallback) {
              handleBuyPass(buyModal)
              return
            }

            submitPromptChoice(promptBuyPassChoiceValue)
          }}
          passLabel={getPromptChoiceLabel(
            activePrompt,
            promptBuyPassChoiceValue,
            useLocalPromptFallback ? '패스' : '건너뛰기'
          )}
          buyLabel={getPromptChoiceLabel(
            activePrompt,
            promptBuyChoiceValue,
            '구매하기'
          )}
          isSubmitting={
            promptSubmittingChoice !== null && !useLocalPromptFallback
          }
          cityName={promptTileName}
          purchaseCostText={formatWon(buyCost)}
        />
        <InsufficientFundsModal
          open={insufficientFundsModal.open}
          buildingLevel={insufficientFundsModal.buildingLevel}
          onConfirm={handleInsufficientFundsConfirm}
        />
        <BuildModal
          open={buildModalOpen}
          onConfirm={() => {
            if (useLocalPromptFallback) {
              handleBuildConfirm(buildModal)
              return
            }

            submitPromptChoice(promptBuildConfirmChoiceValue)
          }}
          onCancel={() => {
            if (useLocalPromptFallback) {
              handleBuildCancel(buildModal)
              return
            }

            submitPromptChoice(promptBuildCancelChoiceValue)
          }}
          cityName={promptTileName}
          nextLevel={
            useLocalPromptFallback
              ? ((currentLevel + 1) as BuildingLevel)
              : promptNextLevel
          }
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
          isSubmitting={
            promptSubmittingChoice !== null && !useLocalPromptFallback
          }
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
          isSubmitting={
            promptSubmittingChoice !== null && !useLocalPromptFallback
          }
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
          open={showTimerModal || isDiceTimerPromptOpen}
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
      </div>
    )
  }
)

GameBoard.displayName = 'GameBoard'

export default GameBoard
