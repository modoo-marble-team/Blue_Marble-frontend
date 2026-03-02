import { apiClient } from '../../lib/axios'
import { parseApiError } from '../../lib/apiError'
import {
  mockCreateWaitingRoom,
  mockJoinWaitingRoom,
  mockLeaveWaitingRoom,
  mockStartWaitingGame,
  mockToggleWaitingReady,
  WaitingRoomMockError,
} from './mockGateway'
import type {
  CreateRoomResponsePayload,
  JoinWaitingRoomResponsePayload,
  LeaveWaitingRoomResponsePayload,
  StartWaitingGameResponsePayload,
  ToggleWaitingReadyResponsePayload,
  WaitingRoomChatPayload,
  WaitingRoomPlayerPayload,
  WaitingRoomSnapshot,
} from './types'

// 대기방 기본 제목/정원과 모드 전환 플래그
const DEFAULT_WAITING_ROOM_TITLE = '즐거운 게임 한판!'
const DEFAULT_WAITING_ROOM_MAX_PLAYERS = 4
const USE_WAITING_ROOM_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_SOCKET_MOCK !== 'false'
// 비밀번호 불일치로 간주할 서버 에러 코드 집합
const JOIN_PASSWORD_MISMATCH_ERROR_CODES = new Set([
  'ROOM_PASSWORD_MISMATCH',
  'INVALID_ROOM_PASSWORD',
  'PASSWORD_MISMATCH',
])

// 대기방 입장 요청 파라미터 타입
interface JoinWaitingRoomParams {
  roomId: string
  userId: string
  nickname: string
  fallbackTitle?: string
  password?: string
}

// 방 생성 요청 파라미터 타입
interface CreateWaitingRoomParams {
  title: string
  isPrivate: boolean
  password?: string
  hostUserId: string
  hostNickname: string
}

// 방 생성 후 페이지 이동에 사용하는 결과 타입
export interface CreateWaitingRoomResult {
  roomId: string
  roomTitle: string
  preJoinedSnapshot?: WaitingRoomSnapshot
}

// 퇴장/준비/시작 요청 파라미터 타입
interface LeaveWaitingRoomParams {
  roomId: string
  userId: string
}

interface ToggleWaitingReadyParams {
  roomId: string
  userId: string
}

interface StartWaitingGameParams {
  roomId: string
  userId: string
}

// 플레이어 payload를 화면 모델로 매핑
function mapRoomPlayer(payload: WaitingRoomPlayerPayload) {
  return {
    id: payload.id,
    nickname: payload.nickname,
    isReady: payload.is_ready,
    isHost: payload.is_host,
  }
}

// 채팅 payload를 화면 메시지 모델로 매핑
function mapChatMessage(payload: WaitingRoomChatPayload) {
  return {
    id: payload.id,
    senderId: payload.sender_id,
    senderNickname: payload.sender_nickname,
    content: payload.message,
    timestamp: payload.sent_at,
    type: payload.type,
  }
}

// 입장 응답 payload를 대기방 스냅샷으로 변환
function mapJoinResponse(
  payload: JoinWaitingRoomResponsePayload,
  fallbackTitle?: string
): WaitingRoomSnapshot {
  return {
    roomId: payload.room_id,
    title: payload.title || fallbackTitle || DEFAULT_WAITING_ROOM_TITLE,
    status: payload.status ?? 'waiting',
    maxPlayers: payload.max_players ?? DEFAULT_WAITING_ROOM_MAX_PLAYERS,
    isPrivate: payload.is_private ?? false,
    players: payload.players.map(mapRoomPlayer),
    chatMessages: (payload.chat_messages ?? []).map(mapChatMessage),
  }
}

// 방 생성 응답 payload를 생성 결과 모델로 변환
function mapCreateRoomResponse(
  payload: CreateRoomResponsePayload,
  hostUserId: string,
  hostNickname: string
): CreateWaitingRoomResult {
  return {
    roomId: payload.id,
    roomTitle: payload.title,
    preJoinedSnapshot: {
      roomId: payload.id,
      title: payload.title || DEFAULT_WAITING_ROOM_TITLE,
      status: payload.status ?? 'waiting',
      maxPlayers: payload.max_players ?? DEFAULT_WAITING_ROOM_MAX_PLAYERS,
      isPrivate: payload.is_private ?? false,
      players: [
        {
          id: hostUserId,
          nickname: hostNickname,
          isReady: false,
          isHost: true,
        },
      ],
      chatMessages: [],
    },
  }
}

