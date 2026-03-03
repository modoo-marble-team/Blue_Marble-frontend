// socket.on mock에서 특정 이벤트 핸들러를 조회
export function getSocketEventHandler<TPayload>(
  socketOnMock: { mock: { calls: unknown[][] } },
  eventName: string
) {
  const targetCall = socketOnMock.mock.calls.find((call) => {
    return call[0] === eventName
  })

  if (!targetCall) {
    return null
  }

  return targetCall[1] as (payload: TPayload) => void
}

// 등록된 이벤트 핸들러를 직접 실행해 수신 시나리오를 재현
export function emitSocketEvent<TPayload>(
  socketOnMock: { mock: { calls: unknown[][] } },
  eventName: string,
  payload: TPayload
) {
  const eventHandler = getSocketEventHandler<TPayload>(socketOnMock, eventName)

  if (!eventHandler) {
    return false
  }

  eventHandler(payload)
  return true
}
