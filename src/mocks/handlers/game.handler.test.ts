import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { socket } from '../../lib/socket'
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

  it('returns empty synced patch when knownRevision matches server revision', async () => {
    const { patches, teardown } = captureGameSocketEvents()

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
      knownRevision: 0,
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
})
