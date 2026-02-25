import type { OnlineUserStatus } from './types'

export const ONLINE_USER_STATUS_LABEL_MAP: Record<OnlineUserStatus, string> = {
  lobby: '로비',
  in_room: '대기방',
  playing: '게임중',
}

export const ONLINE_USER_STATUS_DOT_CLASS_MAP: Record<
  OnlineUserStatus,
  string
> = {
  lobby: 'bg-ui-presence-lobby',
  in_room: 'bg-ui-presence-in-room',
  playing: 'bg-ui-presence-playing-status',
}
