import type { BuildingLevel } from './board.constants'

export interface BuyModalState {
  open: boolean
  tileId: number | null
  onDoneCallback?: () => void
}

export interface BuildModalState {
  open: boolean
  tileId: number | null
  onDoneCallback?: () => void
}

export interface CardModalState {
  open: boolean
  variant: 'EVENT' | 'CHANCE'
  onDoneCallback?: () => void
}

export interface TravelModalState {
  open: boolean
  onDoneCallback?: () => void
}

export interface TollModalState {
  open: boolean
  tileId: number | null
  ownerName: string
  tollText: string
  onDoneCallback?: () => void
}

export interface CitySellModalState {
  open: boolean
  tileId: number | null
  ownerName: string
  currentLevel: BuildingLevel
  sellPrice: number
  onDoneCallback?: () => void
}

export interface InsufficientFundsModalState {
  open: boolean
  buildingLevel: BuildingLevel
  onDoneCallback?: () => void
  promptChoiceValue?: string | null
}

export interface CityAcquisitionModalState {
  open: boolean
  tileId: number | null
  ownerName: string
  currentLevel: BuildingLevel
  acquisitionCost: number
  onDoneCallback?: () => void
}

export interface AIPenaltyModalState {
  open: boolean
  status: 'loading' | 'result' | 'error'
  resultDescription?: string
  onDoneCallback?: () => void
}

export interface BankruptModalState {
  open: boolean
  playerIdx: number
  playerName: string
  onDoneCallback?: () => void
}

export interface GameResultModalState {
  open: boolean
}

export interface GoToIslandModalState {
  open: boolean
  onDoneCallback?: () => void
}

export type SyncStatePayload = {
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