// 방 생성 API 호출 또는 목 게이트웨이 호출
export async function createWaitingRoom({
  title,
  isPrivate,
  password,
  hostUserId,
  hostNickname,
}: CreateWaitingRoomParams): Promise<CreateWaitingRoomResult> {
  // 개발 목 모드에서는 mock 게이트웨이를 사용
  if (USE_WAITING_ROOM_MOCK) {
    return mockCreateWaitingRoom({
      title,
      isPrivate,
      password,
      hostUserId,
      hostNickname,
    })
  }

  const { data } = await apiClient.post<CreateRoomResponsePayload>('/rooms', {
    title,
    is_private: isPrivate,
    password: isPrivate ? password : null,
  })

  // 실서버 응답을 화면 모델로 정규화
  return mapCreateRoomResponse(data, hostUserId, hostNickname)
}

// 대기방 입장 API 호출 또는 목 게이트웨이 호출
export async function joinWaitingRoom({
  roomId,
  userId,
  nickname,
  fallbackTitle,
  password,
}: JoinWaitingRoomParams) {
  if (USE_WAITING_ROOM_MOCK) {
    return mockJoinWaitingRoom({
      roomId,
      userId,
      nickname,
      password,
    })
  }

  const requestBody = password ? { password } : undefined
  const { data } = await apiClient.post<JoinWaitingRoomResponsePayload>(
    `/rooms/${roomId}/join`,
    requestBody
  )

  return mapJoinResponse(data, fallbackTitle)
}

// 대기방 퇴장 API 호출 또는 목 게이트웨이 호출
export async function leaveWaitingRoom({
  roomId,
  userId,
}: LeaveWaitingRoomParams) {
  if (USE_WAITING_ROOM_MOCK) {
    return mockLeaveWaitingRoom({
      roomId,
      userId,
    })
  }

  const { data } = await apiClient.post<LeaveWaitingRoomResponsePayload>(
    `/rooms/${roomId}/leave`
  )

  return {
    success: data.success,
    newHostId: data.new_host_id,
  }
}

// 준비 상태 토글 API 호출 또는 목 게이트웨이 호출
export async function toggleWaitingReady({
  roomId,
  userId,
}: ToggleWaitingReadyParams) {
  if (USE_WAITING_ROOM_MOCK) {
    return mockToggleWaitingReady({
      roomId,
      userId,
    })
  }

  const { data } = await apiClient.patch<ToggleWaitingReadyResponsePayload>(
    `/rooms/${roomId}/ready`
  )

  return {
    isReady: data.is_ready,
  }
}

// 게임 시작 API 호출 또는 목 게이트웨이 호출
export async function startWaitingGame({
  roomId,
  userId,
}: StartWaitingGameParams) {
  if (USE_WAITING_ROOM_MOCK) {
    return mockStartWaitingGame({
      roomId,
      userId,
    })
  }

  const { data } = await apiClient.post<StartWaitingGameResponsePayload>(
    `/rooms/${roomId}/start`
  )

  return {
    success: data.success,
    gameId: data.game_id,
  }
}

// API/목 에러를 사용자 표시용 메시지로 정규화
export function getWaitingRoomErrorMessage(
  error: unknown,
  fallbackMessage: string
) {
  // 목 게이트웨이 에러는 detail > message 순으로 사용
  if (error instanceof WaitingRoomMockError) {
    return error.detail ?? error.message
  }

  // 실서버 에러는 detail 우선으로 사용자 메시지 선택
  const parsedError = parseApiError(error)
  const normalizedMessage = parsedError.detail ?? parsedError.message

  if (normalizedMessage) {
    return normalizedMessage
  }

  return fallbackMessage
}

// code 값이 비밀번호 불일치 케이스인지 판별
function isJoinPasswordMismatchCode(code?: string) {
  if (!code) {
    return false
  }

  return JOIN_PASSWORD_MISMATCH_ERROR_CODES.has(code.toUpperCase())
}

// 입장 실패 원인이 비밀번호 불일치인지 판별
export function isJoinPasswordMismatchError(error: unknown) {
  if (error instanceof WaitingRoomMockError) {
    return isJoinPasswordMismatchCode(error.code) || error.status === 403
  }

  const parsedError = parseApiError(error)

  return (
    isJoinPasswordMismatchCode(parsedError.code) || parsedError.status === 403
  )
}
