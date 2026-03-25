import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHAT_MESSAGE_MAX_LENGTH } from '../../../constants/chat'
import type { DirectMessageReceiveSocketPayload } from '../types'

interface MockSocket {
  connected: boolean
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  listeners: ReturnType<typeof vi.fn>
}

interface LoadedDirectMessageSocketModule {
  socket: MockSocket
  connectSocketWithAuthIfNeededMock: ReturnType<typeof vi.fn>
  module: typeof import('./directMessageSocket')
}

// 테스트마다 mock/real 환경을 다르게 주입해 모듈을 다시 로드
async function loadDirectMessageSocketModule(
  useSocketMock: boolean,
  isConnected = false
): Promise<LoadedDirectMessageSocketModule> {
  vi.resetModules()
  vi.stubEnv('VITE_USE_SOCKET_MOCK', useSocketMock ? 'true' : 'false')

  const listenersMap = new Map<string, Array<(payload: unknown) => void>>()

  const socket: MockSocket = {
    connected: isConnected,
    on: vi.fn((eventName: string, listener: (payload: unknown) => void) => {
      const listeners = listenersMap.get(eventName) ?? []
      listeners.push(listener)
      listenersMap.set(eventName, listeners)
    }),
    off: vi.fn((eventName: string, listener: (payload: unknown) => void) => {
      const listeners = listenersMap.get(eventName) ?? []
      listenersMap.set(
        eventName,
        listeners.filter(
          (registeredListener) => registeredListener !== listener
        )
      )
    }),
    emit: vi.fn(),
    listeners: vi.fn((eventName: string) => listenersMap.get(eventName) ?? []),
  }

  const connectSocketWithAuthIfNeededMock = vi.fn(() => {
    socket.connected = true
  })

  vi.doMock('../../../lib/socket', () => ({
    socket,
    connectSocketWithAuthIfNeeded: connectSocketWithAuthIfNeededMock,
  }))

  const module = await import('./directMessageSocket')

  return {
    socket,
    connectSocketWithAuthIfNeededMock,
    module,
  }
}

describe('directMessageSocket', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('mock 모드에서 sendDirectMessage는 connect/emit 없이 종료된다', async () => {
    const { module, socket, connectSocketWithAuthIfNeededMock } =
      await loadDirectMessageSocketModule(true)

    module.sendDirectMessage({
      receiverId: 'user-2',
      message: '안녕하세요',
    })

    expect(connectSocketWithAuthIfNeededMock).not.toHaveBeenCalled()
    expect(socket.emit).not.toHaveBeenCalled()
  })

  it('real 모드에서 sendDirectMessage는 trim 후 dm_send emit을 호출한다', async () => {
    const { module, socket, connectSocketWithAuthIfNeededMock } =
      await loadDirectMessageSocketModule(false, false)

    module.sendDirectMessage({
      receiverId: 'user-2',
      message: '  안녕하세요  ',
    })

    expect(connectSocketWithAuthIfNeededMock).toHaveBeenCalledTimes(1)
    expect(socket.emit).toHaveBeenCalledWith('dm_send', {
      receiver_id: 'user-2',
      message: '안녕하세요',
    })
  })

  it('real 모드에서 sendDirectMessage는 300자 초과 메시지를 잘라서 emit한다', async () => {
    const { module, socket } = await loadDirectMessageSocketModule(false, true)
    const overlongMessage = ` ${'a'.repeat(CHAT_MESSAGE_MAX_LENGTH + 25)} `
    const expectedMessage = 'a'.repeat(CHAT_MESSAGE_MAX_LENGTH)

    module.sendDirectMessage({
      receiverId: 'user-2',
      message: overlongMessage,
    })

    expect(socket.emit).toHaveBeenCalledWith('dm_send', {
      receiver_id: 'user-2',
      message: expectedMessage,
    })
  })

  it('real 모드에서 clientMessageId를 전달하면 client_message_id를 함께 emit한다', async () => {
    const { module, socket } = await loadDirectMessageSocketModule(false, true)

    module.sendDirectMessage({
      receiverId: 'user-2',
      message: '테스트',
      clientMessageId: 'client-msg-1',
    })

    expect(socket.emit).toHaveBeenCalledWith('dm_send', {
      receiver_id: 'user-2',
      message: '테스트',
      client_message_id: 'client-msg-1',
    })
  })

  it('real 모드에서 이미 연결된 상태여도 auth 재동기화를 시도한다', async () => {
    const { module, connectSocketWithAuthIfNeededMock } =
      await loadDirectMessageSocketModule(false, true)

    module.sendDirectMessage({
      receiverId: 'user-2',
      message: '테스트',
    })

    expect(connectSocketWithAuthIfNeededMock).toHaveBeenCalledTimes(1)
  })

  it('공백 메시지는 real/mock 모드 모두 전송하지 않는다', async () => {
    const { module: realModule, socket: realSocket } =
      await loadDirectMessageSocketModule(false)
    const { module: mockModule, socket: mockSocket } =
      await loadDirectMessageSocketModule(true)

    realModule.sendDirectMessage({
      receiverId: 'user-2',
      message: '   ',
    })
    mockModule.sendDirectMessage({
      receiverId: 'user-2',
      message: '\n\t',
    })

    expect(realSocket.emit).not.toHaveBeenCalled()
    expect(mockSocket.emit).not.toHaveBeenCalled()
  })

  it('subscribeDirectMessageSocketEvents는 on 등록 후 unsubscribe 시 off 해제한다', async () => {
    const { module, socket } = await loadDirectMessageSocketModule(false)
    const onReceive = vi.fn()

    const unsubscribe = module.subscribeDirectMessageSocketEvents({
      onReceive,
    })

    expect(socket.on).toHaveBeenCalledWith('dm_receive', onReceive)

    unsubscribe()

    expect(socket.off).toHaveBeenCalledWith('dm_receive', onReceive)
  })

  it('mock 모드에서 emitDirectMessageReceiveMockForDev는 dm_receive 리스너에 payload를 전파한다', async () => {
    const { module, socket } = await loadDirectMessageSocketModule(true)
    const onReceive = vi.fn()
    const payload: DirectMessageReceiveSocketPayload = {
      message_id: 'dm-1',
      sender_id: 'user-2',
      sender_nickname: '상대',
      message: '수신 테스트',
      sent_at: '2026-03-04T00:00:00.000Z',
    }

    module.subscribeDirectMessageSocketEvents({
      onReceive,
    })
    module.emitDirectMessageReceiveMockForDev(payload)

    expect(socket.listeners).toHaveBeenCalledWith('dm_receive')
    expect(onReceive).toHaveBeenCalledWith(payload)
  })

  it('real 모드에서 emitDirectMessageReceiveMockForDev는 동작하지 않는다', async () => {
    const { module, socket } = await loadDirectMessageSocketModule(false)
    const onReceive = vi.fn()

    module.subscribeDirectMessageSocketEvents({
      onReceive,
    })
    module.emitDirectMessageReceiveMockForDev({
      message_id: 'dm-1',
      sender_id: 'user-2',
      sender_nickname: '상대',
      message: '수신 테스트',
      sent_at: '2026-03-04T00:00:00.000Z',
    })

    expect(socket.listeners).not.toHaveBeenCalledWith('dm_receive')
    expect(onReceive).not.toHaveBeenCalled()
  })
})
