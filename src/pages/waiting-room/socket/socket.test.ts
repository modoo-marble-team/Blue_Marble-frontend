import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHAT_MESSAGE_MAX_LENGTH } from '../../../constants/chat'

interface MockSocket {
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
}

interface LoadedWaitingRoomSocketModule {
  socket: MockSocket
  mockSendWaitingRoomChatMock: ReturnType<typeof vi.fn>
  module: typeof import('./socket')
}

async function loadWaitingRoomSocketModule(
  useSocketMock: boolean
): Promise<LoadedWaitingRoomSocketModule> {
  vi.resetModules()
  vi.stubEnv('VITE_USE_SOCKET_MOCK', useSocketMock ? 'true' : 'false')

  const socket: MockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }
  const mockSendWaitingRoomChatMock = vi.fn()

  vi.doMock('../../../lib/socket', () => ({
    socket,
    connectSocketWithAuthIfNeeded: vi.fn(),
  }))
  vi.doMock('./mockGateway', () => ({
    mockEnterWaitingRoomSocket: vi.fn(),
    mockLeaveWaitingRoomSocket: vi.fn(),
    mockSendWaitingRoomChat: mockSendWaitingRoomChatMock,
  }))

  const module = await import('./socket')

  return {
    socket,
    mockSendWaitingRoomChatMock,
    module,
  }
}

describe('waiting-room socket send chat', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('real 모드에서 sendWaitingRoomChat는 trim 후 300자로 잘라 send_chat emit을 호출한다', async () => {
    const { module, socket } = await loadWaitingRoomSocketModule(false)
    const overlongMessage = ` ${'a'.repeat(CHAT_MESSAGE_MAX_LENGTH + 16)} `
    const expectedMessage = 'a'.repeat(CHAT_MESSAGE_MAX_LENGTH)

    module.sendWaitingRoomChat({
      roomId: 'room-1',
      senderId: 'user-1',
      senderNickname: '유저1',
      message: overlongMessage,
    })

    expect(socket.emit).toHaveBeenCalledWith('send_chat', {
      room_id: 'room-1',
      message: expectedMessage,
    })
  })

  it('mock 모드에서 sendWaitingRoomChat는 trim 후 300자로 잘라 mock gateway를 호출한다', async () => {
    const { module, mockSendWaitingRoomChatMock, socket } =
      await loadWaitingRoomSocketModule(true)
    const overlongMessage = ` ${'b'.repeat(CHAT_MESSAGE_MAX_LENGTH + 10)} `
    const expectedMessage = 'b'.repeat(CHAT_MESSAGE_MAX_LENGTH)

    module.sendWaitingRoomChat({
      roomId: 'room-2',
      senderId: 'user-2',
      senderNickname: '유저2',
      message: overlongMessage,
    })

    expect(mockSendWaitingRoomChatMock).toHaveBeenCalledWith({
      roomId: 'room-2',
      senderId: 'user-2',
      senderNickname: '유저2',
      message: expectedMessage,
    })
    expect(socket.emit).not.toHaveBeenCalled()
  })

  it('공백 메시지는 real/mock 모드 모두 전송하지 않는다', async () => {
    const { module: realModule, socket: realSocket } =
      await loadWaitingRoomSocketModule(false)
    const {
      module: mockModule,
      socket: mockSocket,
      mockSendWaitingRoomChatMock,
    } = await loadWaitingRoomSocketModule(true)

    realModule.sendWaitingRoomChat({
      roomId: 'room-1',
      senderId: 'user-1',
      senderNickname: '유저1',
      message: '   ',
    })
    mockModule.sendWaitingRoomChat({
      roomId: 'room-1',
      senderId: 'user-1',
      senderNickname: '유저1',
      message: '\n\t',
    })

    expect(realSocket.emit).not.toHaveBeenCalled()
    expect(mockSocket.emit).not.toHaveBeenCalled()
    expect(mockSendWaitingRoomChatMock).not.toHaveBeenCalled()
  })
})
