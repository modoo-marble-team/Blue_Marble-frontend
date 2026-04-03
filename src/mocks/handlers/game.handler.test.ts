import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { socket } from '../../lib/socket'
import {
  getMockWaitingRoomSnapshot,
  mockDevAddWaitingRoomParticipant,
  resetMockWaitingRooms,
} from '../../pages/waiting-room/socket/mockGateway'
import type {
  GameAck,
  GameError,
  GamePatchEnvelope,
  GamePrompt,
  GameSnapshot,
} from '../../types/domain'
import {
  mockDevSetPhaseForTest,
  mockDevSetPromptForTest,
  mockDevSetRevisionForTest,
  mockEmitGameAction,
  mockEmitGameSync,
  mockEmitPromptResponse,
} from './game.handler'

type PatchedGameEnvelope = GamePatchEnvelope & {
  snapshot?: GameSnapshot
}

const flushMockTimers = async () => {
  await vi.runAllTimersAsync()
  await Promise.resolve()
}

const captureGameSocketEvents = () => {
  const acks: GameAck[] = []
  const errors: GameError[] = []
  const patches: PatchedGameEnvelope[] = []

  const handleAck = (payload: GameAck) => {
    acks.push(payload)
  }
  const handleError = (payload: GameError) => {
    errors.push(payload)
  }
  const handlePatch = (payload: PatchedGameEnvelope) => {
    patches.push(payload)
  }

  socket.on('game:ack', handleAck)
  socket.on('game:error', handleError)
  socket.on('game:patch', handlePatch)

  const teardown = () => {
    socket.off('game:ack', handleAck)
    socket.off('game:error', handleError)
    socket.off('game:patch', handlePatch)
  }

  return { acks, errors, patches, teardown }
}

