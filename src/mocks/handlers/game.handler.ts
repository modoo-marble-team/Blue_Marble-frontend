import { delay, http, HttpResponse } from 'msw'
import { socket } from '../../lib/socket'
import { getMockWaitingRoomSnapshot } from '../../pages/waiting-room/socket/mockGateway'
import type {
  BuildingLevel,
  ChatMessage,
  GameAck,
  GameError,
  GamePatchEnvelope,
  GamePrompt,
  GamePromptResponse,
  GameSnapshot,
  Player,
  PlayerId,
  Tile,
  GlobalEffectState,
} from '../../types/domain'
import { mockMessages, mockPlayers, mockTiles } from '../gameMockData'

const MOCK_PLAYER_ID = 'mock-player-1'
const ROOM_ID_FROM_GAME_ID_PATTERN = /^game-(room-\d+)-/
const MOCK_PASS_GO_SALARY = 100_000
const MOCK_TURN_TIMEOUT_SEC = 30
const MOCK_MAX_ROUNDS = 20
const MOCK_ISLAND_LOCK_TURNS = 3
const SYNC_SNAPSHOT_GAP_THRESHOLD = 200
const PROMPT_RESPONSE_ACK_TYPE = 'PROMPT_RESPONSE'
const PROMPT_RESPONSE_ACTION_PREFIX = 'prompt-response'
const MOCK_PLAYER_START_BALANCE = 1_000_000
const DEFAULT_MOCK_CHAT_MESSAGES = ['즐겜해요~', '모두의 마블 한판!'] as const

const PROMPT_CHOICE_CANONICAL_MAP: Record<string, readonly string[]> = {
  BUY_OR_SKIP: ['BUY', 'SKIP'],
  BUILD_OR_SKIP: ['BUILD', 'SKIP'],
  CONFIRM_ONLY: ['CONFIRM'],
  PAY_TOLL: ['PAY_TOLL'],
  ACQUISITION_OR_SKIP: ['ACQUIRE', 'SKIP'],
  TRAVEL_SELECT: ['CONFIRM', 'SKIP'],
}

type MockChanceType =
  | 'GAIN_MONEY'
  | 'LOSE_MONEY'
  | 'MOVE_FORWARD'
  | 'MOVE_BACKWARD'
  | 'MOVE_TO_ISLAND'

type MockChanceEffect = {
  type: MockChanceType
  power: number
  effect: 'GOOD' | 'BAD' | 'MOVE'
  description: string
}

const MOCK_CHANCE_EFFECTS: readonly MockChanceEffect[] = [
  {
    type: 'GAIN_MONEY',
    power: 10_000,
    effect: 'GOOD',
    description: '지원금 수령! 1억원을 획득합니다.',
  },
  {
    type: 'LOSE_MONEY',
    power: 10_000,
    effect: 'BAD',
    description: '벌금 납부! 1억원을 지불합니다.',
  },
  {
    type: 'MOVE_FORWARD',
    power: 5,
    effect: 'MOVE',
    description: '앞으로 5칸 이동합니다.',
  },
  {
    type: 'MOVE_BACKWARD',
    power: 3,
    effect: 'MOVE',
    description: '뒤로 3칸 이동합니다.',
  },
  {
    type: 'MOVE_TO_ISLAND',
    power: 0,
    effect: 'MOVE',
    description: '무인도로 이동합니다.',
  },
]

type TierRuleMan = {
  tolls: [number, number, number, number]
  buildCosts: [number, number, number]
}

const PROPERTY_TIER_BY_PRICE_MAN: Record<number, TierRuleMan> = {
  30_000: {
    tolls: [5_000, 10_000, 30_000, 65_000],
    buildCosts: [40_000, 85_000, 140_000],
  },
  50_000: {
    tolls: [10_000, 20_000, 90_000, 155_000],
    buildCosts: [60_000, 155_000, 180_000],
  },
  70_000: {
    tolls: [15_000, 30_000, 95_000, 175_000],
    buildCosts: [80_000, 190_000, 250_000],
  },
  110_000: {
    tolls: [18_000, 35_000, 95_000, 155_000],
    buildCosts: [160_000, 340_000, 390_000],
  },
  170_000: {
    tolls: [20_000, 40_000, 90_000, 130_000],
    buildCosts: [280_000, 530_000, 560_000],
  },
}

type DiceRequestBody = {
  player_id: string
}

type TileActionRequestBody = {
  tile_index: number
  level?: number
}

type SocketWithListeners = {
  listeners: (name: string) => Array<(eventPayload: unknown) => void>
}

type GameStateResponse = {
  players: Player[]
  tiles: Tile[]
  messages: typeof mockMessages
  currentTurn: PlayerId
  round: number
  revision: number
  phase: GameSnapshot['phase']
  prompt: GamePrompt | null
  promptIssuedAtMs: number | null
  activeGlobalEffect: GlobalEffectState | null
  gameResult: GameSnapshot['gameResult'] | null
  isGameOver: boolean
  winnerId: PlayerId | null
  pendingBonusTurnPlayerId: PlayerId | null
}

type GameEvents = NonNullable<GamePatchEnvelope['events']>
type GameEvent = GameEvents[number]

type MockGameRuntimeContext = {
  gameId: string | null
  roomId: string | null
}

type MockGameActionPayload = {
  actionId?: string
  type: string
  gameId?: string | null
  payload?: Record<string, unknown>
}

type MockResolvedGameAction = {
  actionId: string
  type: string
  gameId: string
  payload?: Record<string, unknown>
}

type MockGameSyncPayload = {
  gameId?: string | null
  knownRevision?: number
}

type MockGameSyncTimerPayload = {
  gameId?: string | null
}

type MockPromptResponsePayload = GamePromptResponse & {
  gameId?: string | null
  payload?: Record<string, unknown>
}

const clonePlayers = () => structuredClone(mockPlayers)
const cloneTiles = () => structuredClone(mockTiles)
const cloneMessages = () => structuredClone(mockMessages)
const mockGameContext: MockGameRuntimeContext = {
  gameId: null,
  roomId: null,
}

const resolveRoomIdFromGameId = (gameId: string) => {
  return gameId.match(ROOM_ID_FROM_GAME_ID_PATTERN)?.[1] ?? null
}

const getMockWaitingRoomSnapshotSafely = (roomId: string) => {
  try {
    return getMockWaitingRoomSnapshot(roomId)
  } catch {
    return null
  }
}

const createPlayersFromWaitingRoom = (roomId: string): Player[] => {
  const waitingRoomSnapshot = getMockWaitingRoomSnapshotSafely(roomId)

  if (!waitingRoomSnapshot || waitingRoomSnapshot.players.length === 0) {
    return clonePlayers()
  }

  return waitingRoomSnapshot.players.map((player, index) => {
    const template =
      mockPlayers[index] ?? mockPlayers[index % mockPlayers.length]

    return {
      id: player.id,
      nickname: player.nickname,
      balance: MOCK_PLAYER_START_BALANCE,
      position: 0,
      owned_tiles: [],
      is_in_jail: false,
      jail_turn_count: 0,
      is_bankrupt: false,
      color: template?.color ?? '#94A3B8',
      avatar: template?.avatar,
    }
  })
}

const createMessagesFromPlayers = (players: Player[]): ChatMessage[] => {
  if (players.length === 0) {
    return cloneMessages()
  }

  if (players.length === 1) {
    return [
      {
        id: '2',
        sender_id: String(players[0].id),
        sender_nickname: players[0].nickname,
        content: DEFAULT_MOCK_CHAT_MESSAGES[1],
        timestamp: new Date().toISOString(),
        type: 'talk',
      },
    ]
  }

  return [
    {
      id: '1',
      sender_id: String(players[1].id),
      sender_nickname: players[1].nickname,
      content: DEFAULT_MOCK_CHAT_MESSAGES[0],
      timestamp: new Date().toISOString(),
      type: 'talk',
    },
    {
      id: '2',
      sender_id: String(players[0].id),
      sender_nickname: players[0].nickname,
      content: DEFAULT_MOCK_CHAT_MESSAGES[1],
      timestamp: new Date().toISOString(),
      type: 'talk',
    },
  ]
}

const createInitialGameState = (
  roomId: string | null = null
): GameStateResponse => {
  const players = roomId ? createPlayersFromWaitingRoom(roomId) : clonePlayers()
  const initialTiles = cloneTiles()

  const initialState: GameStateResponse = {
    players,
    tiles: initialTiles,
    messages: createMessagesFromPlayers(players),
    currentTurn: players[0]?.id ?? MOCK_PLAYER_ID,
    round: 1,
    revision: 1,
    phase: 'rolling',
    prompt: null,
    promptIssuedAtMs: null,
    activeGlobalEffect: null,
    gameResult: null,
    isGameOver: false,
    winnerId: null,
    pendingBonusTurnPlayerId: null,
  }

  initialState.players.forEach((player) => {
    player.state = player.is_bankrupt ? 'bankrupt' : 'normal'
    player.stateDuration = player.is_in_jail ? player.jail_turn_count : 0
    player.totalAssets = Math.max(0, player.balance)
  })

  return initialState
}

