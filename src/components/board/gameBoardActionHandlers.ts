import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { gameApi } from '../../services/game/game.api'
import { emitGameAction } from '../../services/socket/game.handler'
import type { PlayerState, TileOwner, BuildingLevel } from './board.constants'
import {
  getBoardSellFallbackRefund,
  toBoardActionErrorMessage,
} from './gameBoardActionUtils'
import {
  findSyncTurnIndex,
  mapSyncPayloadPlayers,
  mapSyncPayloadTileOwners,
} from './gameBoardSyncUtils'
import {
  createBoardPurchasedTileOwner,
  findBoardSellTarget,
  getBoardTollAmount,
  upgradeBoardTileOwner,
} from './gameBoardTransactionUtils'
import type {
  BuildModalState,
  BuyModalState,
  SyncStatePayload,
  TollModalState,
} from './gameBoard.types'

type UpdateTileOwners = (
  updater: (prev: Record<number, TileOwner>) => Record<number, TileOwner>,
  options?: { notifyParent?: boolean }
) => void

interface CreateGameBoardActionHandlersParams {
  roomId: string | null
  useGameSocketMock: boolean
  roomIdRequiredMessage: string
  setStatus: Dispatch<SetStateAction<string>>
  setOptimisticTileOwners: Dispatch<
    SetStateAction<Record<number, TileOwner> | null>
  >
  setBuyModal: Dispatch<SetStateAction<BuyModalState>>
  setBuildModal: Dispatch<SetStateAction<BuildModalState>>
  setTollModal: Dispatch<SetStateAction<TollModalState>>
  playersRef: MutableRefObject<PlayerState[]>
  curPlayerRef: MutableRefObject<number>
  tileOwnersRef: MutableRefObject<Record<number, TileOwner>>
  publishPlayers: (players: PlayerState[]) => void
  publishCurrentTurn: (playerIdx: number) => void
  publishTileOwners: (tileOwners: Record<number, TileOwner>) => void
  getPlayerIdByIndex: (playerIdx: number) => number
  getPlayerColorByIndex: (playerIdx: number) => string
  getPlayerIndexById: (playerId: number) => number
  toBoardBuildingLevel: (
    tile: { building?: number; level?: number },
    hasOwner: boolean
  ) => BuildingLevel
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
}

export function createGameBoardActionHandlers(
  params: CreateGameBoardActionHandlersParams
) {
  const {
    roomId,
    useGameSocketMock,
    roomIdRequiredMessage,
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
    getPurchaseCost,
    getUpgradeCost,
    calcToll,
    getTilePrice,
    updateTileOwners,
    applyMoney,
    advanceTurn,
  } = params

  function emitSocketAction(
    type: string,
    payload?: Record<string, unknown>
  ): boolean {
    if (!roomId) {
      setStatus(roomIdRequiredMessage)
      return false
    }

    emitGameAction({
      type,
      roomId,
      payload,
    })
    return true
  }

  async function syncBoardStateFromServer() {
    if (!roomId) return false

    const syncResult = await gameApi.syncState(roomId)
    if (!syncResult.ok) return false

    const payload = syncResult.data as SyncStatePayload
    const payloadPlayers = payload.players ?? []
    let serverToBoardId = new Map<string, number>()

    if (payloadPlayers.length > 0) {
      const mappedPlayers = mapSyncPayloadPlayers(
        payloadPlayers,
        playersRef.current
      )
      serverToBoardId = mappedPlayers.serverToBoardId
      playersRef.current = mappedPlayers.nextPlayers
      publishPlayers(mappedPlayers.nextPlayers)
    }

    if (payload.tiles) {
      const nextOwners = mapSyncPayloadTileOwners(
        payload.tiles,
        playersRef.current,
        serverToBoardId,
        toBoardBuildingLevel
      )

      tileOwnersRef.current = nextOwners
      setOptimisticTileOwners(nextOwners)
      publishTileOwners(nextOwners)
    }

    const nextTurnIndex = findSyncTurnIndex(
      payload.current_turn ?? payload.currentTurn,
      playersRef.current,
      serverToBoardId
    )
    if (nextTurnIndex >= 0) {
      curPlayerRef.current = nextTurnIndex
      publishCurrentTurn(nextTurnIndex)
    }

    return true
  }

  async function sellOwnedTileForPlayer(playerIdx: number) {
    const playerId = getPlayerIdByIndex(playerIdx)
    const sellTarget = findBoardSellTarget(tileOwnersRef.current, playerId)
    if (!sellTarget) return false

    const { tileId, owner } = sellTarget

    if (!useGameSocketMock) {
      return emitSocketAction('SELL_PROPERTY', {
        tileId,
        buildingLevel: owner.level,
      })
    }

    if (!roomId) return false

    const sellResult = await gameApi.sellTile(roomId, {
      tile_index: tileId,
      level: owner.level,
    })

    if (!sellResult.ok) {
      setStatus(toBoardActionErrorMessage(sellResult.status))
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
      applyMoney(playerIdx, +getBoardSellFallbackRefund(tileId, owner.level))
    }

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

    if (!roomId) {
      setStatus(roomIdRequiredMessage)
      return
    }

    const active = curPlayerRef.current
    const activePlayerId = getPlayerIdByIndex(active)
    const activePlayerColor = getPlayerColorByIndex(active)
    const price = getPurchaseCost(tileId)

    const actionResult = await gameApi.buyTile(roomId, { tile_index: tileId })
    if (!actionResult.ok) {
      setStatus(toBoardActionErrorMessage(actionResult.status))
      return
    }

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
      if (useGameSocketMock) onDoneCallback?.()
      else advanceTurn(onDoneCallback)
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
    if (!roomId) {
      setStatus(roomIdRequiredMessage)
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
      setStatus(toBoardActionErrorMessage(actionResult.status))
      return
    }

    setBuildModal({ open: false, tileId: null })
    const bankrupt = applyMoney(active, -upgradeCost, onDoneCallback)
    if (!bankrupt) {
      updateTileOwners((prev) => upgradeBoardTileOwner(prev, tileId), {
        notifyParent: true,
      })
      if (useGameSocketMock) onDoneCallback?.()
      else advanceTurn(onDoneCallback)
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

  return {
    syncBoardStateFromServer,
    sellOwnedTileForPlayer,
    handleBuy,
    handleBuyPass,
    handleBuildConfirm,
    handleBuildCancel,
    handleTollConfirm,
  }
}
