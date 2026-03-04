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

// 현재 목 접속자 목록 스냅샷 조회
export function getMockOnlineUsersSnapshot() {
  return mockOnlineUsersStore.map((user) => ({ ...user }))
}

// 목 접속자 목록을 초기 상태로 복구
export function resetMockOnlineUsers() {
  mockOnlineUsersStore = [...INITIAL_MOCK_ONLINE_USERS]
}

// 특정 접속자 상태를 변경하고 최신 스냅샷을 반환
export function setMockOnlineUserStatus(
  userId: string,
  status: OnlineUserPayload['status']
) {
  mockOnlineUsersStore = mockOnlineUsersStore.map((user) => {
    if (user.id !== userId) {
      return user
    }

    return {
      ...user,
      status,
    }
  })

  return getMockOnlineUsersSnapshot()
}