const mockGameState: GameStateResponse = createInitialGameState()

const resetMockGameState = (options?: {
  gameId?: string | null
  roomId?: string | null
}) => {
  const roomId = options?.roomId ?? null
  const initialState = createInitialGameState(roomId)
  mockGameState.players = initialState.players
  mockGameState.tiles = initialState.tiles
  mockGameState.messages = initialState.messages
  mockGameState.currentTurn = initialState.currentTurn
  mockGameState.round = initialState.round
  mockGameState.revision = initialState.revision
  mockGameState.phase = initialState.phase
  mockGameState.prompt = initialState.prompt
  mockGameState.promptIssuedAtMs = initialState.promptIssuedAtMs
  mockGameState.activeGlobalEffect = initialState.activeGlobalEffect
  mockGameState.gameResult = initialState.gameResult
  mockGameState.isGameOver = initialState.isGameOver
  mockGameState.winnerId = initialState.winnerId
  mockGameState.pendingBonusTurnPlayerId = initialState.pendingBonusTurnPlayerId
  mockGameContext.gameId = options?.gameId ?? null
  mockGameContext.roomId = roomId

  mockGameState.players.forEach((player) => {
    player.totalAssets = Math.max(0, player.balance)
  })
}

const buildStateResponse = () => ({
  players: structuredClone(mockGameState.players),
  tiles: structuredClone(mockGameState.tiles),
  messages: structuredClone(mockGameState.messages),
  currentTurn: mockGameState.currentTurn,
  round: mockGameState.round,
  revision: mockGameState.revision,
  activeGlobalEffect: structuredClone(mockGameState.activeGlobalEffect),
})

const buildSnapshot = (gameId: string): GameSnapshot => ({
  roomId: mockGameContext.roomId,
  gameId,
  revision: mockGameState.revision,
  phase: mockGameState.phase,
  players: structuredClone(mockGameState.players),
  tiles: structuredClone(mockGameState.tiles),
  currentPlayerId: mockGameState.currentTurn,
  currentTurn: mockGameState.currentTurn,
  round: mockGameState.round,
  turnTimeoutSec: MOCK_TURN_TIMEOUT_SEC,
  prompt: mockGameState.prompt,
  gameResult: structuredClone(mockGameState.gameResult),
  isGameOver: mockGameState.isGameOver,
  winnerId: mockGameState.winnerId,
  activeGlobalEffect: structuredClone(mockGameState.activeGlobalEffect),
})

const emitSocketEvent = (eventName: string, payload: unknown) => {
  const socketWithListeners = socket as unknown as SocketWithListeners

  socketWithListeners.listeners(eventName).forEach((listener) => {
    listener(payload)
  })
}

const emitLegacyGameState = () => {
  emitSocketEvent('game_state', {
    players: structuredClone(mockGameState.players),
    tiles: structuredClone(mockGameState.tiles),
    current_turn: mockGameState.currentTurn,
    round: mockGameState.round,
    timeout_sec: MOCK_TURN_TIMEOUT_SEC,
  })
}

const emitLegacyTurnStart = () => {
  emitSocketEvent('turn_start', {
    player_id: mockGameState.currentTurn,
    round: mockGameState.round,
    timeout_sec: MOCK_TURN_TIMEOUT_SEC,
  })
}

const emitGameAck = (ack: GameAck) => {
  emitSocketEvent('game:ack', ack)
}

const emitGamePatch = (
  payload: GamePatchEnvelope & { snapshot?: GameSnapshot }
) => {
  emitSocketEvent('game:patch', payload)
}

const emitGameError = (error: GameError) => {
  emitSocketEvent('game:error', error)
}

const normalizeGameId = (gameId?: string | null) => {
  if (typeof gameId !== 'string') {
    return null
  }

  const normalized = gameId.trim()
  return normalized.length > 0 ? normalized : null
}

const resolveRequiredGameId = (options: {
  gameId?: string | null
  actionId?: string
  type?: string
}) => {
  const normalizedGameId = normalizeGameId(options.gameId)
  if (normalizedGameId) {
    return normalizedGameId
  }

  const error: GameError = {
    code: 'INVALID_GAME_ID',
    message: 'gameId가 필요합니다.',
    actionId: options.actionId,
  }

  emitGameError(error)

  if (options.actionId && options.type) {
    emitGameAck({
      actionId: options.actionId,
      type: options.type,
      ok: false,
      error: {
        code: error.code,
        message: error.message,
      },
    })
  }

  return null
}

const buildStatePatch = (gameId: string): GamePatchEnvelope['patch'] => [
  { op: 'set', path: 'roomId', value: mockGameContext.roomId },
  { op: 'set', path: 'gameId', value: gameId },
  { op: 'set', path: 'phase', value: mockGameState.phase },
  { op: 'set', path: 'players', value: structuredClone(mockGameState.players) },
  { op: 'set', path: 'tiles', value: structuredClone(mockGameState.tiles) },
  { op: 'set', path: 'currentPlayerId', value: mockGameState.currentTurn },
  { op: 'set', path: 'currentTurn', value: mockGameState.currentTurn },
  { op: 'set', path: 'round', value: mockGameState.round },
  { op: 'set', path: 'turnTimeoutSec', value: MOCK_TURN_TIMEOUT_SEC },
  { op: 'set', path: 'prompt', value: structuredClone(mockGameState.prompt) },
  {
    op: 'set',
    path: 'gameResult',
    value: structuredClone(mockGameState.gameResult),
  },
  { op: 'set', path: 'isGameOver', value: mockGameState.isGameOver },
  { op: 'set', path: 'winnerId', value: mockGameState.winnerId },
  {
    op: 'set',
    path: 'activeGlobalEffect',
    value: structuredClone(mockGameState.activeGlobalEffect),
  },
  {
    op: 'set',
    path: 'session',
    value: {
      roomId: mockGameContext.roomId,
      gameId,
      transport: 'event-socket',
      syncedAt: new Date().toISOString(),
    },
  },
]

const getCurrentPlayer = () =>
  mockGameState.players.find(
    (player) => String(player.id) === String(mockGameState.currentTurn)
  )

const getTileByIndex = (tileIndex: number) =>
  mockGameState.tiles.find((tile) => tile.index === tileIndex)

const isOwnableTile = (tile: Tile | undefined): tile is Tile =>
  !!tile && (tile.type === 'city' || tile.type === 'property')

const getTierRuleByTile = (tile: Tile | undefined): TierRuleMan | null => {
  if (!tile) {
    return null
  }
  const price = typeof tile.price === 'number' ? Math.trunc(tile.price) : 0
  if (price <= 0) {
    return null
  }
  return PROPERTY_TIER_BY_PRICE_MAN[price] ?? null
}

const getTileBuildCost = (tile: Tile | undefined): number => {
  if (!tile || !isOwnableTile(tile)) {
    return 0
  }

  const currentLevel = Math.max(0, Math.min(tile.building ?? 0, 3))
  if (currentLevel >= 3) {
    return 0
  }

  const tierRule = getTierRuleByTile(tile)
  if (!tierRule) {
    return 0
  }

  return tierRule.buildCosts[currentLevel] ?? 0
}

const getTileTollAmount = (tile: Tile | undefined): number => {
  if (!tile || !isOwnableTile(tile)) {
    return 0
  }

  const tierRule = getTierRuleByTile(tile)
  if (!tierRule) {
    return tile.price ?? 0
  }

  const level = Math.max(0, Math.min(tile.building ?? 0, 3))
  return tierRule.tolls[level] ?? tile.price ?? 0
}

const ensureOwnedTiles = (player: Player, tileIndex: number) => {
  if (!player.owned_tiles.includes(tileIndex)) {
    player.owned_tiles.push(tileIndex)
  }
}

const removeOwnedTile = (player: Player, tileIndex: number) => {
  player.owned_tiles = player.owned_tiles.filter(
    (ownedTile) => ownedTile !== tileIndex
  )
}

const getSellRefund = (tile: Tile, requestedLevel?: number) => {
  const sellLevel = requestedLevel ?? tile.building
  const buildCost = getTileBuildCost(tile)

  if (sellLevel > 0) {
    return {
      refund: buildCost > 0 ? buildCost : 0,
      nextBuilding: Math.max(0, sellLevel - 1) as BuildingLevel,
      releaseOwnership: false,
    }
  }

  return {
    refund: tile.price ?? 0,
    nextBuilding: 0 as BuildingLevel,
    releaseOwnership: true,
  }
}

