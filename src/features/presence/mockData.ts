import type { OnlineUserPayload } from './types'

// 접속자 목록 UI 개발용 초기 목 데이터
const INITIAL_MOCK_ONLINE_USERS: OnlineUserPayload[] = [
  {
    id: 'user-1',
    nickname: '마블왕',
    status: 'lobby',
  },
  {
    id: 'user-2',
    nickname: '주사위마스터',
    status: 'playing',
  },
  {
    id: 'user-3',
    nickname: '행운의여신',
    status: 'in_room',
  },
  {
    id: 'user-4',
    nickname: '부동산왕',
    status: 'playing',
  },
]

// 목 접속자 목록 저장소
let mockOnlineUsersStore = [...INITIAL_MOCK_ONLINE_USERS]
const mockOnlineUsersListeners = new Set<(users: OnlineUserPayload[]) => void>()

// 저장소 최신 스냅샷을 구독자에게 전파
function notifyMockOnlineUsersChanged() {
  const snapshot = getMockOnlineUsersSnapshot()
  mockOnlineUsersListeners.forEach((listener) => {
    listener(snapshot)
  })
}

// 현재 목 접속자 목록 스냅샷 조회
export function getMockOnlineUsersSnapshot() {
  return mockOnlineUsersStore.map((user) => ({ ...user }))
}

// 목 접속자 목록을 초기 상태로 복구
export function resetMockOnlineUsers() {
  mockOnlineUsersStore = [...INITIAL_MOCK_ONLINE_USERS]
  notifyMockOnlineUsersChanged()
}

// 특정 접속자 상태를 변경하고 최신 스냅샷을 반환
export function setMockOnlineUserStatus(
  userId: string,
  status: OnlineUserPayload['status'],
  nickname?: string
) {
  let hasMatchedUser = false

  mockOnlineUsersStore = mockOnlineUsersStore.map((user) => {
    if (user.id !== userId) {
      return user
    }

    hasMatchedUser = true

    return {
      ...user,
      nickname: nickname ?? user.nickname,
      status,
    }
  })

  // 기존 목록에 없는 사용자면 새로 추가
  if (!hasMatchedUser) {
    mockOnlineUsersStore = [
      ...mockOnlineUsersStore,
      {
        id: userId,
        nickname: nickname ?? `플레이어-${userId.slice(0, 4)}`,
        status,
      },
    ]
  }

  notifyMockOnlineUsersChanged()

  return getMockOnlineUsersSnapshot()
}

// 접속자 저장소 변경을 구독하고 해제 함수를 반환
export function subscribeMockOnlineUsersChange(
  listener: (users: OnlineUserPayload[]) => void
) {
  mockOnlineUsersListeners.add(listener)

  return () => {
    mockOnlineUsersListeners.delete(listener)
  }
}
