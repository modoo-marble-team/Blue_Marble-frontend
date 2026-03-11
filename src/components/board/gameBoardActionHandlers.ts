import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { emitGameAction } from '../../services/socket/game.handler'
import type { TileOwner, BuildingLevel } from './board.constants'
import { getBoardSellFallbackRefund } from './gameBoardActionUtils'
import {
  createBoardPurchasedTileOwner,
  findBoardSellTarget,
  getBoardTollAmount,
  upgradeBoardTileOwner,
} from './gameBoardTransactionUtils'
import type {
  BuildModalState,
  BuyModalState,
  TollModalState,
} from './gameBoard.types'

type UpdateTileOwners = (
  updater: (prev: Record<number, TileOwner>) => Record<number, TileOwner>,
  options?: { notifyParent?: boolean }
) => void

interface TollResolvedPayload {
  tileId: number
  ownerId: number
  ownerLevel: BuildingLevel
  ownerName: string
  onDoneCallback?: () => void
}

interface CreateGameBoardActionHandlersParams {
  gameId: string | null
  useGameSocketMock: boolean
  gameIdRequiredMessage: string
  setStatus: Dispatch<SetStateAction<string>>
  setBuyModal: Dispatch<SetStateAction<BuyModalState>>
  setBuildModal: Dispatch<SetStateAction<BuildModalState>>
  setTollModal: Dispatch<SetStateAction<TollModalState>>
  curPlayerRef: MutableRefObject<number>
  tileOwnersRef: MutableRefObject<Record<number, TileOwner>>
  getPlayerIdByIndex: (playerIdx: number) => number
  getPlayerColorByIndex: (playerIdx: number) => string
  getPlayerIndexById: (playerId: number) => number
  getPurchaseCost: (tileId: number) => number
  getUpgradeCost: (price: number, currentLevel: BuildingLevel) => number
  calcToll: (price: number, level: BuildingLevel) => number
  getTilePrice: (tileId: number) => number
  updateTileOwners: UpdateTileOwners
  applyMoney: (
    playerIdx: number,
    delta: number,
    onDoneCallback?: () => void
  ) => boolean
  advanceTurn: (onDone?: () => void) => void
  onTollResolved?: (payload: TollResolvedPayload) => boolean
}