const getNextActivePlayerId = (currentPlayerId: PlayerId) => {
  const currentIndex = mockGameState.players.findIndex(
    (player) => String(player.id) === String(currentPlayerId)
  )

  if (currentIndex < 0) {
    return currentPlayerId
  }

  for (let step = 1; step <= mockGameState.players.length; step++) {
    const nextPlayer =
      mockGameState.players[
        (currentIndex + step) % mockGameState.players.length
      ]

    if (!nextPlayer.is_bankrupt) {
      return nextPlayer.id
    }
  }

  return currentPlayerId
}

const advanceMockTurn = () => {
  const currentIndex = mockGameState.players.findIndex(
    (player) => String(player.id) === String(mockGameState.currentTurn)
  )
  const nextPlayerId = getNextActivePlayerId(mockGameState.currentTurn)
  const nextIndex = mockGameState.players.findIndex(
    (player) => String(player.id) === String(nextPlayerId)
  )

  if (
    currentIndex >= 0 &&
    nextIndex >= 0 &&
    nextPlayerId !== mockGameState.currentTurn &&
    nextIndex <= currentIndex
  ) {
    mockGameState.round += 1
  }

  mockGameState.currentTurn = nextPlayerId
}

const nextRevision = () => {
  mockGameState.revision += 1
  return mockGameState.revision
}

const buildErrorResponse = (message: string, status: number) =>
  HttpResponse.json({ message }, { status })

const emitSnapshotPatch = (gameId: string, events?: GameEvents) => {
  emitGamePatch({
    revision: mockGameState.revision,
    patch: [],
    events,
    snapshot: buildSnapshot(gameId),
  })
}

const normalizePromptType = (prompt: GamePrompt | null) =>
  typeof prompt?.type === 'string' ? prompt.type.trim().toUpperCase() : ''

const normalizePromptChoice = (choice: string) => choice.trim().toUpperCase()

const resolvePromptAllowedChoices = (prompt: GamePrompt | null) => {
  const promptType = normalizePromptType(prompt)
  return PROMPT_CHOICE_CANONICAL_MAP[promptType] ?? null
}

const isPromptExpired = (prompt: GamePrompt | null) => {
  if (!prompt) {
    return false
  }

  if (
    typeof prompt.timeoutSec !== 'number' ||
    !Number.isFinite(prompt.timeoutSec) ||
    prompt.timeoutSec <= 0 ||
    mockGameState.promptIssuedAtMs == null
  ) {
    return false
  }

  return Date.now() - mockGameState.promptIssuedAtMs > prompt.timeoutSec * 1000
}

const clearMockPrompt = () => {
  mockGameState.prompt = null
  mockGameState.promptIssuedAtMs = null
}

const createPromptId = (prefix: string) => `${prefix}-${Date.now()}`

const resolvePromptTileIndex = (prompt: GamePrompt | null) => {
  if (!prompt || !prompt.payload || typeof prompt.payload !== 'object') {
    return null
  }

  const payload = prompt.payload as Record<string, unknown>
  const raw = payload.tileId ?? payload.targetTileId ?? payload.toTileId ?? null

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.trunc(raw)
  }

  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const resolvePromptAmount = (prompt: GamePrompt | null) => {
  if (!prompt || !prompt.payload || typeof prompt.payload !== 'object') {
    return 0
  }

  const payload = prompt.payload as Record<string, unknown>
  const raw =
    payload.amount ??
    payload.tollAmount ??
    payload.toll ??
    payload.price ??
    null

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }

  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const buildBuyPrompt = (_player: Player, tile: Tile): GamePrompt => ({
  id: createPromptId('prompt-buy'),
  type: 'BUY_OR_SKIP',
  playerId: _player.id,
  title: '토지를 구매하시겠습니까?',
  message: `${tile.name} 칸을 구매할까요?`,
  timeoutSec: MOCK_TURN_TIMEOUT_SEC,
  choices: [
    { id: 'buy', label: '구매하기', value: 'BUY' },
    { id: 'skip', label: '건너뛰기', value: 'SKIP' },
  ],
  payload: {
    tileId: tile.index,
    tileName: tile.name,
    price: tile.price ?? 0,
  },
})

const buildBuildPrompt = (_player: Player, tile: Tile): GamePrompt => ({
  id: createPromptId('prompt-build'),
  type: 'BUILD_OR_SKIP',
  playerId: _player.id,
  title: `${tile.name} 건설`,
  message: `${tile.name}에 건설하시겠습니까?`,
  timeoutSec: MOCK_TURN_TIMEOUT_SEC,
  choices: [
    { id: 'build', label: '건설하기', value: 'BUILD' },
    { id: 'skip', label: '건너뛰기', value: 'SKIP' },
  ],
  payload: {
    tileId: tile.index,
    tileName: tile.name,
    buildCost: getTileBuildCost(tile),
    buildingLevel: tile.building ?? 0,
  },
})

const buildTollPrompt = (
  _player: Player,
  owner: Player,
  tile: Tile,
  amount: number
): GamePrompt => ({
  id: createPromptId('prompt-toll'),
  type: 'PAY_TOLL',
  playerId: _player.id,
  title: '통행료 지불',
  message: `${owner.nickname}님의 ${tile.name} 칸에 도착했습니다.`,
  timeoutSec: MOCK_TURN_TIMEOUT_SEC,
  choices: [{ id: 'pay', label: '지불하기', value: 'PAY_TOLL' }],
  payload: {
    tileId: tile.index,
    tileName: tile.name,
    ownerId: owner.id,
    ownerName: owner.nickname,
    amount,
    tollAmount: amount,
  },
})

const buildTravelPrompt = (player: Player, tile: Tile): GamePrompt => ({
  id: createPromptId('prompt-travel'),
  type: 'TRAVEL_SELECT',
  playerId: player.id,
  title: `${tile.name} 선택`,
  message: `${tile.name} 효과로 이동할 칸을 선택하세요.`,
  timeoutSec: MOCK_TURN_TIMEOUT_SEC,
  choices: [
    { id: 'confirm', label: '선택 이동', value: 'CONFIRM' },
    { id: 'skip', label: '건너뛰기', value: 'SKIP' },
  ],
  payload: {
    tileId: tile.index,
    tileName: tile.name,
  },
})

const buildAcquisitionPrompt = (
  player: Player,
  owner: Player,
  tile: Tile
): GamePrompt => ({
  id: createPromptId('prompt-acquisition'),
  type: 'ACQUISITION_OR_SKIP',
  playerId: player.id,
  title: `${tile.name} 인수`,
  message: `${owner.nickname}의 ${tile.name}을(를) ${tile.price ?? 0}에 인수하시겠습니까?`,
  timeoutSec: MOCK_TURN_TIMEOUT_SEC,
  choices: [
    { id: 'acquire', label: '인수하기', value: 'ACQUIRE' },
    { id: 'skip', label: '건너뛰기', value: 'SKIP' },
  ],
  payload: {
    tileId: tile.index,
    tileName: tile.name,
    ownerId: owner.id,
    ownerName: owner.nickname,
    amount: tile.price ?? 0,
  },
})

const getIslandTileIndex = () =>
  mockGameState.tiles.find(
    (tile) => tile.type === 'island' || tile.transportType === 'ISLAND'
  )?.index ?? 8

const getAccumulatedBuildCost = (tile: Tile): number => {
  if (!isOwnableTile(tile) || tile.building <= 0) {
    return 0
  }

  const tierRule = getTierRuleByTile(tile)
  if (!tierRule) {
    return 0
  }

  const level = Math.max(0, Math.min(tile.building, 3))
  let total = 0
  for (let index = 0; index < level; index += 1) {
    total += tierRule.buildCosts[index] ?? 0
  }
  return total
}

const syncPlayerStatus = (player: Player) => {
  const stateDuration = Math.max(
    player.stateDuration ?? player.jail_turn_count ?? 0,
    0
  )
  player.balance = Math.max(0, player.balance)
  player.stateDuration = stateDuration
  player.jail_turn_count = stateDuration
  player.is_in_jail = stateDuration > 0 || player.state === 'locked'

  if (player.is_bankrupt) {
    player.is_bankrupt = true
    player.state = 'bankrupt'
    player.is_in_jail = false
    player.stateDuration = 0
    player.jail_turn_count = 0
    return
  }

  if (player.state === 'locked' || player.state === 'island') {
    player.state = 'locked'
    player.is_in_jail = true
    return
  }

  player.state = 'normal'
  player.is_in_jail = false
}

