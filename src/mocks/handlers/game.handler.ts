import { delay, http, HttpResponse } from 'msw'
import { socket } from '../../lib/socket'
import type {
  BuildingLevel,
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
  GlobalEffectType,
} from '../../types/domain'
import { mockMessages, mockPlayers, mockTiles } from '../gameMockData'

const MOCK_PLAYER_ID = 'mock-player-1'
const MOCK_BUILD_COST = 30
const MOCK_PASS_GO_SALARY = 200
const MOCK_TURN_TIMEOUT_SEC = 30
const SYNC_SNAPSHOT_GAP_THRESHOLD = 200
const PROMPT_RESPONSE_ACK_TYPE = 'PROMPT_RESPONSE'
const PROMPT_RESPONSE_ACTION_PREFIX = 'prompt-response'

const PROMPT_CHOICE_CANONICAL_MAP: Record<string, readonly string[]> = {
  BUY_OR_SKIP: ['BUY', 'SKIP'],
  CONFIRM_ONLY: ['CONFIRM'],
  PAY_TOLL: ['PAY_TOLL'],
  TRAVEL_SELECT: ['CONFIRM', 'SKIP'],
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

const createInitialGameState = (): GameStateResponse => ({
  players: clonePlayers(),
  tiles: cloneTiles(),
  messages: cloneMessages(),
  currentTurn: MOCK_PLAYER_ID,
  round: 1,
  revision: 1,
  phase: 'waiting',
  prompt: null,
  promptIssuedAtMs: null,
  activeGlobalEffect: null,
})

const mockGameState: GameStateResponse = createInitialGameState()

const resetMockGameState = () => {
  const initialState = createInitialGameState()
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
  roomId: null,
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
  gameResult: null,
  isGameOver: false,
  winnerId: null,
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
  { op: 'set', path: 'roomId', value: null },
  { op: 'set', path: 'gameId', value: gameId },
  { op: 'set', path: 'phase', value: mockGameState.phase },
  { op: 'set', path: 'players', value: structuredClone(mockGameState.players) },
  { op: 'set', path: 'tiles', value: structuredClone(mockGameState.tiles) },
  { op: 'set', path: 'currentPlayerId', value: mockGameState.currentTurn },
  { op: 'set', path: 'currentTurn', value: mockGameState.currentTurn },
  { op: 'set', path: 'round', value: mockGameState.round },
  { op: 'set', path: 'turnTimeoutSec', value: MOCK_TURN_TIMEOUT_SEC },
  { op: 'set', path: 'prompt', value: structuredClone(mockGameState.prompt) },
  { op: 'set', path: 'gameResult', value: null },
  { op: 'set', path: 'isGameOver', value: false },
  { op: 'set', path: 'winnerId', value: null },
  {
    op: 'set',
    path: 'activeGlobalEffect',
    value: structuredClone(mockGameState.activeGlobalEffect),
  },
  {
    op: 'set',
    path: 'session',
    value: {
      roomId: null,
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

const isModalLandingTile = (tile: Tile | undefined) =>
  !!tile &&
  ['chance', 'event', 'travel', 'ai', 'island', 'go_to_island'].includes(
    tile.type
  )

const getSellRefund = (tile: Tile, requestedLevel?: number) => {
  const sellLevel = requestedLevel ?? tile.building

  if (sellLevel > 0) {
    return {
      refund: MOCK_BUILD_COST,
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
  mockGameState.currentTurn = getNextActivePlayerId(mockGameState.currentTurn)
}

const nextRevision = () => {
  mockGameState.revision += 1
  return mockGameState.revision
}

const buildErrorResponse = (message: string, status: number) =>
  HttpResponse.json({ message }, { status })

const emitSnapshotPatch = (
  gameId: string,
  events?: GamePatchEnvelope['events']
) => {
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
  playerId: null,
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

const buildTollPrompt = (
  _player: Player,
  owner: Player,
  tile: Tile,
  amount: number
): GamePrompt => ({
  id: createPromptId('prompt-toll'),
  type: 'PAY_TOLL',
  playerId: null,
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
  const fromIndex = currentPlayer.position
  const toIndex = (fromIndex + total) % mockGameState.tiles.length
  const passGo = fromIndex + total >= mockGameState.tiles.length

  currentPlayer.position = toIndex
  if (passGo) {
    currentPlayer.balance += MOCK_PASS_GO_SALARY
  }

  const landedTile = getTileByIndex(toIndex)
  const isOwnableLanding = !!landedTile && isOwnableTile(landedTile)
  const landingOwner = isOwnableLanding
    ? mockGameState.players.find(
        (player) => String(player.id) === String(landedTile?.owner_id)
      )
    : null
  const shouldPromptBuy = isOwnableLanding && !landedTile?.owner_id
  const shouldPromptToll =
    isOwnableLanding &&
    landedTile?.owner_id &&
    landingOwner &&
    String(landingOwner.id) !== String(currentPlayer.id)

  const shouldHoldTurnForModal =
    !shouldPromptBuy && !shouldPromptToll && isModalLandingTile(landedTile)

  if (shouldPromptBuy && landedTile) {
    mockGameState.prompt = buildBuyPrompt(currentPlayer, landedTile)
    mockGameState.promptIssuedAtMs = Date.now()
    mockGameState.phase = 'prompt'
  } else if (shouldPromptToll && landedTile && landingOwner) {
    const tollAmount = landedTile.price ?? 0
    mockGameState.prompt = buildTollPrompt(
      currentPlayer,
      landingOwner,
      landedTile,
      tollAmount
    )
    mockGameState.promptIssuedAtMs = Date.now()
    mockGameState.phase = 'prompt'
  } else if (shouldHoldTurnForModal) {
    mockGameState.phase = 'resolving'
  } else {
    advanceMockTurn()
    mockGameState.phase = 'rolling'

    // Mock Global Effect logic
    if (
      mockGameState.activeGlobalEffect &&
      mockGameState.activeGlobalEffect.duration > 0
    ) {
      mockGameState.activeGlobalEffect.duration -= 1
      if (mockGameState.activeGlobalEffect.duration <= 0) {
        mockGameState.activeGlobalEffect = null
      }
    } else if (Math.random() < 0.2) {
      // 20% chance to trigger
      const effects: GlobalEffectType[] = [
        'PANDEMIC',
        'FESTIVAL',
        'INFLATION',
        'DEFLATION',
      ]
      const randomEffect = effects[Math.floor(Math.random() * effects.length)]
      const isMultiplier =
        randomEffect === 'PANDEMIC' || randomEffect === 'FESTIVAL'
      mockGameState.activeGlobalEffect = {
        type: isMultiplier ? 'TOLL_MULTIPLIER' : 'PRICE_MULTIPLIER',
        effect: randomEffect,
        duration: 3,
        multiplier:
          randomEffect === 'PANDEMIC' || randomEffect === 'DEFLATION' ? 0.5 : 2,
        description: `테스트 글로벌 효과: ${randomEffect}`,
      }
    }
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
      type: 'DICE_ROLLED',
      playerId: currentPlayer.id,
      payload: {
        dice: [dice1, dice2],
        total,
        is_double: isDouble,
        double_count: isDouble ? 1 : 0,
      },
    },
    {
      type: 'PLAYER_MOVED',
      playerId: currentPlayer.id,
      tileIndex: toIndex,
      amount: passGo ? MOCK_PASS_GO_SALARY : undefined,
      payload: {
        fromIndex,
        toIndex,
        passGo,
      },
    },
  ])
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

  if (tile.building >= 7) {
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

  if (player.balance < MOCK_BUILD_COST) {
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

  player.balance -= MOCK_BUILD_COST
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
      amount: MOCK_BUILD_COST,
      payload: {
        buildingLevel: tile.building,
      },
    },
  ])
}

const handleEndTurnAction = (action: MockResolvedGameAction) => {
  advanceMockTurn()
  mockGameState.phase = 'rolling'
  const revision = nextRevision()

  emitGameAck({
    actionId: action.actionId,
    type: action.type,
    ok: true,
    revision,
  })

  emitSnapshotPatch(action.gameId, [
    {
      type: 'TURN_ENDED',
      playerId: mockGameState.currentTurn,
    },
  ])
}

export const mockEmitGameSync = ({
  gameId,
  knownRevision,
}: MockGameSyncPayload) => {
  const resolvedGameId = resolveRequiredGameId({ gameId })
  if (!resolvedGameId) {
    return
  }

  if (knownRevision === 0) {
    resetMockGameState()
  }

  setTimeout(() => {
    const serverRevision = mockGameState.revision
    const normalizedKnownRevision =
      typeof knownRevision === 'number' && Number.isFinite(knownRevision)
        ? Math.trunc(knownRevision)
        : null

    if (normalizedKnownRevision == null || normalizedKnownRevision <= 0) {
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
  const nextEvents: GamePatchEnvelope['events'] = [
    {
      type: 'PROMPT_RESPONSE',
      payload: { choice: normalizedChoice, promptId, ...responsePayload },
    },
  ]

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
      }
    }
    advanceMockTurn()
  }

  if (promptType === 'PAY_TOLL') {
    if (respondingPlayer && promptAmount > 0) {
      respondingPlayer.balance -= promptAmount
      if (respondingPlayer.balance <= 0) {
        respondingPlayer.balance = 0
        respondingPlayer.is_bankrupt = true
      }

      if (targetTile?.owner_id != null) {
        const owner = mockGameState.players.find(
          (player) => String(player.id) === String(targetTile.owner_id)
        )
        if (owner) {
          owner.balance += promptAmount
        }
      }
    }

    nextEvents.push({
      type: 'PAID_TOLL',
      playerId: respondingPlayer?.id ?? null,
      tileIndex: targetTileIndex ?? null,
      amount: promptAmount,
      payload: {
        amount: promptAmount,
      },
    })
    advanceMockTurn()
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
          {
            type: 'PLAYER_MOVED',
            playerId: respondingPlayer.id,
            tileIndex: targetTileId,
            payload: {
              fromTileId,
              toTileId: targetTileId,
              trigger: 'travel',
            },
          },
          {
            type: 'LANDED',
            playerId: respondingPlayer.id,
            tileIndex: targetTileId,
          }
        )
      }
    }

    advanceMockTurn()
  }

  mockGameState.phase = 'rolling'
  clearMockPrompt()
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

    if (tile.building >= 7) {
      return buildErrorResponse(
        '\uCD5C\uB300 \uB2E8\uACC4\uAE4C\uC9C0 \uAC74\uC124\uD588\uC2B5\uB2C8\uB2E4.',
        409
      )
    }

    if (player.balance < MOCK_BUILD_COST) {
      return buildErrorResponse(
        '\uAC74\uC124 \uBE44\uC6A9\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4.',
        409
      )
    }

    player.balance -= MOCK_BUILD_COST
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
