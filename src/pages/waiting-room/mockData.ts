export interface WaitingRoomSeat {
  id: string
  nickname: string
  avatarColor: string
  isHost: boolean
  isReady: boolean
  isMe?: boolean
}

export interface WaitingRoomChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  type: 'talk' | 'system'
  avatarEmoji?: string
}

export const waitingRoomMock = {
  roomIdLabel: 'Room 5',
  roomTitle: '즐거운 게임 한판!',
  seats: [
    {
      id: 'me',
      nickname: 'GoormEE',
      avatarColor: '#ff3b4d',
      isHost: true,
      isReady: false,
      isMe: true,
    },
    {
      id: 'player-2',
      nickname: 'MarbleKing',
      avatarColor: '#3b82f6',
      isHost: false,
      isReady: true,
    },
    null,
    null,
  ] as Array<WaitingRoomSeat | null>,
  chatMessages: [
    {
      id: 'chat-1',
      senderId: 'me',
      senderName: 'GoormEE',
      content: '빨리 시작하죠! 현기증 난단 말이에요🤣',
      timestamp: '2026-02-26T14:30:00+09:00',
      type: 'talk',
      avatarEmoji: '🐶',
    },
    {
      id: 'chat-2',
      senderId: 'player-2',
      senderName: 'MarbleKing',
      content: '잠시만요 화장실좀 ㅎㅎ 금방 다녀올게요!',
      timestamp: '2026-02-26T14:31:00+09:00',
      type: 'talk',
      avatarEmoji: '🐱',
    },
    {
      id: 'chat-3',
      senderId: 'system',
      senderName: 'System',
      content: 'MarbleKing님이 준비를 완료했습니다.',
      timestamp: '2026-02-26T14:31:30+09:00',
      type: 'system',
    },
  ] as WaitingRoomChatMessage[],
}
