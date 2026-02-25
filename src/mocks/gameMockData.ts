import { Tile, Player, ChatMessage } from '../types/domain'

export const mockTiles: Tile[] = [
  // 0-8: Bottom (R to L) - Actually in my Board.tsx I mapped 0-8 to Bottom.
  // Matching my Board.tsx logic: topTiles = 16-24, leftTiles = 9-15, bottomTiles = 0-8, rightTiles = 25-31
  { index: 0, name: 'START', type: 'start', building: 0 },
  {
    index: 1,
    name: '수원',
    type: 'property',
    building: 0,
    price: 60,
    color: '#f97316',
  }, // Orange
  {
    index: 2,
    name: '용인',
    type: 'property',
    building: 0,
    price: 60,
    color: '#f97316',
  },
  { index: 3, name: '?', type: 'chance', building: 0 },
  {
    index: 4,
    name: '군산',
    type: 'property',
    building: 0,
    price: 60,
    color: '#22c55e',
  }, // Green
  {
    index: 5,
    name: '평택',
    type: 'property',
    building: 0,
    price: 60,
    color: '#22c55e',
  },
  {
    index: 6,
    name: '익산',
    type: 'property',
    building: 0,
    price: 60,
    color: '#22c55e',
  },
  { index: 7, name: '🎁', type: 'card', building: 0 },
  { index: 8, name: '무인도', type: 'jail', building: 0 },

  // 9-15: Left (B to T)
  {
    index: 9,
    name: '제주',
    type: 'property',
    building: 0,
    price: 60,
    color: '#ef4444',
  }, // Red
  {
    index: 10,
    name: '여수',
    type: 'property',
    building: 0,
    price: 60,
    color: '#ef4444',
  },
  {
    index: 11,
    name: '광주',
    type: 'property',
    building: 0,
    price: 60,
    color: '#ef4444',
  },
  {
    index: 12,
    name: '포항',
    type: 'property',
    building: 0,
    price: 60,
    color: '#a855f7',
  }, // Purple
  {
    index: 13,
    name: '대구',
    type: 'property',
    building: 0,
    price: 60,
    color: '#a855f7',
  },
  { index: 14, name: '?', type: 'chance', building: 0 },
  {
    index: 15,
    name: '경주',
    type: 'property',
    building: 0,
    price: 60,
    color: '#a855f7',
  },

  // 16-24: Top (L to R)
  { index: 16, name: '기점', type: 'park', building: 0 },
  {
    index: 17,
    name: '강릉',
    type: 'property',
    building: 0,
    price: 60,
    color: '#3b82f6',
  }, // Blue
  {
    index: 18,
    name: '원주',
    type: 'property',
    building: 0,
    price: 60,
    color: '#3b82f6',
  },
  {
    index: 19,
    name: '춘천',
    type: 'property',
    building: 0,
    price: 60,
    color: '#3b82f6',
  },
  { index: 20, name: '?', type: 'chance', building: 0 },
  {
    index: 21,
    name: '광주',
    type: 'property',
    building: 0,
    price: 60,
    color: '#0ea5e9',
  }, // Cyan
  {
    index: 22,
    name: '여수',
    type: 'property',
    building: 0,
    price: 60,
    color: '#0ea5e9',
  },
  {
    index: 23,
    name: '제주',
    type: 'property',
    building: 0,
    price: 60,
    color: '#0ea5e9',
  },
  { index: 24, name: '세계여행', type: 'airport', building: 0 },

  // 25-31: Right (T to B)
  { index: 25, name: '무인도 이동', type: 'penalty', building: 0 },
  {
    index: 26,
    name: '원주',
    type: 'property',
    building: 0,
    price: 60,
    color: '#ec4899',
  }, // Pink
  {
    index: 27,
    name: '강릉',
    type: 'property',
    building: 0,
    price: 60,
    color: '#ec4899',
  },
  { index: 28, name: '?', type: 'chance', building: 0 },
  {
    index: 29,
    name: '춘천',
    type: 'property',
    building: 0,
    price: 60,
    color: '#f43f5e',
  }, // Rose
  { index: 30, name: '🎁', type: 'card', building: 0 },
  {
    index: 31,
    name: '서울',
    type: 'property',
    building: 0,
    price: 100,
    color: '#f43f5e',
  },
]

export const mockPlayers: Player[] = [
  {
    id: 'me',
    nickname: 'GoormEE',
    balance: 2000,
    position: 0,
    owned_tiles: [],
    is_in_jail: false,
    jail_turn_count: 0,
    is_bankrupt: false,
    color: '#ef4444',
    avatar: '🍎',
  },
  {
    id: 'player2',
    nickname: 'MarbleKing',
    balance: 1800,
    position: 0,
    owned_tiles: [],
    is_in_jail: false,
    jail_turn_count: 0,
    is_bankrupt: false,
    color: '#3b82f6',
    avatar: '⚽',
  },
  {
    id: 'player3',
    nickname: 'Player 3',
    balance: 1500,
    position: 0,
    owned_tiles: [],
    is_in_jail: false,
    jail_turn_count: 0,
    is_bankrupt: false,
    color: '#22c55e',
    avatar: '🌿',
  },
  {
    id: 'player4',
    nickname: 'Player 4',
    balance: 1400,
    position: 0,
    owned_tiles: [],
    is_in_jail: false,
    jail_turn_count: 0,
    is_bankrupt: false,
    color: '#eab308',
    avatar: '☀️',
  },
]

export const mockMessages: ChatMessage[] = [
  {
    id: '1',
    sender_id: 'system',
    sender_nickname: 'System',
    content: '게임이 시작되었습니다.',
    timestamp: new Date().toISOString(),
    type: 'system',
  },
  {
    id: '2',
    sender_id: 'player2',
    sender_nickname: 'MarbleKing',
    content: '즐겜해요~',
    timestamp: new Date().toISOString(),
    type: 'talk',
  },
  {
    id: '3',
    sender_id: 'me',
    sender_nickname: 'GoormEE',
    content: '모두의 마블 한판!',
    timestamp: new Date().toISOString(),
    type: 'talk',
  },
]