export function createGameBoardActionHandlers(
  params: CreateGameBoardActionHandlersParams
) {
  const {
    gameId,
    useGameSocketMock,
    gameIdRequiredMessage,
    setStatus,
    setBuyModal,
    setBuildModal,
    setTollModal,
    curPlayerRef,
    tileOwnersRef,
    getPlayerIdByIndex,
    getPlayerColorByIndex,
    getPlayerIndexById,
    getPurchaseCost,
    getUpgradeCost,
    calcToll,
    getTilePrice,
    updateTileOwners,
    applyMoney,
    advanceTurn,
    onTollResolved,
  } = params

  function emitSocketAction(
    type: string,
    payload?: Record<string, unknown>
  ): boolean {
    if (!gameId) {
      setStatus(gameIdRequiredMessage)
      return false
    }

    emitGameAction({
      type,
      gameId,
      payload,
    })
    return true
  }

  async function sellOwnedTileForPlayer(
    playerIdx: number,
    options?: { tileId?: number }
  ) {
    const playerId = getPlayerIdByIndex(playerIdx)
    const sellTarget =
      typeof options?.tileId === 'number'
        ? (() => {
            const owner = tileOwnersRef.current[options.tileId]
            if (!owner || owner.ownerId !== playerId) {
              return null
            }

            return {
              tileId: options.tileId,
              owner,
            }
          })()
        : findBoardSellTarget(tileOwnersRef.current, playerId)
    if (!sellTarget) return false

    const { tileId, owner } = sellTarget

    if (!useGameSocketMock) {
      return emitSocketAction('SELL_PROPERTY', {
        tileId,
        buildingLevel: owner.level,
      })
    }

    const refund = getBoardSellFallbackRefund(tileId, owner.level)
    const nextLevel = Math.max(owner.level - 1, 0) as BuildingLevel
    const releaseOwnership = nextLevel <= 0

    updateTileOwners(
      (prev) => {
        const next = { ...prev }

        if (releaseOwnership || nextLevel <= 0) {
          delete next[tileId]
          return next
        }

        next[tileId] = {
          ...owner,
          level: nextLevel,
        }
        return next
      },
      { notifyParent: true }
    )
    applyMoney(playerIdx, +refund)

    // 💰 매각 파트 소리 재생
    new Audio('/audio/transaction.mp3').play().catch(() => {})

    return true
  }

  async function handleBuy(buyModal: BuyModalState) {
    const { tileId, onDoneCallback } = buyModal
    if (tileId === null) return

    if (!useGameSocketMock) {
      const emitted = emitSocketAction('BUY_PROPERTY', {
        tileId,
      })
      if (!emitted) {
        return
      }

      setBuyModal({ open: false, tileId: null })
      onDoneCallback?.()
      return
    }

    const active = curPlayerRef.current
    const activePlayerId = getPlayerIdByIndex(active)
    const activePlayerColor = getPlayerColorByIndex(active)
    const price = getPurchaseCost(tileId)

    setBuyModal({ open: false, tileId: null })
    const bankrupt = applyMoney(active, -price, onDoneCallback)
    if (!bankrupt) {
      updateTileOwners(
        (prev) => ({
          ...prev,
          [tileId]: createBoardPurchasedTileOwner(
            activePlayerId,
            activePlayerColor
          ),
        }),
        { notifyParent: true }
      )

      // 💰 매수 파트 소리 재생
      new Audio('/audio/transaction.mp3').play().catch(() => {})

      advanceTurn(onDoneCallback)
    }
  }

  function handleBuyPass(buyModal: BuyModalState) {
    setBuyModal({ open: false, tileId: null })

    if (!useGameSocketMock) {
      const emitted = emitSocketAction('END_TURN')
      if (emitted) {
        buyModal.onDoneCallback?.()
      }
      return
    }

    advanceTurn(buyModal.onDoneCallback)
  }

  async function handleBuildConfirm(buildModal: BuildModalState) {
    const { tileId, onDoneCallback } = buildModal
    if (tileId === null) return

    if (!useGameSocketMock) {
      const emitted = emitSocketAction('BUY_PROPERTY', {
        tileId,
      })
      if (!emitted) {
        return
      }

      setBuildModal({ open: false, tileId: null })
      onDoneCallback?.()
      return
    }

    const active = curPlayerRef.current
    const owner = tileOwnersRef.current[tileId]
    const price = getPurchaseCost(tileId)
    const upgradeCost = owner ? getUpgradeCost(price, owner.level) : 0

    setBuildModal({ open: false, tileId: null })
    const bankrupt = applyMoney(active, -upgradeCost, onDoneCallback)
    if (!bankrupt) {
      updateTileOwners((prev) => upgradeBoardTileOwner(prev, tileId), {
        notifyParent: true,
      })
      advanceTurn(onDoneCallback)
    }
  }

  function handleBuildCancel(buildModal: BuildModalState) {
    setBuildModal({ open: false, tileId: null })

    if (!useGameSocketMock) {
      const emitted = emitSocketAction('END_TURN')
      if (emitted) {
        buildModal.onDoneCallback?.()
      }
      return
    }

    advanceTurn(buildModal.onDoneCallback)
  }

  async function handleTollConfirm(tollModal: TollModalState) {
    const { tileId, onDoneCallback } = tollModal
    const active = curPlayerRef.current
    setTollModal({
      open: false,
      tileId: null,
      ownerName: '',
      tollText: '',
    })

    if (!useGameSocketMock) {
      const emitted = emitSocketAction('END_TURN')
      if (emitted) {
        onDoneCallback?.()
      }
      return
    }

    if (tileId !== null) {
      const owner = tileOwnersRef.current[tileId]
      const price = getTilePrice(tileId)
      const tollAmount = getBoardTollAmount(price, owner, calcToll)
      if (owner) {
        const ownerPlayerIndex = getPlayerIndexById(owner.ownerId)
        if (ownerPlayerIndex >= 0) {
          applyMoney(ownerPlayerIndex, +tollAmount)
        }
        const bankrupt = applyMoney(active, -tollAmount, onDoneCallback)
        if (!bankrupt) {
          const handledByFollowup =
            onTollResolved?.({
              tileId,
              ownerId: owner.ownerId,
              ownerLevel: owner.level,
              ownerName: tollModal.ownerName,
              onDoneCallback,
            }) ?? false

          if (!handledByFollowup) {
            advanceTurn(onDoneCallback)
          }
        }
        return
      }
    }

    advanceTurn(onDoneCallback)
  }

  return {
    sellOwnedTileForPlayer,
    handleBuy,
    handleBuyPass,
    handleBuildConfirm,
    handleBuildCancel,
    handleTollConfirm,
  }
}
