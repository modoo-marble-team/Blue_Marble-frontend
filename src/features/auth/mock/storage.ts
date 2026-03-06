import {
  DEFAULT_MOCK_KAKAO_ID,
  DEFAULT_MOCK_KAKAO_PROFILE_IMAGE,
  DEFAULT_TAKEN_NICKNAMES,
  KAKAO_USER_STORAGE_KEY,
  TAKEN_NICKNAMES_STORAGE_KEY,
} from './constants'
import { createMockUuid } from './helpers'

export interface MockKakaoUser {
  id: string
  kakaoId: string
  nickname: string | null
  profileImage: string
}

// 카카오 사용자 JSON을 localStorage에 저장
function persistMockKakaoUser(user: MockKakaoUser) {
  window.localStorage.setItem(KAKAO_USER_STORAGE_KEY, JSON.stringify(user))
}

// localStorage JSON을 MockKakaoUser로 복원
function readStoredMockKakaoUser() {
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

// 저장된 카카오 사용자가 없을 때 기본 사용자 생성 후 저장
export function getOrCreateMockKakaoUser() {
  const storedUser = readStoredMockKakaoUser()
  if (storedUser) {
    return storedUser
  }

  const createdUser: MockKakaoUser = {
    id: createMockUuid(),
    kakaoId: DEFAULT_MOCK_KAKAO_ID,
    nickname: null,
    profileImage: DEFAULT_MOCK_KAKAO_PROFILE_IMAGE,
  }

  persistMockKakaoUser(createdUser)
  return createdUser
}

// 카카오 사용자 닉네임을 localStorage에 반영
export function persistMockKakaoNickname(nickname: string) {
  const currentUser = getOrCreateMockKakaoUser()
  persistMockKakaoUser({
    ...currentUser,
    nickname,
  })
}

// 중복 닉네임 시드가 없을 때 기본 목록을 1회 저장
export function ensureTakenNicknamesSeeded() {
  if (window.localStorage.getItem(TAKEN_NICKNAMES_STORAGE_KEY)) {
    return
  }

  window.localStorage.setItem(
    TAKEN_NICKNAMES_STORAGE_KEY,
    JSON.stringify(DEFAULT_TAKEN_NICKNAMES)
  )
}

// 저장된 닉네임 목록을 읽고 형식 불일치면 기본 목록으로 복구
function readTakenNicknamesFromStorage() {
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

// 닉네임 문자열 배열을 localStorage JSON으로 덮어쓰기 저장
function persistTakenNicknames(nicknames: string[]) {
  window.localStorage.setItem(
    TAKEN_NICKNAMES_STORAGE_KEY,
    JSON.stringify(nicknames)
  )
}

// 대소문자 무시 기준으로 닉네임 중복 여부 확인
export function isTakenNickname(nickname: string) {
  const normalizedNickname = nickname.toLowerCase()
  return readTakenNicknamesFromStorage().some(
    (savedNickname) => savedNickname.toLowerCase() === normalizedNickname
  )
}

// 기존 목록에 없을 때만 닉네임 저장
export function addTakenNickname(nickname: string) {
  const currentNicknames = readTakenNicknamesFromStorage()
  if (currentNicknames.includes(nickname)) {
    return
  }

  persistTakenNicknames([...currentNicknames, nickname])
}
