import { forwardRef } from 'react'
import { Route, Routes } from 'react-router-dom'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GamePage from './GamePage'
import { useGameStore } from '../stores/game.store'
import { useAuthStore } from '../features/auth/session/store'
import { createAuthSessionFixture } from '../test/fixtures'
import { renderWithProviders } from '../test/renderWithProviders'
import type { Player } from '../types/domain'

vi.mock('../config/env', () => ({
  IS_DEMO_MOCK_ENABLED: false,
  IS_SOCKET_MOCK_ENABLED: false,
  SHOULD_ENABLE_MSW: true,
}))

const { sendWaitingRoomChatMock, emitChatEvent, socketOnMock, socketOffMock } =
  vi.hoisted(() => {
    const handlers = new Map<string, Set<(payload: unknown) => void>>()

    return {
      sendWaitingRoomChatMock: vi.fn(),
      socketOnMock: vi.fn(
        (event: string, handler: (payload: unknown) => void) => {
          const nextHandlers = handlers.get(event) ?? new Set()
          nextHandlers.add(handler)
          handlers.set(event, nextHandlers)
        }
      ),
      socketOffMock: vi.fn(
        (event: string, handler: (payload: unknown) => void) => {
          handlers.get(event)?.delete(handler)
        }
      ),
      emitChatEvent: (payload: unknown) => {
        handlers.get('chat')?.forEach((handler) => handler(payload))
      },
    }
  })

vi.mock('../lib/socket', () => ({
  socket: {
    on: socketOnMock,
    off: socketOffMock,
    connected: true,
    disconnect: vi.fn(),
  },
}))

vi.mock('../pages/waiting-room/socket/socket', () => ({
  sendWaitingRoomChat: sendWaitingRoomChatMock,
}))

vi.mock('../hooks/game/useGameState', () => ({
  useGameState: vi.fn(),
}))

vi.mock('../hooks/game/useDiceRoll', () => ({
  useDiceRoll: () => vi.fn(),
}))

vi.mock('../hooks/game/useTurn', () => ({
  useTurn: () => false,
}))

vi.mock('../lib/bgm', () => ({
  playBgm: vi.fn(),
  stopBgm: vi.fn(),
}))

vi.mock('../services/socket/game.handler', () => ({
  emitPromptResponse: vi.fn(),
}))

vi.mock('../components/board/GameBoard', () => ({
  default: forwardRef<HTMLDivElement>(function MockBoardGame(_, ref) {
    return (
      <div ref={ref} data-testid="mock-board-game">
        게임 보드
      </div>
    )
  }),
}))

vi.mock('../components/game/controls/RollButton', () => ({
  default: () => <button type="button">주사위</button>,
}))

vi.mock('../components/game/modals/ExitGameModal', () => ({
  default: () => null,
}))

vi.mock('../components/game/modals/promptModalMapping', () => ({
  isPromptHandledByBoardModal: () => false,
}))

vi.mock('../components/game/panels/PlayerPanel', () => ({
  default: () => <div>플레이어 패널</div>,
}))

vi.mock('../features/room-chat/DevRoomChatControlPanel', () => ({
  DevRoomChatControlPanel: () => null,
}))

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'user-1',
  nickname: '유저1',
  color: '#ff0000',
  position: 0,
  balance: 1000,
  owned_tiles: [],
  is_in_jail: false,
  jail_turn_count: 0,
  is_bankrupt: false,
  ...overrides,
})

function renderGamePage() {
  return renderWithProviders(
    <Routes>
      <Route path="/game/:gameId" element={<GamePage />} />
    </Routes>,
    {
      initialEntries: [
        {
          pathname: '/game/game-1',
          state: {
            gameId: 'game-1',
            roomId: 'room-1',
          },
        },
      ],
    }
  )
}

describe('GamePage chat flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAuthStore.setState({
      session: createAuthSessionFixture({
        userId: 'user-1',
        nickname: '유저1',
      }),
    })

    useGameStore.getState().resetGame()
    useGameStore.getState().setGameState({
      roomId: 'room-1',
      gameId: 'game-1',
      currentTurn: 'user-2',
      players: [
        createPlayer(),
        createPlayer({
          id: 'user-2',
          nickname: '유저2',
          color: '#0000ff',
        }),
      ],
      tiles: [],
      messages: [],
    })
  })

  afterEach(() => {
    useGameStore.getState().resetGame()
    useAuthStore.setState({ session: null })
  })

  it('renders a local chat message immediately and avoids duplicates when the server echo arrives', async () => {
    const user = userEvent.setup()

    renderGamePage()

    await act(async () => {
      await user.type(
        screen.getByPlaceholderText('메시지...'),
        'ㅎㅇㅎㅇ{enter}'
      )
    })

    expect(sendWaitingRoomChatMock).toHaveBeenCalledWith({
      roomId: 'room-1',
      senderId: 'user-1',
      senderNickname: '유저1',
      message: 'ㅎㅇㅎㅇ',
    })

    expect(await screen.findByText('ㅎㅇㅎㅇ')).toBeInTheDocument()

    act(() => {
      emitChatEvent({
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_nickname: '유저1',
        message: 'ㅎㅇㅎㅇ',
        sent_at: '2026-03-19T01:45:00.314Z',
      })
    })

    expect(screen.getAllByText('ㅎㅇㅎㅇ')).toHaveLength(1)
  })
})