const calculatePlayerTotalAssets = (player: Player): number => {
  const ownedInvested = player.owned_tiles.reduce((sum, tileIndex) => {
    const tile = getTileByIndex(tileIndex)
    if (!tile || !isOwnableTile(tile)) {
      return sum
    }

    const landPrice = tile.price ?? 0
    return sum + landPrice + getAccumulatedBuildCost(tile)
  }, 0)

  return Math.max(0, player.balance) + ownedInvested
}

const recalculatePlayerAssets = () => {
  mockGameState.players.forEach((player) => {
    syncPlayerStatus(player)
    player.totalAssets = calculatePlayerTotalAssets(player)
  })
}

const createPlayerMovedEvent = ({
  playerId,
  fromTileId,
  toTileId,
  trigger,
  passGo,
  amount,
}: {
  playerId: PlayerId
  fromTileId: number
  toTileId: number
  trigger: string
  passGo?: boolean
  amount?: number
}): GameEvent => ({
  type: 'PLAYER_MOVED',
  playerId,
  tileIndex: toTileId,
  amount,
  payload: {
    fromIndex: fromTileId,
    fromTileId,
    toIndex: toTileId,
    toTileId,
    passGo: Boolean(passGo),
    trigger,
  },
})

const createLandedEvent = (
  playerId: PlayerId,
  tileIndex: number
): GameEvent => {
  const tile = getTileByIndex(tileIndex)

  return {
    type: 'LANDED',
    playerId,
    tileIndex,
    payload: {
      tileId: tileIndex,
      tile: tile
        ? {
            tileId: tile.index,
            name: tile.name,
            tileType: tile.transportType ?? tile.type,
            price: tile.price ?? 0,
          }
        : undefined,
    },
  }
}

const pickMockChanceEffect = (): MockChanceEffect => {
  const randomIndex = Math.floor(Math.random() * MOCK_CHANCE_EFFECTS.length)
  return MOCK_CHANCE_EFFECTS[randomIndex] ?? MOCK_CHANCE_EFFECTS[0]
}

type LandingResolution = {
  events: GameEvents
  prompt: GamePrompt | null
  phase: Extract<GameSnapshot['phase'], 'prompt' | 'resolving'>
}

const resolveLanding = ({
  player,
  tileIndex,
  allowCardEffect = true,
}: {
  player: Player
  tileIndex: number
  allowCardEffect?: boolean
}): LandingResolution => {
  const tile = getTileByIndex(tileIndex)
  const events: GameEvents = [createLandedEvent(player.id, tileIndex)]

  if (!tile) {
    return { events, prompt: null, phase: 'resolving' }
  }

  if (tile.type === 'go_to_island' || tile.transportType === 'MOVE_TO_ISLAND') {
    const islandTileIndex = getIslandTileIndex()
    const fromTileId = tileIndex
    player.position = islandTileIndex
    player.state = 'locked'
    player.stateDuration = MOCK_ISLAND_LOCK_TURNS
    player.jail_turn_count = MOCK_ISLAND_LOCK_TURNS
    player.is_in_jail = true

    events.push(
      createPlayerMovedEvent({
        playerId: player.id,
        fromTileId,
        toTileId: islandTileIndex,
        trigger: 'move_to_island',
      }),
      createLandedEvent(player.id, islandTileIndex),
      {
        type: 'PLAYER_STATE_CHANGED',
        playerId: player.id,
        payload: {
          playerState: 'locked',
          stateDuration: MOCK_ISLAND_LOCK_TURNS,
          reason: 'move_to_island',
        },
      }
    )

    return { events, prompt: null, phase: 'resolving' }
  }

  if (tile.type === 'island' || tile.transportType === 'ISLAND') {
    player.state = 'locked'
    player.stateDuration = MOCK_ISLAND_LOCK_TURNS
    player.jail_turn_count = MOCK_ISLAND_LOCK_TURNS
    player.is_in_jail = true
    events.push({
      type: 'PLAYER_STATE_CHANGED',
      playerId: player.id,
      payload: {
        playerState: 'locked',
        stateDuration: MOCK_ISLAND_LOCK_TURNS,
        reason: 'island_arrival',
      },
    })
    return { events, prompt: null, phase: 'resolving' }
  }

  if (tile.type === 'travel') {
    return {
      events,
      prompt: buildTravelPrompt(player, tile),
      phase: 'prompt',
    }
  }

  if ((tile.type === 'chance' || tile.type === 'event') && allowCardEffect) {
    const chanceEffect = pickMockChanceEffect()
    events.push({
      type: 'CHANCE_RESOLVED',
      playerId: player.id,
      tileIndex: tile.index,
      payload: {
        tileId: tile.index,
        tileType: tile.type.toUpperCase(),
        chance: chanceEffect,
      },
    })

    if (chanceEffect.type === 'GAIN_MONEY') {
      player.balance += chanceEffect.power
      return { events, prompt: null, phase: 'resolving' }
    }

    if (chanceEffect.type === 'LOSE_MONEY') {
      const hadEnoughBalance = player.balance >= chanceEffect.power
      player.balance = Math.max(0, player.balance - chanceEffect.power)
      if (!hadEnoughBalance) {
        player.is_bankrupt = true
      }
      return { events, prompt: null, phase: 'resolving' }
    }

    if (
      chanceEffect.type === 'MOVE_FORWARD' ||
      chanceEffect.type === 'MOVE_BACKWARD'
    ) {
      const totalTiles = mockGameState.tiles.length
      const fromTileId = player.position
      const rawTargetIndex =
        chanceEffect.type === 'MOVE_BACKWARD'
          ? fromTileId - chanceEffect.power
          : fromTileId + chanceEffect.power
      const toTileId = ((rawTargetIndex % totalTiles) + totalTiles) % totalTiles
      player.position = toTileId

      events.push(
        createPlayerMovedEvent({
          playerId: player.id,
          fromTileId,
          toTileId,
          trigger: 'chance',
        })
      )

      const chained = resolveLanding({
        player,
        tileIndex: toTileId,
        allowCardEffect: false,
      })
      events.push(...chained.events)
      return chained.prompt
        ? { events, prompt: chained.prompt, phase: chained.phase }
        : { events, prompt: null, phase: 'resolving' }
    }

    if (chanceEffect.type === 'MOVE_TO_ISLAND') {
      const islandTileIndex = getIslandTileIndex()
      const fromTileId = player.position
      player.position = islandTileIndex

      events.push(
        createPlayerMovedEvent({
          playerId: player.id,
          fromTileId,
          toTileId: islandTileIndex,
          trigger: 'chance',
        })
      )

      const chained = resolveLanding({
        player,
        tileIndex: islandTileIndex,
        allowCardEffect: false,
      })
      events.push(...chained.events)
      return { events, prompt: null, phase: chained.phase }
    }
  }

  if (!isOwnableTile(tile)) {
    return { events, prompt: null, phase: 'resolving' }
  }

  const tileOwner =
    tile.owner_id == null
      ? null
      : (mockGameState.players.find(
          (candidate) => String(candidate.id) === String(tile.owner_id)
        ) ?? null)

  if (!tileOwner) {
    return {
      events,
      prompt: buildBuyPrompt(player, tile),
      phase: 'prompt',
    }
  }

  if (String(tileOwner.id) === String(player.id) && (tile.building ?? 0) < 3) {
    return {
      events,
      prompt: buildBuildPrompt(player, tile),
      phase: 'prompt',
    }
  }

  if (String(tileOwner.id) !== String(player.id)) {
    return {
      events,
      prompt: buildTollPrompt(player, tileOwner, tile, getTileTollAmount(tile)),
      phase: 'prompt',
    }
  }

  return { events, prompt: null, phase: 'resolving' }
}

const getActivePlayersByAssets = () => {
  const alivePlayers = mockGameState.players.filter(
    (player) => !player.is_bankrupt
  )
  return [...alivePlayers].sort((left, right) => {
    const leftAssets = left.totalAssets ?? 0
    const rightAssets = right.totalAssets ?? 0
    if (leftAssets !== rightAssets) {
      return rightAssets - leftAssets
    }
    return right.balance - left.balance
  })
}

const buildGameResultPayload = (
  reason: GameSnapshot['gameResult'] extends infer T
    ? T extends { reason: infer R }
      ? R
      : never
    : never
) => {
  const sortedPlayers = getActivePlayersByAssets()
  const rankings = sortedPlayers.map((player, index) => ({
    rank: index + 1,
    player_id: player.id,
    nickname: player.nickname,
    final_assets: player.totalAssets ?? player.balance,
    is_winner: index === 0,
  }))
  const winner = sortedPlayers[0]

  return {
    reason,
    rankings,
    winner: winner
      ? {
          playerId: winner.id,
          nickname: winner.nickname,
          balance: winner.balance,
          assets: winner.totalAssets ?? winner.balance,
        }
      : null,
  } as NonNullable<GameSnapshot['gameResult']>
}

