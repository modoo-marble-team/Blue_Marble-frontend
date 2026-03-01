import type {
  NicknameAvailabilityResult,
  AuthSession,
  MyPageProfileResult,
  MyPageStats,
  NicknameSetResult,
  NicknameValidationResult,
} from './types'

const MOCK_AUTH_DELAY_MS = 350
const MOCK_NICKNAME_CHECK_DELAY_MS = 0
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

// setTimeout으로 지연 Promise 반환
function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms)
  })
}

// crypto.randomUUID 우선, 없으면 랜덤+timestamp로 UUID 생성
function createMockUuid() {
  // 브라우저가 randomUUID를 지원하면 표준 UUID 사용
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`
}

// 카카오 mock 사용자 객체를 localStorage JSON으로 저장
function saveMockKakaoUser(user: MockKakaoUser) {
  window.localStorage.setItem(KAKAO_USER_STORAGE_KEY, JSON.stringify(user))
}

// localStorage JSON 파싱 후 MockKakaoUser 스키마 검사해서 반환
function getStoredMockKakaoUser() {
  const storedValue = window.localStorage.getItem(KAKAO_USER_STORAGE_KEY)
  // 저장 값이 없으면 미로그인 상태로 간주
  if (!storedValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(storedValue)
    // JSON 파싱 결과가 객체가 아니면 무효 처리
    if (!parsedValue || typeof parsedValue !== 'object') {
      return null
    }

    // 필수 필드 타입이 하나라도 다르면 무효 처리
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

// 기본 kakaoId/프로필 이미지로 초기 mock 사용자 생성
function createMockKakaoUser() {
  return {
    id: createMockUuid(),
    kakaoId: DEFAULT_MOCK_KAKAO_ID,
    nickname: null,
    profileImage: DEFAULT_MOCK_KAKAO_PROFILE_IMAGE,
  } as MockKakaoUser
}

// 저장 사용자 우선 반환, 없으면 생성 후 저장
function getOrCreateMockKakaoUser() {
  const storedUser = getStoredMockKakaoUser()
  // 기존 사용자 정보가 있으면 재생성 없이 그대로 사용
  if (storedUser) {
    return storedUser
  }

  const newUser = createMockKakaoUser()
  saveMockKakaoUser(newUser)
  return newUser
}

// 기존 mock 사용자에 닉네임만 덮어쓴 뒤 저장
function updateMockKakaoNickname(nickname: string) {
  const currentUser = getOrCreateMockKakaoUser()
  saveMockKakaoUser({
    ...currentUser,
    nickname,
  })
}

// 닉네임 저장 키가 없을 때 기본 닉네임 목록 시드
function seedTakenNicknamesIfMissing() {
  // 이미 시드가 있으면 중복 초기화 방지
  if (window.localStorage.getItem(TAKEN_NICKNAMES_STORAGE_KEY)) {
    return
  }

  window.localStorage.setItem(
    TAKEN_NICKNAMES_STORAGE_KEY,
    JSON.stringify(DEFAULT_TAKEN_NICKNAMES)
  )
}

// 저장 닉네임 목록 조회, 파싱 실패/형식 불일치면 기본 목록 복구
function getStoredTakenNicknames() {
  const storedValue = window.localStorage.getItem(TAKEN_NICKNAMES_STORAGE_KEY)
  // 저장 값이 없으면 기본 닉네임 목록 반환
  if (!storedValue) {
    return [...DEFAULT_TAKEN_NICKNAMES]
  }

  try {
    const parsedValue = JSON.parse(storedValue)
    // 배열 형식이 아니면 기본 닉네임 목록 복구
    if (!Array.isArray(parsedValue)) {
      return [...DEFAULT_TAKEN_NICKNAMES]
    }

    const normalizedList = parsedValue.filter(
      (value): value is string => typeof value === 'string'
    )

    // 문자열 닉네임이 하나도 없으면 기본 닉네임 목록 복구
    if (normalizedList.length === 0) {
      return [...DEFAULT_TAKEN_NICKNAMES]
    }

    return normalizedList
  } catch {
    return [...DEFAULT_TAKEN_NICKNAMES]
  }
}

// 닉네임 문자열 배열을 localStorage JSON으로 저장
function saveTakenNicknames(nicknames: string[]) {
  window.localStorage.setItem(
    TAKEN_NICKNAMES_STORAGE_KEY,
    JSON.stringify(nicknames)
  )
}

// 소문자 정규화 기준으로 닉네임 중복 검사
function isNicknameDuplicate(nickname: string) {
  const normalizedNickname = nickname.toLowerCase()
  return getStoredTakenNicknames().some(
    (savedNickname) => savedNickname.toLowerCase() === normalizedNickname
  )
}

// 닉네임 목록에 없을 때만 추가 저장
function addTakenNickname(nickname: string) {
  const currentNicknames = getStoredTakenNicknames()
  // 기존 목록에 있으면 중복 저장 생략
  if (currentNicknames.includes(nickname)) {
    return
  }
  saveTakenNicknames([...currentNicknames, nickname])
}

// UUID 앞 4자리를 붙여 Guest_XXXX 형식 닉네임 생성
function createGuestNickname() {
  const uuid = createMockUuid().replace(/-/g, '')
  return `Guest_${uuid.slice(0, 4)}`
}

// userId 해시값 기반으로 wins/losses를 안정적으로 계산
function createMockMyPageStats(userId: string): MyPageStats {
  let hash = 0
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) | 0
  }

  const normalizedHash = Math.abs(hash)
  const wins = 100 + (normalizedHash % 700)
  const losses = 100 + ((normalizedHash >> 4) % 700)

  return {
    total: wins + losses,
    wins,
    losses,
  }
}

// trim/공백/길이/문자셋 순서로 닉네임 형식 검증
export function validateNickname(nickname: string): NicknameValidationResult {
  const normalizedNickname = nickname.trim()

  // 앞뒤 공백 또는 중간 공백이 있으면 즉시 실패
  if (nickname !== normalizedNickname || /\s/.test(nickname)) {
    return {
      ok: false,
      normalizedNickname,
      message: '공백은 사용할 수 없습니다.',
    }
  }

  // 길이 조건(2~10자) 위반 시 실패
  if (normalizedNickname.length < 2 || normalizedNickname.length > 10) {
    return {
      ok: false,
      normalizedNickname,
      message: '닉네임은 2~10자여야 합니다.',
    }
  }

  // 허용 문자셋(한글/영문/숫자) 위반 시 실패
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

// 카카오 mock 사용자 조회 후 닉네임 상태를 반영한 세션 발급
export async function mockKakaoLogin() {
  await delay(MOCK_AUTH_DELAY_MS)
  seedTakenNicknamesIfMissing()

  const kakaoUser = getOrCreateMockKakaoUser()
  const existingNickname =
    typeof kakaoUser.nickname === 'string' ? kakaoUser.nickname : ''
  const hasNickname = existingNickname.length > 0

  // 닉네임이 이미 있으면 중복 검사 대상에 등록
  if (hasNickname) {
    addTakenNickname(existingNickname)
  }

  const session: AuthSession = {
    accessToken: `mock-kakao-token-${kakaoUser.id}`,
    userId: kakaoUser.id,
    nickname: existingNickname,
    profileImage: kakaoUser.profileImage,
    isGuest: false,
    needsNicknameSetup: !hasNickname,
    provider: 'kakao',
  }

  return session
}

// 랜덤 게스트 닉네임 생성 후 게스트 세션 발급
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
    profileImage: null,
    isGuest: true,
    needsNicknameSetup: false,
    provider: 'guest',
  }

  return session
}

// 형식 검증 통과 시 중복 검사까지 수행해 사용 가능 여부 반환
export async function mockCheckNicknameAvailability(
  nickname: string
): Promise<NicknameAvailabilityResult> {
  // 디버그용 지연값이 설정된 경우에만 딜레이 적용
  if (MOCK_NICKNAME_CHECK_DELAY_MS > 0) {
    await delay(MOCK_NICKNAME_CHECK_DELAY_MS)
  }
  seedTakenNicknamesIfMissing()

  const validationResult = validateNickname(nickname)
  // 형식이 틀리면 중복 검사 없이 바로 실패 반환
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

// 게스트 차단 + 형식/중복 검증 후 닉네임 저장
export async function mockSetNickname({
  session,
  nickname,
}: MockSetNicknameParams): Promise<NicknameSetResult> {
  await delay(MOCK_AUTH_DELAY_MS)
  seedTakenNicknamesIfMissing()

  // 게스트는 닉네임 변경을 허용하지 않음
  if (session.isGuest) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: '게스트는 닉네임 설정을 사용할 수 없습니다.',
    }
  }

  const validationResult = validateNickname(nickname)
  // 형식 검증 실패 시 저장 단계로 진행하지 않음
  if (!validationResult.ok) {
    return {
      ok: false,
      code: 'INVALID_FORMAT',
      message: validationResult.message,
    }
  }

  // 이미 등록된 닉네임이면 저장 차단
  if (isNicknameDuplicate(validationResult.normalizedNickname)) {
    return {
      ok: false,
      code: 'DUPLICATE',
      message: '이미 사용 중인 닉네임입니다.',
    }
  }

  addTakenNickname(validationResult.normalizedNickname)
  // 카카오 계정은 프로필 저장소 닉네임도 함께 동기화
  if (session.provider === 'kakao') {
    updateMockKakaoNickname(validationResult.normalizedNickname)
  }

  return {
    ok: true,
    nickname: validationResult.normalizedNickname,
  }
}

// 카카오 사용자 기준 프로필과 해시 기반 전적 데이터 반환
export async function mockGetMyPageProfile(
  session: AuthSession
): Promise<MyPageProfileResult> {
  await delay(MOCK_AUTH_DELAY_MS)

  // 게스트는 마이페이지 조회 권한이 없음
  if (session.isGuest) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: '게스트는 마이페이지를 이용할 수 없습니다.',
    }
  }

  const kakaoUser = getOrCreateMockKakaoUser()
  const profileNickname =
    session.nickname.trim().length > 0
      ? session.nickname
      : (kakaoUser.nickname ?? '플레이어')

  return {
    ok: true,
    profile: {
      id: session.userId,
      nickname: profileNickname,
      profileImage: session.profileImage ?? kakaoUser.profileImage,
      stats: createMockMyPageStats(session.userId),
    },
  }
}
