import type { OnlineUser } from './types'

export const mockOnlineUsers: OnlineUser[] = [
  {
    id: 'user-1',
    nickname: '마블왕',
    status: 'WAITING',
    avatarText: 'M',
    avatarBackground: '#f6c8a9',
  },
  {
    id: 'user-2',
    nickname: '주사위마스터',
    status: 'PLAYING',
    avatarText: 'D',
    avatarBackground: '#7f8ea3',
  },
  {
    id: 'user-3',
    nickname: '행운의여신',
    status: 'WAITING',
    avatarText: 'L',
    avatarBackground: '#dbc4f8',
  },
  {
    id: 'user-4',
    nickname: '부동산왕',
    status: 'PLAYING',
    avatarText: 'R',
    avatarBackground: '#8f7f77',
  },
]