const markGameOver = (
  reason: NonNullable<GameSnapshot['gameResult']>['reason']
) => {
  const gameResult = buildGameResultPayload(reason)
  mockGameState.gameResult = gameResult
  mockGameState.isGameOver = true
  mockGameState.winnerId = gameResult.winner?.playerId ?? null
  mockGameState.phase = 'finished'
  mockGameState.prompt = null
  mockGameState.promptIssuedAtMs = null
  mockGameState.pendingBonusTurnPlayerId = null
  return gameResult
}

const createGameOverEvent = (
  gameResult: NonNullable<GameSnapshot['gameResult']>
): GameEvent => ({
  type: 'GAME_OVER',
  reason: gameResult.reason,
  payload: {
    reason: gameResult.reason,
    winner: gameResult.winner,
    rankings: gameResult.rankings,
  },
})

const maybeMarkGameOverByStanding = () => {
  const activePlayers = mockGameState.players.filter(
    (player) => !player.is_bankrupt
  )

  if (activePlayers.length <= 1) {
    return markGameOver('last_player_standing')
  }

  return null
}

const emitPromptResponseRejected = ({
  actionId,
  promptId,
  code,
  message,
}: {
  actionId: string
  promptId: string
  code:
    | 'PROMPT_NOT_FOUND'
    | 'PROMPT_EXPIRED'
    | 'INVALID_PROMPT_CHOICE'
    | 'NOT_PROMPT_OWNER'
    | 'INVALID_PHASE'
  message: string
}) => {
  emitGameError({
    code,
    message,
    actionId,
  })

  emitGameAck({
    actionId,
    type: PROMPT_RESPONSE_ACK_TYPE,
    ok: false,
    promptId,
    error: {
      code,
      message,
    },
  })
}

export const mockDevSetPromptForTest = (prompt: GamePrompt | null) => {
  if (prompt) {
    mockGameState.prompt = structuredClone(prompt)
    mockGameState.promptIssuedAtMs = Date.now()
    mockGameState.phase = 'prompt'
    return
  }

  clearMockPrompt()
}

export const mockDevSetPhaseForTest = (phase: GameSnapshot['phase']) => {
  mockGameState.phase = phase
}

export const mockDevSetRevisionForTest = (revision: number) => {
  if (!Number.isFinite(revision)) {
    return
  }

  mockGameState.revision = Math.max(1, Math.trunc(revision))
}

const handleRollDiceAction = (action: MockResolvedGameAction) => {
  if (mockGameState.phase !== 'rolling') {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'INVALID_PHASE',
        message: '주사위는 턴 시작 phase에서만 굴릴 수 있습니다.',
      },
    })
    return
  }

  const currentPlayer = getCurrentPlayer()

  if (!currentPlayer) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'PLAYER_NOT_FOUND',
        message: '현재 턴 플레이어를 찾을 수 없습니다.',
      },
    })
    return
  }

  const dice1 = Math.floor(Math.random() * 6) + 1
  const dice2 = Math.floor(Math.random() * 6) + 1
  const isDouble = dice1 === dice2
  const total = dice1 + dice2
  const nextEvents: GameEvents = [
    {
      type: 'DICE_ROLLED',
      playerId: currentPlayer.id,
      payload: {
        dice: [dice1, dice2],
        total,
        isDouble,
        is_double: isDouble,
        doubleCount: isDouble ? 1 : 0,
        double_count: isDouble ? 1 : 0,
      },
    },
  ]

  const isLockedPlayer =
    currentPlayer.is_in_jail ||
    currentPlayer.state === 'locked' ||
    currentPlayer.state === 'island'

  if (isLockedPlayer && !isDouble) {
    const currentDuration = Math.max(
      currentPlayer.stateDuration ?? currentPlayer.jail_turn_count ?? 3,
      0
    )
    const nextDuration = Math.max(currentDuration - 1, 0)
    currentPlayer.stateDuration = nextDuration
    currentPlayer.jail_turn_count = nextDuration
    currentPlayer.is_in_jail = nextDuration > 0
    currentPlayer.state = nextDuration > 0 ? 'locked' : 'normal'

    nextEvents.push({
      type: 'PLAYER_STATE_CHANGED',
      playerId: currentPlayer.id,
      payload: {
        playerState: currentPlayer.state,
        stateDuration: nextDuration,
        reason: nextDuration > 0 ? 'island_wait' : 'island_timeout',
      },
    })

    clearMockPrompt()
    mockGameState.phase = 'resolving'
    mockGameState.pendingBonusTurnPlayerId = null
    recalculatePlayerAssets()

    const gameResult = maybeMarkGameOverByStanding()
    if (gameResult) {
      nextEvents.push(createGameOverEvent(gameResult))
    }

    const revision = nextRevision()
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: true,
      revision,
      payload: {
        dice: [dice1, dice2],
        total,
        isDouble,
      },
    })
    emitSnapshotPatch(action.gameId, nextEvents)
    return
  }

  if (isLockedPlayer && isDouble) {
    currentPlayer.state = 'normal'
    currentPlayer.stateDuration = 0
    currentPlayer.jail_turn_count = 0
    currentPlayer.is_in_jail = false
    nextEvents.push({
      type: 'PLAYER_STATE_CHANGED',
      playerId: currentPlayer.id,
      payload: {
        playerState: 'normal',
        stateDuration: 0,
        reason: 'island_double_escape',
      },
    })
  }

  const fromIndex = currentPlayer.position
  const toIndex = (fromIndex + total) % mockGameState.tiles.length
  const passGo = fromIndex + total >= mockGameState.tiles.length

  currentPlayer.position = toIndex
  if (passGo) {
    currentPlayer.balance += MOCK_PASS_GO_SALARY
    nextEvents.push({
      type: 'PASSED_START',
      playerId: currentPlayer.id,
      amount: MOCK_PASS_GO_SALARY,
      payload: {
        salary: MOCK_PASS_GO_SALARY,
      },
    })
  }

  nextEvents.push(
    createPlayerMovedEvent({
      playerId: currentPlayer.id,
      fromTileId: fromIndex,
      toTileId: toIndex,
      trigger: 'normal',
      passGo,
      amount: passGo ? MOCK_PASS_GO_SALARY : undefined,
    })
  )

  const landingResult = resolveLanding({
    player: currentPlayer,
    tileIndex: toIndex,
  })
  nextEvents.push(...landingResult.events)

  if (landingResult.prompt) {
    mockGameState.prompt = landingResult.prompt
    mockGameState.promptIssuedAtMs = Date.now()
    mockGameState.phase = 'prompt'
  } else {
    clearMockPrompt()
    mockGameState.phase = 'resolving'
  }

  const isStillLocked =
    currentPlayer.state === 'locked' ||
    currentPlayer.state === 'island' ||
    currentPlayer.is_in_jail
  mockGameState.pendingBonusTurnPlayerId =
    isDouble && !isStillLocked && !currentPlayer.is_bankrupt
      ? currentPlayer.id
      : null
  recalculatePlayerAssets()

  const gameResult = maybeMarkGameOverByStanding()
  if (gameResult) {
    nextEvents.push(createGameOverEvent(gameResult))
  }

  const revision = nextRevision()

  emitGameAck({
    actionId: action.actionId,
    type: action.type,
    ok: true,
    revision,
    payload: {
      dice: [dice1, dice2],
      total,
      isDouble,
    },
  })

  emitSnapshotPatch(action.gameId, nextEvents)
}

const handleBuyPropertyAction = (action: MockResolvedGameAction) => {
  const tileIndex = Number(action.payload?.tileId)
  const player = getCurrentPlayer()
  const tile = getTileByIndex(tileIndex)

  if (!player || !isOwnableTile(tile)) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'TILE_NOT_OWNABLE',
        message: '구매할 수 없는 타일입니다.',
      },
    })
    return
  }

  if (tile.owner_id) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: { code: 'TILE_ALREADY_OWNED', message: '이미 소유된 타일입니다.' },
    })
    return
  }

  const price = tile.price ?? 0
  if (player.balance < price) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: '보유 금액이 부족합니다.',
      },
    })
    return
  }

  player.balance -= price
  tile.owner_id = player.id
  tile.ownerId = player.id
  tile.building = 0
  ensureOwnedTiles(player, tileIndex)
  const revision = nextRevision()

  emitGameAck({
    actionId: action.actionId,
    type: action.type,
    ok: true,
    revision,
  })

  emitSnapshotPatch(action.gameId, [
    {
      type: 'BOUGHT_PROPERTY',
      playerId: player.id,
      tileIndex,
      amount: price,
    },
  ])
}

