import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { PlayerState, TileData, TileOwner } from './board.constants'
import type { BankruptModalState } from './gameBoard.types'

interface ApplyMockMoneyParams {
  useGameSocketMock: boolean
  playersRef: MutableRefObject<PlayerState[]>
  playerIdx: number
  delta: number
  publishPlayers: (nextPlayers: PlayerState[]) => void
  setBankruptModal: Dispatch<SetStateAction<BankruptModalState>>
  onDoneCallback?: () => void
}

interface AdvanceMockTurnParams {
  useGameSocketMock: boolean
  playersRef: MutableRefObject<PlayerState[]>
  curPlayerRef: MutableRefObject<number>
  bankruptSetRef: MutableRefObject<Set<number>>
  publishPlayers: (nextPlayers: PlayerState[]) => void
  syncCurrentTurn: (playerIdx: number) => void
  fallbackPlayerCount: number
  onDone?: () => void
}

interface BuildPlayerResultsParams {
  players: PlayerState[]
  tileOwners: Record<number, TileOwner>
  tiles: TileData[]
  bankruptPlayerIndexes: Set<number>
}

export interface BoardPlayerResult {
  id: string
  nickname: string
  money: number
  totalAsset: number
  ownedCityCount: number
  isBankrupt: boolean
}

export function applyMockMoney({
  useGameSocketMock,
  playersRef,
  playerIdx,
  delta,
  publishPlayers,
  setBankruptModal,
  onDoneCallback,
}: ApplyMockMoneyParams): boolean {
  if (!useGameSocketMock) {
    onDoneCallback?.()
    return false
  }

  const updated = playersRef.current.map((player, index) => {
    if (index !== playerIdx) {
      return player
    }

    return {
      ...player,
      money: Math.max(0, player.money + delta),
    }
  })

  playersRef.current = updated
  publishPlayers(updated)

  const isBankrupt = updated[playerIdx]?.money <= 0
  if (!isBankrupt) {
    return false
  }

  const playerName = updated[playerIdx]?.name ?? `Player ${playerIdx + 1}`
  setTimeout(() => {
    setBankruptModal({
      open: true,
      playerIdx,
      playerName,
      onDoneCallback,
    })
  }, 0)

  return true
}

export function advanceMockTurn({
  useGameSocketMock,
  playersRef,
  curPlayerRef,
  bankruptSetRef,
  publishPlayers,
  syncCurrentTurn,
  fallbackPlayerCount,
  onDone,
}: AdvanceMockTurnParams) {
  if (!useGameSocketMock) {
    onDone?.()
    return
  }

  const resolveNextTurn = () => {
    const playerCount =
      playersRef.current.length > 0 ? playersRef.current.length : fallbackPlayerCount

    if (playerCount <= 0) {
      onDone?.()
      return
    }

    let next = (curPlayerRef.current + 1) % playerCount
    let tries = 0
    while (bankruptSetRef.current.has(next) && tries < playerCount) {
      next = (next + 1) % playerCount
      tries++
    }

    const nextPlayer = playersRef.current[next]
    if (nextPlayer && (nextPlayer.skipTurns ?? 0) > 0 && tries < playerCount) {
      const updatedPlayers = [...playersRef.current]
      updatedPlayers[next] = {
        ...nextPlayer,
        skipTurns: nextPlayer.skipTurns! - 1,
      }
      playersRef.current = updatedPlayers
      publishPlayers(updatedPlayers)

      curPlayerRef.current = next
      syncCurrentTurn(next)

      setTimeout(() => {
        resolveNextTurn()
      }, 1500)
      return
    }

    curPlayerRef.current = next
    syncCurrentTurn(next)
    onDone?.()
  }

  resolveNextTurn()
}

export function removeOwnedTilesByPlayerId(
  tileOwners: Record<number, TileOwner>,
  playerId: number
): Record<number, TileOwner> {
  const next = { ...tileOwners }
  Object.keys(next).forEach((tileId) => {
    if (next[Number(tileId)].ownerId === playerId) {
      delete next[Number(tileId)]
    }
  })
  return next
}

export function buildPlayerResults({
  players,
  tileOwners,
  tiles,
  bankruptPlayerIndexes,
}: BuildPlayerResultsParams): BoardPlayerResult[] {
  const results = players.map((player, index) => {
    let propertyValue = 0
    let cityCount = 0

    Object.entries(tileOwners).forEach(([tileId, owner]) => {
      if (String(owner.ownerId) !== String(player.id)) {
        return
      }

      const tile = tiles[Number(tileId)]
      propertyValue += tile?.price ?? 0
      cityCount++
    })

    return {
      id: String(player.id),
      nickname: player.name || `Player ${index + 1}`,
      money: player.money,
      totalAsset: player.money + propertyValue,
      ownedCityCount: cityCount,
      isBankrupt: bankruptPlayerIndexes.has(index),
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
