import type { ContractUserStatus } from './events'

// DM 정책: 송신자/수신자 중 한 명이라도 게임 중이면 차단
export function isDirectMessageBlockedByStatus(
  senderStatus: ContractUserStatus,
  receiverStatus: ContractUserStatus
) {
  return senderStatus === 'playing' || receiverStatus === 'playing'
}

interface WaitingRoomStartPlayer {
  isHost: boolean
  isReady: boolean
}

// 대기방 시작 조건: 최소 2명 + non-host 전원 준비 완료
export function isWaitingRoomStartConditionMet(
  players: WaitingRoomStartPlayer[]
) {
  if (players.length < 2) {
    return false
  }

  const nonHostPlayers = players.filter((player) => !player.isHost)
  if (nonHostPlayers.length === 0) {
    return false
  }

  return nonHostPlayers.every((player) => player.isReady)
}