describe('mock game socket handlers contract', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'))
    resetMockWaitingRooms()
    mockEmitGameSync({ gameId: 'game-reset', knownRevision: 0 })
    await flushMockTimers()
    mockDevSetPhaseForTest('waiting')
    mockDevSetPromptForTest(null)
    mockDevSetRevisionForTest(1)
  })

  afterEach(() => {
    socket.removeAllListeners('game:ack')
    socket.removeAllListeners('game:error')
    socket.removeAllListeners('game:patch')
    vi.useRealTimers()
  })

  it('roomId가 포함된 game sync는 대기방 참가자 목록을 그대로 플레이어로 사용한다', async () => {
    const { patches, teardown } = captureGameSocketEvents()

    mockDevAddWaitingRoomParticipant('room-5')
    const waitingRoomSnapshot = getMockWaitingRoomSnapshot('room-5')

    mockEmitGameSync({
      gameId: 'game-room-5-123456',
      knownRevision: -1,
    })
    await flushMockTimers()

    expect(patches).toHaveLength(1)
    expect(patches[0].snapshot?.roomId).toBe('room-5')
    expect(patches[0].snapshot?.phase).toBe('rolling')
    expect(patches[0].snapshot?.players).toHaveLength(
      waitingRoomSnapshot.players.length
    )
    expect(
      patches[0].snapshot?.players.map((player) => ({
        id: String(player.id),
        nickname: player.nickname,
      }))
    ).toEqual(
      waitingRoomSnapshot.players.map((player) => ({
        id: player.id,
        nickname: player.nickname,
      }))
    )

    teardown()
  })

  it('rejects game action when gameId is missing', async () => {
    const { acks, errors, teardown } = captureGameSocketEvents()

    mockEmitGameAction({
      actionId: 'action-1',
      type: 'ROLL_DICE',
      gameId: null,
    })
    await flushMockTimers()

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      code: 'INVALID_GAME_ID',
      actionId: 'action-1',
    })

    expect(acks).toHaveLength(1)
    expect(acks[0]).toMatchObject({
      actionId: 'action-1',
      type: 'ROLL_DICE',
      ok: false,
      error: {
        code: 'INVALID_GAME_ID',
      },
    })

    teardown()
  })

  it('rejects game sync when gameId is missing', async () => {
    const { acks, errors, patches, teardown } = captureGameSocketEvents()

    mockEmitGameSync({
      gameId: null,
      knownRevision: 1,
    })
    await flushMockTimers()

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      code: 'INVALID_GAME_ID',
    })
    expect(acks).toHaveLength(0)
    expect(patches).toHaveLength(0)

    teardown()
  })

  it('returns empty synced patch when knownRevision matches server revision', async () => {
    const { patches, teardown } = captureGameSocketEvents()

    mockEmitGameSync({
      gameId: 'game-sync',
      knownRevision: 0,
    })
    await flushMockTimers()
    patches.length = 0

    mockDevSetRevisionForTest(25)
    mockEmitGameSync({
      gameId: 'game-sync',
      knownRevision: 25,
    })
    await flushMockTimers()

    expect(patches).toHaveLength(1)
    expect(patches[0]).toMatchObject({
      revision: 25,
      patch: [],
    })
    expect(patches[0].events?.[0]?.type).toBe('SYNCED')
    expect(patches[0].snapshot).toBeUndefined()

    teardown()
  })

  it('forces snapshot when revision gap is greater than 200', async () => {
    const { patches, teardown } = captureGameSocketEvents()

    mockEmitGameSync({
      gameId: 'game-gap',
      knownRevision: 0,
    })
    await flushMockTimers()
    patches.length = 0

    mockDevSetRevisionForTest(250)
    mockEmitGameSync({
      gameId: 'game-gap',
      knownRevision: 1,
    })
    await flushMockTimers()

    expect(patches).toHaveLength(1)
    expect(patches[0].snapshot).toBeDefined()
    expect(patches[0].snapshot?.gameId).toBe('game-gap')

    teardown()
  })

  it('rejects invalid prompt choice with INVALID_PROMPT_CHOICE', async () => {
    const { acks, errors, teardown } = captureGameSocketEvents()

    const prompt: GamePrompt = {
      id: 'prompt-choice-invalid',
      type: 'BUY_OR_SKIP',
      playerId: 'mock-player-1',
      timeoutSec: 30,
    }
    mockDevSetPromptForTest(prompt)

    mockEmitPromptResponse({
      gameId: 'game-prompt',
      promptId: prompt.id,
      choice: 'CONFIRM',
    })
    await flushMockTimers()

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      code: 'INVALID_PROMPT_CHOICE',
    })

    expect(acks).toHaveLength(1)
    expect(acks[0]).toMatchObject({
      type: 'PROMPT_RESPONSE',
      ok: false,
      promptId: prompt.id,
      error: {
        code: 'INVALID_PROMPT_CHOICE',
      },
    })

    teardown()
  })

  it('rejects non-canonical choice for CONFIRM_ONLY prompt', async () => {
    const { acks, errors, teardown } = captureGameSocketEvents()

    const prompt: GamePrompt = {
      id: 'prompt-confirm-only',
      type: 'CONFIRM_ONLY',
      playerId: 'mock-player-1',
      timeoutSec: 30,
    }
    mockDevSetPromptForTest(prompt)

    mockEmitPromptResponse({
      gameId: 'game-prompt',
      promptId: prompt.id,
      choice: 'BUY',
    })
    await flushMockTimers()

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      code: 'INVALID_PROMPT_CHOICE',
    })

    expect(acks).toHaveLength(1)
    expect(acks[0]).toMatchObject({
      type: 'PROMPT_RESPONSE',
      ok: false,
      promptId: prompt.id,
      error: {
        code: 'INVALID_PROMPT_CHOICE',
      },
    })

    teardown()
  })

  it('rejects prompt response when gameId is missing', async () => {
    const { acks, errors, patches, teardown } = captureGameSocketEvents()

    const prompt: GamePrompt = {
      id: 'prompt-gameid-required',
      type: 'BUY_OR_SKIP',
      playerId: 'mock-player-1',
      timeoutSec: 30,
    }
    mockDevSetPromptForTest(prompt)

    mockEmitPromptResponse({
      gameId: null,
      promptId: prompt.id,
      choice: 'BUY',
    })
    await flushMockTimers()

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      code: 'INVALID_GAME_ID',
    })

    expect(acks).toHaveLength(1)
    expect(acks[0]).toMatchObject({
      type: 'PROMPT_RESPONSE',
      ok: false,
      error: {
        code: 'INVALID_GAME_ID',
      },
    })
    expect(patches).toHaveLength(0)

    teardown()
  })

  it('rejects expired prompt with PROMPT_EXPIRED', async () => {
    const { acks, errors, teardown } = captureGameSocketEvents()

    const prompt: GamePrompt = {
      id: 'prompt-expired',
      type: 'BUY_OR_SKIP',
      playerId: 'mock-player-1',
      timeoutSec: 1,
    }
    mockDevSetPromptForTest(prompt)
    vi.setSystemTime(new Date('2026-03-10T00:00:05.000Z'))

    mockEmitPromptResponse({
      gameId: 'game-prompt',
      promptId: prompt.id,
      choice: 'BUY',
    })
    await flushMockTimers()

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      code: 'PROMPT_EXPIRED',
    })

    expect(acks).toHaveLength(1)
    expect(acks[0]).toMatchObject({
      type: 'PROMPT_RESPONSE',
      ok: false,
      promptId: prompt.id,
      error: {
        code: 'PROMPT_EXPIRED',
      },
    })

    teardown()
  })

  it('accepts canonical prompt choice and includes promptId in ack', async () => {
    const { acks, patches, teardown } = captureGameSocketEvents()

    const prompt: GamePrompt = {
      id: 'prompt-success',
      type: 'BUY_OR_SKIP',
      playerId: 'mock-player-1',
      timeoutSec: 30,
    }
    mockDevSetPromptForTest(prompt)

    mockEmitPromptResponse({
      gameId: 'game-prompt',
      promptId: prompt.id,
      choice: 'buy',
    })
    await flushMockTimers()

    expect(acks).toHaveLength(1)
    expect(acks[0]).toMatchObject({
      type: 'PROMPT_RESPONSE',
      ok: true,
      promptId: prompt.id,
    })

    expect(patches).toHaveLength(1)
    expect(patches[0].events?.[0]).toMatchObject({
      type: 'PROMPT_RESPONSE',
      payload: {
        promptId: prompt.id,
        choice: 'BUY',
      },
    })

    teardown()
  })

  it('runs one-turn contract flow from game:action to prompt_response', async () => {
    const { acks, errors, patches, teardown } = captureGameSocketEvents()

    const gameId = 'game-turn-flow'
    mockEmitGameSync({
      gameId,
      knownRevision: -1,
    })
    await flushMockTimers()

    expect(patches).toHaveLength(1)
    const syncRevision = patches[0].revision
    expect(patches[0].snapshot?.gameId).toBe(gameId)

    const rollActionId = 'action-roll-flow'
    mockEmitGameAction({
      actionId: rollActionId,
      type: 'ROLL_DICE',
      gameId,
    })
    await flushMockTimers()

    const rollAck = acks.find((ack) => ack.actionId === rollActionId)
    expect(rollAck).toBeDefined()
    expect(rollAck).toMatchObject({
      actionId: rollActionId,
      type: 'ROLL_DICE',
      ok: true,
      revision: syncRevision + 1,
    })

    const rollPatch = patches.find(
      (patch) => patch.revision === rollAck?.revision
    )
    expect(rollPatch).toBeDefined()
    expect(rollPatch?.events?.map((event) => event.type)).toEqual(
      expect.arrayContaining(['DICE_ROLLED', 'PLAYER_MOVED'])
    )

    const prompt: GamePrompt = {
      id: 'prompt-turn-flow',
      type: 'BUY_OR_SKIP',
      playerId: rollPatch?.snapshot?.currentTurn ?? null,
      timeoutSec: 30,
    }
    mockDevSetPromptForTest(prompt)

    mockEmitPromptResponse({
      gameId,
      promptId: prompt.id,
      choice: 'buy',
    })
    await flushMockTimers()

    const promptAck = acks.find(
      (ack) => ack.type === 'PROMPT_RESPONSE' && ack.promptId === prompt.id
    )
    expect(promptAck).toBeDefined()
    expect(promptAck).toMatchObject({
      type: 'PROMPT_RESPONSE',
      ok: true,
      promptId: prompt.id,
    })

    const promptPatch = patches.find(
      (patch) => patch.revision === promptAck?.revision
    )
    expect(promptPatch).toBeDefined()
    expect(promptPatch?.events?.[0]).toMatchObject({
      type: 'PROMPT_RESPONSE',
      payload: {
        promptId: prompt.id,
        choice: 'BUY',
      },
    })
    expect(promptPatch?.snapshot?.prompt).toBeNull()
    expect(errors).toHaveLength(0)

    teardown()
  })

  it('does not auto-emit TURN_ENDED on ROLL_DICE', async () => {
    const { acks, patches, teardown } = captureGameSocketEvents()
    const gameId = 'game-roll-no-auto-end'

    mockEmitGameSync({
      gameId,
      knownRevision: -1,
    })
    await flushMockTimers()
    patches.length = 0

    mockEmitGameAction({
      actionId: 'action-roll-no-auto-end',
      type: 'ROLL_DICE',
      gameId,
    })
    await flushMockTimers()

    const rollAck = acks.find(
      (ack) => ack.actionId === 'action-roll-no-auto-end'
    )
    expect(rollAck?.ok).toBe(true)

    const rollPatch = patches.find(
      (patch) => patch.revision === rollAck?.revision
    )
    expect(rollPatch).toBeDefined()
    expect(
      rollPatch?.events?.some((event) => event.type === 'TURN_ENDED')
    ).toBe(false)
    expect(['prompt', 'resolving']).toContain(rollPatch?.snapshot?.phase)

    teardown()
  })

  it('keeps turn on END_TURN when player has double-roll bonus turn', async () => {
    const { acks, patches, teardown } = captureGameSocketEvents()
    const gameId = 'game-end-turn-double-bonus'

    mockEmitGameSync({
      gameId,
      knownRevision: -1,
    })
    await flushMockTimers()
    patches.length = 0

    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)

    mockEmitGameAction({
      actionId: 'action-roll-double',
      type: 'ROLL_DICE',
      gameId,
    })
    await flushMockTimers()

    randomSpy.mockRestore()

    const rollAck = acks.find((ack) => ack.actionId === 'action-roll-double')
    const rollPatch = patches.find(
      (patch) => patch.revision === rollAck?.revision
    )
    expect(rollPatch?.snapshot?.prompt).toBeTruthy()

    const activePrompt = rollPatch?.snapshot?.prompt
    expect(activePrompt?.id).toBeTruthy()

    mockEmitPromptResponse({
      gameId,
      promptId: activePrompt?.id ?? '',
      choice: 'SKIP',
    })
    await flushMockTimers()

    const promptAck = acks.find(
      (ack) =>
        ack.type === 'PROMPT_RESPONSE' && ack.promptId === activePrompt?.id
    )
    expect(promptAck?.ok).toBe(true)

    const resolvingPatch = patches.find(
      (patch) => patch.revision === promptAck?.revision
    )
    const currentTurnBeforeEndTurn = resolvingPatch?.snapshot?.currentTurn
    expect(currentTurnBeforeEndTurn).toBeDefined()

    mockEmitGameAction({
      actionId: 'action-end-turn-double',
      type: 'END_TURN',
      gameId,
    })
    await flushMockTimers()

    const endTurnAck = acks.find(
      (ack) => ack.actionId === 'action-end-turn-double'
    )
    expect(endTurnAck?.ok).toBe(true)

    const endTurnPatch = patches.find(
      (patch) => patch.revision === endTurnAck?.revision
    )
    const turnEndedEvent = endTurnPatch?.events?.find(
      (event) => event.type === 'TURN_ENDED'
    )

    expect(turnEndedEvent).toBeDefined()
    expect(turnEndedEvent?.payload?.bonusTurn).toBe(true)
    expect(turnEndedEvent?.nextPlayerId).toBe(currentTurnBeforeEndTurn)
    expect(endTurnPatch?.snapshot?.currentTurn).toBe(currentTurnBeforeEndTurn)

    teardown()
  })

  it('marks player bankrupt when toll payment consumes balance down to exactly zero', async () => {
    const { acks, patches, teardown } = captureGameSocketEvents()
    const gameId = 'game-pay-toll-zero-balance'

    mockEmitGameSync({
      gameId,
      knownRevision: -1,
    })
    await flushMockTimers()

    const baselinePatch = patches[patches.length - 1]
    const currentPlayerId = String(baselinePatch?.snapshot?.currentTurn ?? '1')
    const currentPlayer = baselinePatch?.snapshot?.players.find(
      (player) => String(player.id) === currentPlayerId
    )
    expect(currentPlayer).toBeDefined()

    const prompt: GamePrompt = {
      id: 'prompt-pay-toll-zero-balance',
      type: 'PAY_TOLL',
      playerId: currentPlayerId,
      timeoutSec: 30,
      payload: {
        tileId: 1,
        amount: currentPlayer?.balance ?? 0,
      },
    }
    mockDevSetPromptForTest(prompt)
    patches.length = 0

    mockEmitPromptResponse({
      gameId,
      promptId: prompt.id,
      choice: 'PAY_TOLL',
    })
    await flushMockTimers()

    const promptAck = acks.find(
      (ack) => ack.type === 'PROMPT_RESPONSE' && ack.promptId === prompt.id
    )
    expect(promptAck?.ok).toBe(true)

    const promptPatch = patches.find(
      (patch) => patch.revision === promptAck?.revision
    )
    expect(promptPatch).toBeDefined()

    const settledPlayer = promptPatch?.snapshot?.players.find(
      (player) => String(player.id) === currentPlayerId
    )
    expect(settledPlayer?.balance).toBe(0)
    expect(settledPlayer?.is_bankrupt).toBe(true)
    expect(settledPlayer?.state).toBe('bankrupt')

    teardown()
  })

  it('uses travel trigger for TRAVEL_SELECT confirm', async () => {
    const { acks, patches, teardown } = captureGameSocketEvents()
    const gameId = 'game-travel-trigger'

    mockEmitGameSync({
      gameId,
      knownRevision: -1,
    })
    await flushMockTimers()

    const baselinePatch = patches[patches.length - 1]
    const currentPlayerId = String(baselinePatch?.snapshot?.currentTurn ?? '1')
    const prompt: GamePrompt = {
      id: 'prompt-travel-trigger',
      type: 'TRAVEL_SELECT',
      playerId: currentPlayerId,
      timeoutSec: 30,
      payload: {
        tileId: 16,
      },
    }
    mockDevSetPromptForTest(prompt)
    patches.length = 0

    mockEmitPromptResponse({
      gameId,
      promptId: prompt.id,
      choice: 'CONFIRM',
      payload: {
        targetTileId: 7,
      },
    })
    await flushMockTimers()

    const promptAck = acks.find(
      (ack) => ack.type === 'PROMPT_RESPONSE' && ack.promptId === prompt.id
    )
    expect(promptAck?.ok).toBe(true)

    const promptPatch = patches.find(
      (patch) => patch.revision === promptAck?.revision
    )
    const movedEvent = promptPatch?.events?.find(
      (event) => event.type === 'PLAYER_MOVED'
    )

    expect(movedEvent?.payload?.trigger).toBe('travel')

    teardown()
  })

  it('rejects BUY when prompt price equals player balance', async () => {
    const { acks, patches, teardown } = captureGameSocketEvents()
    const gameId = 'game-buy-strict-balance'

    mockEmitGameSync({
      gameId,
      knownRevision: -1,
    })
    await flushMockTimers()

    const baselinePatch = patches[patches.length - 1]
    const currentPlayerId = String(baselinePatch?.snapshot?.currentTurn ?? '1')
    const currentPlayer = baselinePatch?.snapshot?.players.find(
      (player) => String(player.id) === currentPlayerId
    )
    expect(currentPlayer).toBeDefined()

    const prompt: GamePrompt = {
      id: 'prompt-buy-strict-balance',
      type: 'BUY_OR_SKIP',
      playerId: currentPlayerId,
      timeoutSec: 30,
      payload: {
        tileId: 1,
        price: currentPlayer?.balance ?? 0,
      },
    }
    mockDevSetPromptForTest(prompt)
    patches.length = 0

    mockEmitPromptResponse({
      gameId,
      promptId: prompt.id,
      choice: 'BUY',
    })
    await flushMockTimers()

    const promptAck = acks.find(
      (ack) => ack.type === 'PROMPT_RESPONSE' && ack.promptId === prompt.id
    )
    expect(promptAck?.ok).toBe(true)

    const promptPatch = patches.find(
      (patch) => patch.revision === promptAck?.revision
    )
    const insufficientEvent = promptPatch?.events?.find(
      (event) => event.type === 'INSUFFICIENT_FUNDS'
    )
    const settledPlayer = promptPatch?.snapshot?.players.find(
      (player) => String(player.id) === currentPlayerId
    )

    expect(insufficientEvent).toBeDefined()
    expect(settledPlayer?.balance).toBe(currentPlayer?.balance ?? 0)

    teardown()
  })

  it('applies chance GAIN_MONEY amount to player balance after landing on chance tile', async () => {
    const { acks, patches, teardown } = captureGameSocketEvents()
    const gameId = 'game-chance-gain-money'
    const actionId = 'action-roll-chance-gain-money'

    mockEmitGameSync({
      gameId,
      knownRevision: -1,
    })
    await flushMockTimers()

    const baselinePatch = patches[patches.length - 1]
    const currentPlayerId = String(baselinePatch?.snapshot?.currentTurn ?? '')
    const currentPlayerBeforeRoll = baselinePatch?.snapshot?.players.find(
      (player) => String(player.id) === currentPlayerId
    )
    expect(currentPlayerBeforeRoll).toBeDefined()

    patches.length = 0

    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0) // dice1 => 1
      .mockReturnValueOnce(0.2) // dice2 => 2 (total 3, lands on chance tile)
      .mockReturnValueOnce(0) // chance effect index 0 => GAIN_MONEY (3억원)

    mockEmitGameAction({
      actionId,
      type: 'ROLL_DICE',
      gameId,
    })
    await flushMockTimers()
    randomSpy.mockRestore()

    const rollAck = acks.find((ack) => ack.actionId === actionId)
    expect(rollAck?.ok).toBe(true)

    const rollPatch = patches.find(
      (patch) => patch.revision === rollAck?.revision
    )
    expect(rollPatch).toBeDefined()

    const chanceResolvedEvent = rollPatch?.events?.find(
      (event) => event.type === 'CHANCE_RESOLVED'
    )
    expect(chanceResolvedEvent).toBeDefined()

    const chancePayloadRecord = chanceResolvedEvent?.payload as
      | Record<string, unknown>
      | undefined
    const chanceRecord = chancePayloadRecord?.chance as
      | Record<string, unknown>
      | undefined
    const chanceType =
      typeof chanceRecord?.type === 'string' ? chanceRecord.type : null
    const chancePower =
      typeof chanceRecord?.power === 'number' ? chanceRecord.power : null
    expect(chanceType).toBe('GAIN_MONEY')
    expect(chancePower).toBeGreaterThan(0)

    const currentPlayerAfterRoll = rollPatch?.snapshot?.players.find(
      (player) => String(player.id) === currentPlayerId
    )
    expect(currentPlayerAfterRoll).toBeDefined()
    expect(currentPlayerAfterRoll?.position).toBe(3)
    expect(currentPlayerAfterRoll?.balance).toBe(
      (currentPlayerBeforeRoll?.balance ?? 0) + (chancePower ?? 0)
    )

    teardown()
  })

  it('locks player on island for exactly 3 turns when landing on island tile', async () => {
    const { acks, patches, teardown } = captureGameSocketEvents()
    const gameId = 'game-island-lock-3-turns'
    const actionId = 'action-roll-island-lock'

    mockEmitGameSync({
      gameId,
      knownRevision: -1,
    })
    await flushMockTimers()
    patches.length = 0

    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.34) // dice1 => 3
      .mockReturnValueOnce(0.67) // dice2 => 5 (total 8, lands on island tile)

    mockEmitGameAction({
      actionId,
      type: 'ROLL_DICE',
      gameId,
    })
    await flushMockTimers()
    randomSpy.mockRestore()

    const rollAck = acks.find((ack) => ack.actionId === actionId)
    expect(rollAck?.ok).toBe(true)

    const rollPatch = patches.find(
      (patch) => patch.revision === rollAck?.revision
    )
    expect(rollPatch).toBeDefined()

    const currentPlayerId = String(rollPatch?.snapshot?.currentTurn ?? '')
    const settledPlayer = rollPatch?.snapshot?.players.find(
      (player) => String(player.id) === currentPlayerId
    )
    expect(settledPlayer).toBeDefined()
    expect(settledPlayer?.position).toBe(8)
    expect(settledPlayer?.state).toBe('locked')
    expect(settledPlayer?.stateDuration).toBe(3)
    expect(settledPlayer?.jail_turn_count).toBe(3)

    const stateChangedEvent = rollPatch?.events?.find(
      (event) =>
        event.type === 'PLAYER_STATE_CHANGED' &&
        String(event.playerId) === currentPlayerId
    )
    const statePayload = stateChangedEvent?.payload as
      | Record<string, unknown>
      | undefined
    expect(statePayload?.stateDuration).toBe(3)

    teardown()
  })
})
