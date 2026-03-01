import type { OnlineUserPayload } from './types'

// 접속자 목록 UI 개발용 목 데이터
export const mockOnlineUsers: OnlineUserPayload[] = [
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
