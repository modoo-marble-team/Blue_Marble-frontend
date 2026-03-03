import type {
  OnlineUser,
  OnlineUserPayload,
} from '../../features/presence/types'

// 접속자 payload fixture 생성
export function createOnlineUserPayloadFixture(
  overrides: Partial<OnlineUserPayload> = {}
): OnlineUserPayload {
  return {
    id: 'user-1',
    nickname: '플레이어1',
    status: 'lobby',
    ...overrides,
  }
}

// UI용 접속자 모델 fixture 생성
export function createOnlineUserFixture(
  overrides: Partial<OnlineUser> = {}
): OnlineUser {
  return {
    id: 'user-1',
    nickname: '플레이어1',
    status: 'lobby',
    avatarText: '플',
    avatarBackground: '#dbeafe',
    ...overrides,
  }
}
