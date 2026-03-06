// setTimeout 기반 지연 Promise 생성
export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms)
  })
}

// crypto.randomUUID 우선, 없으면 랜덤+timestamp 조합으로 식별자 생성
export function createMockUuid() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`
}
