import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../../types/domain'
import {
  consumePendingGameChatEcho,
  createOptimisticGameChatMessage,
  mapGameChatEventToMessage,
  prunePendingGameChatEchoes,
  reconcileGameChatMessages,
} from './gameChat'

const createIncomingChatMessage = (): ChatMessage =>
  mapGameChatEventToMessage({
    room_id: 'room-1',
    sender_id: 'user-1',
    sender_nickname: '유저1',
    message: 'ㅎㅇㅎㅇ',
    sent_at: '2026-03-19T01:45:00.314Z',
  })

describe('gameChat helpers', () => {
  it('creates an optimistic local chat message for immediate rendering', () => {
    const message = createOptimisticGameChatMessage({
      roomId: 'room-1',
      senderId: 'user-1',
      senderNickname: '유저1',
      message: 'ㅎㅇㅎㅇ',
      now: new Date('2026-03-19T01:45:00.000Z'),
    })

    expect(message).toMatchObject({
      sender_id: 'user-1',
      sender_nickname: '유저1',
      content: 'ㅎㅇㅎㅇ',
      timestamp: '2026-03-19T01:45:00.000Z',
      type: 'talk',
    })
    expect(message.id).toContain('local-game-chat:room-1:user-1:')
  })

  it('matches a server echo to the pending optimistic message and replaces it', () => {
    const optimisticMessage = createOptimisticGameChatMessage({
      roomId: 'room-1',
      senderId: 'user-1',
      senderNickname: '유저1',
      message: 'ㅎㅇㅎㅇ',
      now: new Date('2026-03-19T01:45:00.000Z'),
    })
    const incomingMessage = createIncomingChatMessage()

    const consumedPendingEcho = consumePendingGameChatEcho({
      pendingEchoes: [
        {
          id: optimisticMessage.id,
          senderId: optimisticMessage.sender_id,
          content: optimisticMessage.content,
          createdAtMs: Date.parse(optimisticMessage.timestamp),
        },
      ],
      incomingMessage,
      currentUserId: 'user-1',
      nowMs: Date.parse('2026-03-19T01:45:01.000Z'),
    })
    const reconciledMessages = reconcileGameChatMessages({
      previousMessages: [optimisticMessage],
      incomingMessage,
      matchedPendingId: consumedPendingEcho.matchedPendingId,
    })

    expect(consumedPendingEcho.matchedPendingId).toBe(optimisticMessage.id)
    expect(consumedPendingEcho.pendingEchoes).toEqual([])
    expect(reconciledMessages).toEqual([incomingMessage])
  })

  it('prunes stale pending echoes and treats unmatched incoming messages as new chats', () => {
    const incomingMessage = createIncomingChatMessage()

    const consumedPendingEcho = consumePendingGameChatEcho({
      pendingEchoes: [
        {
          id: 'local-game-chat:room-1:user-1:old',
          senderId: 'user-1',
          content: 'ㅎㅇㅎㅇ',
          createdAtMs: Date.parse('2026-03-19T01:44:00.000Z'),
        },
      ],
      incomingMessage,
      currentUserId: 'user-1',
      nowMs: Date.parse('2026-03-19T01:45:31.000Z'),
    })
    const reconciledMessages = reconcileGameChatMessages({
      previousMessages: [],
      incomingMessage,
      matchedPendingId: consumedPendingEcho.matchedPendingId,
    })

    expect(
      prunePendingGameChatEchoes(consumedPendingEcho.pendingEchoes)
    ).toEqual([])
    expect(consumedPendingEcho.matchedPendingId).toBeNull()
    expect(reconciledMessages).toEqual([incomingMessage])
  })
})
