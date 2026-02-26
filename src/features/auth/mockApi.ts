import type {
  NicknameAvailabilityResult,
  AuthSession,
  NicknameSetResult,
  NicknameValidationResult,
} from './types'

const MOCK_AUTH_DELAY_MS = 350
const TAKEN_NICKNAMES_STORAGE_KEY = 'marble-pop-mock-taken-nicknames'
const KAKAO_USER_STORAGE_KEY = 'marble-pop-mock-kakao-user'
const DEFAULT_TAKEN_NICKNAMES = [
  '마블왕',
  '주사위마스터',
  '행운의여신',
  '부동산왕',
  'GoormEE',
]
const NICKNAME_PATTERN = /^[A-Za-z0-9가-힣]{2,10}$/
const DEFAULT_MOCK_KAKAO_PROFILE_IMAGE =
  'https://picsum.photos/seed/kakao/96/96'
const DEFAULT_MOCK_KAKAO_ID = 'mock-kakao-id-001'

interface MockKakaoUser {
  id: string
  kakaoId: string
  nickname: string | null
  profileImage: string
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms)
  })
}

function createMockUuid() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`
}

function saveMockKakaoUser(user: MockKakaoUser) {
  window.localStorage.setItem(KAKAO_USER_STORAGE_KEY, JSON.stringify(user))
}

function getStoredMockKakaoUser() {
  const storedValue = window.localStorage.getItem(KAKAO_USER_STORAGE_KEY)
  if (!storedValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(storedValue)
    if (!parsedValue || typeof parsedValue !== 'object') {
      return null
    }

    if (
      typeof parsedValue.id !== 'string' ||
      typeof parsedValue.kakaoId !== 'string' ||
      !(
        typeof parsedValue.nickname === 'string' ||
        parsedValue.nickname === null
      ) ||
      typeof parsedValue.profileImage !== 'string'
    ) {
      return null
    }

    return parsedValue as MockKakaoUser
  } catch {
    return null
  }
}

function createMockKakaoUser() {
  return {
    id: createMockUuid(),
    kakaoId: DEFAULT_MOCK_KAKAO_ID,
    nickname: null,
    profileImage: DEFAULT_MOCK_KAKAO_PROFILE_IMAGE,
  } as MockKakaoUser
}

function getOrCreateMockKakaoUser() {
  const storedUser = getStoredMockKakaoUser()
  if (storedUser) {
    return storedUser
  }

  const newUser = createMockKakaoUser()
  saveMockKakaoUser(newUser)
  return newUser
}

function updateMockKakaoNickname(nickname: string) {
  const currentUser = getOrCreateMockKakaoUser()
  saveMockKakaoUser({
    ...currentUser,
    nickname,
  })
}

function seedTakenNicknamesIfMissing() {
  if (window.localStorage.getItem(TAKEN_NICKNAMES_STORAGE_KEY)) {
    return
  }

  window.localStorage.setItem(
    TAKEN_NICKNAMES_STORAGE_KEY,
    JSON.stringify(DEFAULT_TAKEN_NICKNAMES)
  )
}

function getStoredTakenNicknames() {
  const storedValue = window.localStorage.getItem(TAKEN_NICKNAMES_STORAGE_KEY)
  if (!storedValue) {
    return [...DEFAULT_TAKEN_NICKNAMES]
  }

  try {
    const parsedValue = JSON.parse(storedValue)
    if (!Array.isArray(parsedValue)) {
      return [...DEFAULT_TAKEN_NICKNAMES]
    }

    const normalizedList = parsedValue.filter(
      (value): value is string => typeof value === 'string'
    )

    if (normalizedList.length === 0) {
      return [...DEFAULT_TAKEN_NICKNAMES]
    }

    return normalizedList
  } catch {
    return [...DEFAULT_TAKEN_NICKNAMES]
  }
}

function saveTakenNicknames(nicknames: string[]) {
  window.localStorage.setItem(
    TAKEN_NICKNAMES_STORAGE_KEY,
    JSON.stringify(nicknames)
  )
}

function isNicknameDuplicate(nickname: string) {
  const normalizedNickname = nickname.toLowerCase()
  return getStoredTakenNicknames().some(
    (savedNickname) => savedNickname.toLowerCase() === normalizedNickname
  )
}

function addTakenNickname(nickname: string) {
  const currentNicknames = getStoredTakenNicknames()
  if (currentNicknames.includes(nickname)) {
    return
  }
  saveTakenNicknames([...currentNicknames, nickname])
}

function createGuestNickname() {
  const uuid = createMockUuid().replace(/-/g, '')
  return `Guest_${uuid.slice(0, 4)}`
}

export function validateNickname(nickname: string): NicknameValidationResult {
  const normalizedNickname = nickname.trim()

  if (nickname !== normalizedNickname || /\s/.test(nickname)) {
    return {
      ok: false,
      normalizedNickname,
      message: '공백은 사용할 수 없습니다.',
    }
  }

  if (normalizedNickname.length < 2 || normalizedNickname.length > 10) {
    return {
      ok: false,
      normalizedNickname,
      message: '닉네임은 2~10자여야 합니다.',
    }
  }

  if (!NICKNAME_PATTERN.test(normalizedNickname)) {
    return {
      ok: false,
      normalizedNickname,
      message: '한글/영문/숫자만 입력할 수 있습니다.',
    }
  }

  return {
    ok: true,
    normalizedNickname,
  }
}

export async function mockKakaoLogin() {
  await delay(MOCK_AUTH_DELAY_MS)
  seedTakenNicknamesIfMissing()

  const kakaoUser = getOrCreateMockKakaoUser()
  const existingNickname =
    typeof kakaoUser.nickname === 'string' ? kakaoUser.nickname : ''
  const hasNickname = existingNickname.length > 0

  if (hasNickname) {
    addTakenNickname(existingNickname)
  }

  const session: AuthSession = {
    accessToken: `mock-kakao-token-${kakaoUser.id}`,
    userId: kakaoUser.id,
    nickname: existingNickname,
    isGuest: false,
    needsNicknameSetup: !hasNickname,
    provider: 'kakao',
  }

  return session
}

export async function mockGuestLogin() {
  await delay(MOCK_AUTH_DELAY_MS)
  seedTakenNicknamesIfMissing()

  const userId = createMockUuid()
  const nickname = createGuestNickname()
  addTakenNickname(nickname)

  const session: AuthSession = {
    accessToken: `mock-guest-token-${userId}`,
    userId,
    nickname,
    isGuest: true,
    needsNicknameSetup: false,
    provider: 'guest',
  }

  return session
}

export async function mockCheckNicknameAvailability(
  nickname: string
): Promise<NicknameAvailabilityResult> {
  await delay(MOCK_AUTH_DELAY_MS)
  seedTakenNicknamesIfMissing()

  const validationResult = validateNickname(nickname)
  if (!validationResult.ok) {
    return validationResult
  }

  return {
    ok: true,
    normalizedNickname: validationResult.normalizedNickname,
    isAvailable: !isNicknameDuplicate(validationResult.normalizedNickname),
  }
}

interface MockSetNicknameParams {
  session: AuthSession
  nickname: string
}

export async function mockSetNickname({
  session,
  nickname,
}: MockSetNicknameParams): Promise<NicknameSetResult> {
  await delay(MOCK_AUTH_DELAY_MS)
  seedTakenNicknamesIfMissing()

  if (session.isGuest) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: '게스트는 닉네임 설정을 사용할 수 없습니다.',
    }
  }

  const validationResult = validateNickname(nickname)
  if (!validationResult.ok) {
    return {
      ok: false,
      code: 'INVALID_FORMAT',
      message: validationResult.message,
    }
  }

  if (isNicknameDuplicate(validationResult.normalizedNickname)) {
    return {
      ok: false,
      code: 'DUPLICATE',
      message: '이미 사용 중인 닉네임입니다.',
    }
  }

  addTakenNickname(validationResult.normalizedNickname)
  if (session.provider === 'kakao') {
    updateMockKakaoNickname(validationResult.normalizedNickname)
  }

  return {
    ok: true,
    nickname: validationResult.normalizedNickname,
  }
}
