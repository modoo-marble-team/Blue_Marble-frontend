import type { OnlineUserStatus } from './types'

// 접속자 상태별 텍스트 라벨 매핑
export const ONLINE_USER_STATUS_LABEL_MAP: Record<OnlineUserStatus, string> = {
  lobby: '로비',
  in_room: '대기방',
  playing: '게임중',
}

// 접속자 상태별 점 색상 클래스 매핑
export const ONLINE_USER_STATUS_DOT_CLASS_MAP: Record<
  OnlineUserStatus,
  string
> = {
  lobby: 'bg-ui-presence-lobby',
  in_room: 'bg-ui-presence-in-room',
  playing: 'bg-ui-presence-playing-status',
}