const handleSellPropertyAction = (action: MockResolvedGameAction) => {
  const tileIndex = Number(action.payload?.tileId)
  const buildingLevel =
    typeof action.payload?.buildingLevel === 'number'
      ? action.payload.buildingLevel
      : undefined
  const player = getCurrentPlayer()
  const tile = getTileByIndex(tileIndex)

  if (!player || !isOwnableTile(tile)) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'TILE_NOT_SELLABLE',
        message: '매각할 수 없는 타일입니다.',
      },
    })
    return
  }

  if (String(tile.owner_id) !== String(player.id)) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'FORBIDDEN_SELL',
        message: '본인 소유 타일만 매각할 수 있습니다.',
      },
    })
    return
  }

  const { refund, nextBuilding, releaseOwnership } = getSellRefund(
    tile,
    buildingLevel
  )
  player.balance += refund
  tile.building = nextBuilding

  if (releaseOwnership) {
    tile.owner_id = null
    tile.ownerId = null
    removeOwnedTile(player, tileIndex)
  }

  const revision = nextRevision()

  emitGameAck({
    actionId: action.actionId,
    type: action.type,
    ok: true,
    revision,
  })

  emitSnapshotPatch(action.gameId, [
    {
      type: 'SOLD_PROPERTY',
      playerId: player.id,
      tileIndex,
      amount: refund,
      payload: {
        buildingLevel: tile.building,
        releaseOwnership,
      },
    },
  ])
}

const handleBuildPropertyAction = (action: MockResolvedGameAction) => {
  const tileIndex = Number(action.payload?.tileId)
  const player = getCurrentPlayer()
  const tile = getTileByIndex(tileIndex)

  if (!player || !isOwnableTile(tile)) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'TILE_NOT_UPGRADABLE',
        message: '건설할 수 없는 타일입니다.',
      },
    })
    return
  }

  if (String(tile.owner_id) !== String(player.id)) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'FORBIDDEN_BUILD',
        message: '본인 소유 타일만 건설할 수 있습니다.',
      },
    })
    return
  }

  if (tile.building >= 3) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'MAX_LEVEL_REACHED',
        message: '이미 최대 단계입니다.',
      },
    })
    return
  }

  const buildCost = getTileBuildCost(tile)
  if (buildCost <= 0) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'INVALID_BUILD_LEVEL',
        message: '더 이상 건설할 수 없는 단계입니다.',
      },
    })
    return
  }

  if (player.balance < buildCost) {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: '보유 금액이 부족합니다.',
      },
    })
    return
  }

  player.balance -= buildCost
  tile.building = (tile.building + 1) as BuildingLevel
  const revision = nextRevision()

  emitGameAck({
    actionId: action.actionId,
    type: action.type,
    ok: true,
    revision,
  })

  emitSnapshotPatch(action.gameId, [
    {
      type: 'BOUGHT_BUILDING', // 또는 UPGRADED_PROPERTY
      playerId: player.id,
      tileIndex,
      amount: buildCost,
      payload: {
        buildingLevel: tile.building,
      },
    },
  ])
}

const handleEndTurnAction = (action: MockResolvedGameAction) => {
  if (mockGameState.phase !== 'resolving') {
    emitGameAck({
      actionId: action.actionId,
      type: action.type,
      ok: false,
      error: {
        code: 'INVALID_PHASE',
        message: '턴 종료가 가능한 phase가 아닙니다.',
      },
    })
    return
  }

  const previousPlayerId = mockGameState.currentTurn
  const previousRound = mockGameState.round
  const hadBonusTurn =
    mockGameState.pendingBonusTurnPlayerId != null &&
    String(mockGameState.pendingBonusTurnPlayerId) === String(previousPlayerId)

  if (!hadBonusTurn) {
    advanceMockTurn()
  }

  mockGameState.pendingBonusTurnPlayerId = null
  clearMockPrompt()
  mockGameState.phase = 'rolling'

  recalculatePlayerAssets()

  let gameResult: NonNullable<GameSnapshot['gameResult']> | null = null
  if (!hadBonusTurn && mockGameState.round > MOCK_MAX_ROUNDS) {
    gameResult = markGameOver('max_rounds')
  } else {
    gameResult = maybeMarkGameOverByStanding()
  }

  const turnNumber = mockGameState.revision + 1
  const nextEvents: GameEvents = [
    {
      type: 'TURN_ENDED',
      playerId: previousPlayerId,
      nextPlayerId: mockGameState.currentTurn,
      turn: turnNumber,
      round: mockGameState.round,
      reason: hadBonusTurn ? 'double_roll' : 'manual_end_turn',
      bonusTurn: hadBonusTurn,
      payload: {
        playerId: previousPlayerId,
        nextPlayerId: mockGameState.currentTurn,
        turn: turnNumber,
        round: mockGameState.round,
        reason: hadBonusTurn ? 'double_roll' : 'manual_end_turn',
        bonusTurn: hadBonusTurn,
        previousRound,
      },
    },
  ]

  if (gameResult) {
    nextEvents.push(createGameOverEvent(gameResult))
  }

  const revision = nextRevision()

  emitGameAck({
    actionId: action.actionId,
    type: action.type,
    ok: true,
    revision,
  })

  emitSnapshotPatch(action.gameId, nextEvents)
}

export const mockEmitGameSync = ({
  gameId,
  knownRevision,
}: MockGameSyncPayload) => {
  const resolvedGameId = resolveRequiredGameId({ gameId })
  if (!resolvedGameId) {
    return
  }

  const resolvedRoomId = resolveRoomIdFromGameId(resolvedGameId)
  const normalizedKnownRevision =
    typeof knownRevision === 'number' && Number.isFinite(knownRevision)
      ? Math.trunc(knownRevision)
      : null
  const shouldForceFullSnapshot =
    normalizedKnownRevision == null || normalizedKnownRevision < 0
  const shouldResetForGame =
    mockGameContext.gameId !== resolvedGameId || shouldForceFullSnapshot

  if (shouldResetForGame) {
    resetMockGameState({
      gameId: resolvedGameId,
      roomId: resolvedRoomId,
    })
  }

  setTimeout(() => {
    const serverRevision = mockGameState.revision

    if (shouldForceFullSnapshot) {
      emitSnapshotPatch(resolvedGameId)
      return
    }

    const revisionGap = serverRevision - normalizedKnownRevision

    if (
      normalizedKnownRevision > serverRevision ||
      revisionGap > SYNC_SNAPSHOT_GAP_THRESHOLD
    ) {
      emitSnapshotPatch(resolvedGameId)
      return
    }

    if (revisionGap === 0) {
      emitGamePatch({
        revision: serverRevision,
        patch: [],
        events: [
          {
            type: 'SYNCED',
            payload: {
              knownRevision: normalizedKnownRevision,
              serverRevision,
            },
          },
        ],
      })
      return
    }

    emitGamePatch({
      revision: serverRevision,
      patch: buildStatePatch(resolvedGameId),
      events: [
        {
          type: 'SYNCED',
          payload: {
            knownRevision: normalizedKnownRevision,
            serverRevision,
            mode: 'DIFF',
          },
        },
      ],
    })
  }, 0)
}

export const mockEmitGameSyncTimer = ({ gameId }: MockGameSyncTimerPayload) => {
  const resolvedGameId = resolveRequiredGameId({ gameId })
  if (!resolvedGameId) {
    return
  }

  const promptRemainingSec =
    mockGameState.prompt &&
    typeof mockGameState.prompt.timeoutSec === 'number' &&
    mockGameState.prompt.timeoutSec > 0 &&
    typeof mockGameState.promptIssuedAtMs === 'number'
      ? Math.max(
          0,
          Math.ceil(
            mockGameState.prompt.timeoutSec -
              (Date.now() - mockGameState.promptIssuedAtMs) / 1000
          )
        )
      : null

  emitSocketEvent('game:timer_sync', {
    gameId: resolvedGameId,
    turnRemainingSec: MOCK_TURN_TIMEOUT_SEC,
    promptId: mockGameState.prompt?.id ?? null,
    promptRemainingSec,
    syncedAt: new Date().toISOString(),
  })
}

