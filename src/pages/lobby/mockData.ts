import type { LobbyRoom } from './types'

// 백엔드 미연동 환경에서 사용하는 로비 방 목 데이터
export const mockLobbyRooms: LobbyRoom[] = [
  {
    id: 'room-5',
    title: '일반방',
    status: 'waiting',
    currentPlayers: 2,
    maxPlayers: 4,
    isPrivate: false,
  },
  {
    id: 'room-2',
    title: '비밀방 비밀번호 1234',
    status: 'waiting',
    currentPlayers: 1,
    maxPlayers: 4,
    isPrivate: true,
  },
  {
    id: 'room-4',
    title: '게임 중 방',
    status: 'playing',
    currentPlayers: 2,
    maxPlayers: 4,
    isPrivate: false,
  },
  {
    id: 'room-1',
    title: '정원초과 방',
    status: 'waiting',
    currentPlayers: 4,
    maxPlayers: 4,
    isPrivate: false,
  },
]
