export type MockGameResumeContext = {
  gameId: string
  roomId: string
  updatedAt: number
}

const MOCK_GAME_RESUME_STORAGE_KEY = 'mock-game-resume-context-v1'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const canUseStorage = () => typeof window !== 'undefined'

const normalizeStoredContext = (
  value: unknown
): MockGameResumeContext | null => {
  if (!isRecord(value)) {
    return null
  }

  const gameId =
    typeof value.gameId === 'string' && value.gameId.trim() !== ''
      ? value.gameId
      : null
  const roomId =
    typeof value.roomId === 'string' && value.roomId.trim() !== ''
      ? value.roomId
      : null
  const updatedAt =
    typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
      ? Math.trunc(value.updatedAt)
      : null

  if (!gameId || !roomId || updatedAt == null) {
    return null
  }

  return {
    gameId,
    roomId,
    updatedAt,
  }
}

export const readMockGameResumeContext = (): MockGameResumeContext | null => {
  if (!canUseStorage()) {
    return null
  }

  const rawValue = window.localStorage.getItem(MOCK_GAME_RESUME_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    return normalizeStoredContext(JSON.parse(rawValue))
  } catch {
    return null
  }
}

export const writeMockGameResumeContext = (
  context: MockGameResumeContext
): void => {
  if (!canUseStorage()) {
    return
  }

  const normalizedContext = normalizeStoredContext(context)
  if (!normalizedContext) {
    return
  }

  window.localStorage.setItem(
    MOCK_GAME_RESUME_STORAGE_KEY,
    JSON.stringify(normalizedContext)
  )
}

export const clearMockGameResumeContext = (): void => {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(MOCK_GAME_RESUME_STORAGE_KEY)
}