export const mockEmitGameAction = ({
  actionId = `mock-action-${Date.now()}`,
  type,
  gameId,
  payload,
}: MockGameActionPayload) => {
  const resolvedGameId = resolveRequiredGameId({ gameId, actionId, type })
  if (!resolvedGameId) {
    return actionId
  }

  const action: MockResolvedGameAction = {
    actionId,
    type,
    gameId: resolvedGameId,
    payload,
  }

  setTimeout(() => {
    switch (type) {
      case 'ROLL_DICE':
        handleRollDiceAction(action)
        break
      case 'BUY_PROPERTY':
        handleBuyPropertyAction(action)
        break
      case 'SELL_PROPERTY':
        handleSellPropertyAction(action)
        break
      case 'CITY_BUILD':
        handleBuildPropertyAction(action)
        break
      case 'END_TURN':
        handleEndTurnAction(action)
        break
      default:
        emitGameError({
          code: 'UNSUPPORTED_GAME_ACTION',
          message: `지원하지 않는 게임 액션입니다: ${type}`,
          actionId,
        })
        emitGameAck({
          actionId,
          type,
          ok: false,
          error: {
            code: 'UNSUPPORTED_GAME_ACTION',
            message: '지원하지 않는 게임 액션입니다.',
          },
        })
    }
  }, 0)

  return actionId
}

export const mockEmitPromptResponse = ({
  gameId,
  promptId,
  choice,
  payload,
}: MockPromptResponsePayload) => {
  const actionId = `${PROMPT_RESPONSE_ACTION_PREFIX}-${Date.now()}`
  const resolvedGameId = resolveRequiredGameId({
    gameId,
    actionId,
    type: PROMPT_RESPONSE_ACK_TYPE,
  })

  if (!resolvedGameId) {
    return
  }

  const activePrompt = mockGameState.prompt
  if (!activePrompt || activePrompt.id !== promptId) {
    emitPromptResponseRejected({
      actionId,
      promptId,
      code: 'PROMPT_NOT_FOUND',
      message: '유효하지 않은 prompt 응답입니다.',
    })
    return
  }

  if (mockGameState.phase !== 'prompt') {
    emitPromptResponseRejected({
      actionId,
      promptId,
      code: 'INVALID_PHASE',
      message: 'prompt를 처리할 수 없는 phase입니다.',
    })
    return
  }

  if (
    activePrompt.playerId != null &&
    String(activePrompt.playerId) !== String(mockGameState.currentTurn)
  ) {
    emitPromptResponseRejected({
      actionId,
      promptId,
      code: 'NOT_PROMPT_OWNER',
      message: '현재 플레이어는 해당 prompt 응답 권한이 없습니다.',
    })
    return
  }

  if (isPromptExpired(activePrompt)) {
    clearMockPrompt()
    emitPromptResponseRejected({
      actionId,
      promptId,
      code: 'PROMPT_EXPIRED',
      message: 'prompt 응답 유효시간이 만료되었습니다.',
    })
    return
  }

  const normalizedChoice = normalizePromptChoice(choice)
  const allowedChoices = resolvePromptAllowedChoices(activePrompt)
  if (!normalizedChoice || !allowedChoices?.includes(normalizedChoice)) {
    emitPromptResponseRejected({
      actionId,
      promptId,
      code: 'INVALID_PROMPT_CHOICE',
      message: '허용되지 않은 prompt choice입니다.',
    })
    return
  }

  const promptType = normalizePromptType(activePrompt)
  const respondingPlayer = getCurrentPlayer()
  const targetTileIndex = resolvePromptTileIndex(activePrompt)
  const targetTile =
    typeof targetTileIndex === 'number'
      ? getTileByIndex(targetTileIndex)
      : undefined
  const promptAmount = resolvePromptAmount(activePrompt)
  const responsePayload = payload && typeof payload === 'object' ? payload : {}
  const nextEvents: GameEvents = [
    {
      type: 'PROMPT_RESPONSE',
      payload: { choice: normalizedChoice, promptId, ...responsePayload },
    },
  ]
  let nextPrompt: GamePrompt | null = null
  let nextPhase: Extract<GameSnapshot['phase'], 'prompt' | 'resolving'> =
    'resolving'

  if (promptType === 'BUY_OR_SKIP') {
    if (
      normalizedChoice === 'BUY' &&
      respondingPlayer &&
      targetTile &&
      isOwnableTile(targetTile) &&
      !targetTile.owner_id
    ) {
      const price = targetTile.price ?? 0
      if (respondingPlayer.balance >= price) {
        respondingPlayer.balance -= price
        targetTile.owner_id = respondingPlayer.id
        targetTile.ownerId = respondingPlayer.id
        targetTile.building = 0
        ensureOwnedTiles(respondingPlayer, targetTile.index)
        nextEvents.push({
          type: 'BOUGHT_PROPERTY',
          playerId: respondingPlayer.id,
          tileIndex: targetTile.index,
          amount: price,
          payload: {
            tileId: targetTile.index,
            amount: price,
          },
        })

        const buildCost = getTileBuildCost(targetTile)
        if (buildCost > 0 && targetTile.building < 3) {
          nextPrompt = buildBuildPrompt(respondingPlayer, targetTile)
          nextPhase = 'prompt'
        }
      } else {
        nextEvents.push({
          type: 'INSUFFICIENT_FUNDS',
          playerId: respondingPlayer.id,
          tileIndex: targetTile.index,
          amount: price,
          payload: {
            amount: price,
            reason: 'buy_property',
          },
        })
      }
    }
  }

  if (promptType === 'BUILD_OR_SKIP') {
    if (
      normalizedChoice === 'BUILD' &&
      respondingPlayer &&
      targetTile &&
      isOwnableTile(targetTile) &&
      String(targetTile.owner_id) === String(respondingPlayer.id)
    ) {
      const buildCost = getTileBuildCost(targetTile)
      if (buildCost > 0 && respondingPlayer.balance >= buildCost) {
        respondingPlayer.balance -= buildCost
        targetTile.building = Math.min(
          (targetTile.building ?? 0) + 1,
          3
        ) as BuildingLevel
        nextEvents.push({
          type: 'BOUGHT_BUILDING',
          playerId: respondingPlayer.id,
          tileIndex: targetTile.index,
          amount: buildCost,
          payload: {
            tileId: targetTile.index,
            buildCost,
            buildingLevel: targetTile.building,
          },
        })
      } else if (buildCost > 0) {
        nextEvents.push({
          type: 'INSUFFICIENT_FUNDS',
          playerId: respondingPlayer.id,
          tileIndex: targetTile.index,
          amount: buildCost,
          payload: {
            amount: buildCost,
            reason: 'build_property',
          },
        })
      }
    }
  }

  if (promptType === 'PAY_TOLL') {
    if (
      respondingPlayer &&
      promptAmount > 0 &&
      targetTile &&
      isOwnableTile(targetTile)
    ) {
      const owner =
        targetTile.owner_id == null
          ? null
          : (mockGameState.players.find(
              (player) => String(player.id) === String(targetTile.owner_id)
            ) ?? null)
      const paidAmount = Math.min(
        promptAmount,
        Math.max(respondingPlayer.balance, 0)
      )
      respondingPlayer.balance = Math.max(
        0,
        respondingPlayer.balance - paidAmount
      )
      if (owner) {
        owner.balance += paidAmount
      }

      if (paidAmount < promptAmount) {
        respondingPlayer.is_bankrupt = true
        respondingPlayer.state = 'bankrupt'
        respondingPlayer.stateDuration = 0
        respondingPlayer.jail_turn_count = 0
        respondingPlayer.is_in_jail = false
        nextEvents.push({
          type: 'PLAYER_STATE_CHANGED',
          playerId: respondingPlayer.id,
          payload: {
            playerState: 'bankrupt',
            reason: 'toll_bankrupt',
          },
        })
      } else if (owner && String(owner.id) !== String(respondingPlayer.id)) {
        nextPrompt = buildAcquisitionPrompt(respondingPlayer, owner, targetTile)
        nextPhase = 'prompt'
      }

      nextEvents.push({
        type: 'PAID_TOLL',
        playerId: respondingPlayer.id,
        tileIndex: targetTile.index,
        amount: paidAmount,
        payload: {
          amount: paidAmount,
          expectedAmount: promptAmount,
          ownerId: owner?.id ?? null,
        },
      })
    }
  }

  if (promptType === 'ACQUISITION_OR_SKIP') {
    if (
      normalizedChoice === 'ACQUIRE' &&
      respondingPlayer &&
      targetTile &&
      isOwnableTile(targetTile) &&
      targetTile.owner_id != null &&
      String(targetTile.owner_id) !== String(respondingPlayer.id)
    ) {
      const owner = mockGameState.players.find(
        (player) => String(player.id) === String(targetTile.owner_id)
      )
      const acquisitionCost =
        promptAmount > 0 ? promptAmount : (targetTile.price ?? 0)

      if (owner && respondingPlayer.balance >= acquisitionCost) {
        respondingPlayer.balance -= acquisitionCost
        owner.balance += acquisitionCost
        removeOwnedTile(owner, targetTile.index)
        targetTile.owner_id = respondingPlayer.id
        targetTile.ownerId = respondingPlayer.id
        ensureOwnedTiles(respondingPlayer, targetTile.index)

        nextEvents.push({
          type: 'ACQUIRED_PROPERTY',
          playerId: respondingPlayer.id,
          tileIndex: targetTile.index,
          amount: acquisitionCost,
          payload: {
            tileId: targetTile.index,
            fromPlayerId: owner.id,
            toPlayerId: respondingPlayer.id,
            amount: acquisitionCost,
          },
        })
      } else {
        nextEvents.push({
          type: 'INSUFFICIENT_FUNDS',
          playerId: respondingPlayer.id,
          tileIndex: targetTile.index,
          amount: acquisitionCost,
          payload: {
            amount: acquisitionCost,
            reason: 'acquire_property',
          },
        })
      }
    }
  }

  if (promptType === 'TRAVEL_SELECT') {
    if (normalizedChoice === 'CONFIRM') {
      const rawTargetTileId =
        responsePayload.targetTileId ?? responsePayload.toTileId
      const targetTileId =
        typeof rawTargetTileId === 'number' && Number.isFinite(rawTargetTileId)
          ? Math.trunc(rawTargetTileId)
          : Number.NaN

      if (
        respondingPlayer &&
        Number.isFinite(targetTileId) &&
        targetTileId >= 0 &&
        targetTileId < mockGameState.tiles.length &&
        targetTileId !== respondingPlayer.position
      ) {
        const fromTileId = respondingPlayer.position
        respondingPlayer.position = targetTileId

        nextEvents.push(
          createPlayerMovedEvent({
            playerId: respondingPlayer.id,
            fromTileId,
            toTileId: targetTileId,
            trigger: 'travel_select',
          })
        )

        const travelLanding = resolveLanding({
          player: respondingPlayer,
          tileIndex: targetTileId,
        })
        nextEvents.push(...travelLanding.events)
        if (travelLanding.prompt) {
          nextPrompt = travelLanding.prompt
          nextPhase = travelLanding.phase
        }
      }
    }
  }

  clearMockPrompt()
  if (nextPrompt) {
    mockGameState.prompt = nextPrompt
    mockGameState.promptIssuedAtMs = Date.now()
    mockGameState.phase = 'prompt'
  } else {
    mockGameState.phase = nextPhase
  }

  recalculatePlayerAssets()
  const gameResult = maybeMarkGameOverByStanding()
  if (gameResult) {
    nextEvents.push(createGameOverEvent(gameResult))
  }

  const revision = nextRevision()

  emitGameAck({
    actionId,
    type: PROMPT_RESPONSE_ACK_TYPE,
    ok: true,
    revision,
    promptId,
  })

  emitSnapshotPatch(resolvedGameId, nextEvents)
}

export const gameHandlers = [
  http.post('/api/game/:roomId/roll-dice', async ({ request }) => {
    const { player_id } = (await request.json()) as DiceRequestBody

    const dice1 = Math.floor(Math.random() * 6) + 1
    const dice2 = Math.floor(Math.random() * 6) + 1
    const isDouble = dice1 === dice2
    const total = dice1 + dice2

    setTimeout(() => {
      emitSocketEvent('dice_rolled', {
        player_id,
        dice: [dice1, dice2],
        is_double: isDouble,
        double_count: isDouble ? 1 : 0,
      })

      const currentPlayer = mockGameState.players.find(
        (player) => String(player.id) === String(player_id)
      )
      const fromIndex = currentPlayer?.position ?? 0
      const toIndex = (fromIndex + total) % mockGameState.tiles.length
      const passGo = fromIndex + total >= mockGameState.tiles.length

      if (currentPlayer) {
        currentPlayer.position = toIndex
        if (passGo) {
          currentPlayer.balance += MOCK_PASS_GO_SALARY
        }
      }

      setTimeout(() => {
        emitSocketEvent('player_moved', {
          player_id,
          from_index: fromIndex,
          to_index: toIndex,
          trigger: 'dice',
          pass_go: passGo,
          pass_go_salary: MOCK_PASS_GO_SALARY,
        })
        emitLegacyGameState()
      }, 800)
    }, 100)

    return HttpResponse.json({
      success: true,
      dice: [dice1, dice2],
    })
  }),

  http.get('/api/game/:roomId/state', async ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('reset') === 'true') {
      resetMockGameState()
    }

    await delay(150)
    return HttpResponse.json(buildStateResponse())
  }),

  http.post('/api/game/:roomId/buy', async ({ request }) => {
    const { tile_index } = (await request.json()) as TileActionRequestBody
    const player = getCurrentPlayer()
    const tile = getTileByIndex(tile_index)

    if (!player || !isOwnableTile(tile)) {
      return buildErrorResponse(
        '\uAD6C\uB9E4\uD560 \uC218 \uC5C6\uB294 \uD0C0\uC77C\uC785\uB2C8\uB2E4.',
        404
      )
    }

    if (tile.owner_id) {
      return buildErrorResponse(
        '\uC774\uBBF8 \uC18C\uC720\uB41C \uD0C0\uC77C\uC785\uB2C8\uB2E4.',
        409
      )
    }

    const price = tile.price ?? 0
    if (player.balance < price) {
      return buildErrorResponse(
        '\uBCF4\uC720 \uAE08\uC561\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4.',
        409
      )
    }

    player.balance -= price
    tile.owner_id = player.id
    tile.ownerId = player.id
    tile.building = 0
    ensureOwnedTiles(player, tile_index)
    advanceMockTurn()

    setTimeout(() => {
      emitSocketEvent('tile_purchased', {
        player_id: player.id,
        tile_index,
        tile_name: tile.name,
        price,
      })
      emitLegacyGameState()
      emitLegacyTurnStart()
    }, 0)

    await delay(150)
    return HttpResponse.json({
      success: true,
      tile_index,
      state: buildStateResponse(),
    })
  }),

  http.post('/api/game/:roomId/build', async ({ request }) => {
    const { tile_index } = (await request.json()) as TileActionRequestBody
    const player = getCurrentPlayer()
    const tile = getTileByIndex(tile_index)

    if (!player || !isOwnableTile(tile)) {
      return buildErrorResponse(
        '\uAC74\uC124\uD560 \uC218 \uC5C6\uB294 \uD0C0\uC77C\uC785\uB2C8\uB2E4.',
        404
      )
    }

    if (String(tile.owner_id) !== String(player.id)) {
      return buildErrorResponse(
        '\uBCF8\uC778 \uC18C\uC720 \uD0C0\uC77C\uB9CC \uAC74\uC124\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
        403
      )
    }

    if (tile.building >= 3) {
      return buildErrorResponse(
        '\uCD5C\uB300 \uB2E8\uACC4\uAE4C\uC9C0 \uAC74\uC124\uD588\uC2B5\uB2C8\uB2E4.',
        409
      )
    }

    const buildCost = getTileBuildCost(tile)
    if (buildCost <= 0 || player.balance < buildCost) {
      return buildErrorResponse(
        '\uAC74\uC124 \uBE44\uC6A9\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4.',
        409
      )
    }

    player.balance -= buildCost
    tile.building = (tile.building + 1) as BuildingLevel
    advanceMockTurn()

    setTimeout(() => {
      emitLegacyGameState()
      emitLegacyTurnStart()
    }, 0)

    await delay(150)
    return HttpResponse.json({
      success: true,
      tile_index,
      building: tile.building,
      state: buildStateResponse(),
    })
  }),

  http.post('/api/game/:roomId/sell', async ({ request }) => {
    const { tile_index, level } =
      (await request.json()) as TileActionRequestBody
    const player = getCurrentPlayer()
    const tile = getTileByIndex(tile_index)

    if (!player || !isOwnableTile(tile)) {
      return buildErrorResponse(
        '\uB9E4\uAC01\uD560 \uC218 \uC5C6\uB294 \uD0C0\uC77C\uC785\uB2C8\uB2E4.',
        404
      )
    }

    if (String(tile.owner_id) !== String(player.id)) {
      return buildErrorResponse(
        '\uBCF8\uC778 \uC18C\uC720 \uD0C0\uC77C\uB9CC \uB9E4\uAC01\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
        403
      )
    }

    const { refund, nextBuilding, releaseOwnership } = getSellRefund(
      tile,
      level
    )

    player.balance += refund
    tile.building = nextBuilding

    if (releaseOwnership) {
      tile.owner_id = null
      tile.ownerId = null
      removeOwnedTile(player, tile_index)
    }

    setTimeout(() => {
      emitLegacyGameState()
    }, 0)

    await delay(150)
    return HttpResponse.json({
      success: true,
      tile_index,
      refund,
      building: tile.building,
      owner_id: tile.owner_id ?? null,
      state: buildStateResponse(),
    })
  }),
]
