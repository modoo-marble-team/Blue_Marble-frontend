import { apiClient } from '../../lib/axios'
import { parseApiError } from '../../lib/apiError'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
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
const USE_WAITING_ROOM_MOCK = IS_SOCKET_MOCK_ENABLED
const WAITING_ROOM_STATUS_VALUES = new Set(['waiting', 'playing'])
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

type UnknownRecord = Record<string, unknown>

// 입장 응답 계약 미일치 시 공통으로 던지는 오류 타입
export class WaitingRoomContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WaitingRoomContractError'
  }
}

// object인지 확인하고 안전한 Record로 변환
function toRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as UnknownRecord
}

// 계약 오류 메시지를 필드 경로 기준으로 통일
function createFieldContractError(fieldPath: string) {
  return new WaitingRoomContractError(
    `ROOM_JOIN_INVALID_RESPONSE: ${fieldPath} 필드가 올바르지 않습니다.`
  )
}

// 필수 문자열 필드를 검증해 반환
function readRequiredString(record: UnknownRecord, fieldName: string) {
  const fieldValue = record[fieldName]
  if (typeof fieldValue !== 'string' || fieldValue.trim().length === 0) {
    throw createFieldContractError(fieldName)
  }

  return fieldValue
}

// 필수 number 필드를 검증해 반환
function readRequiredNumber(record: UnknownRecord, fieldName: string) {
  const fieldValue = record[fieldName]
  if (typeof fieldValue !== 'number' || Number.isNaN(fieldValue)) {
    throw createFieldContractError(fieldName)
  }

  return fieldValue
}

// 필수 boolean 필드를 검증해 반환
function readRequiredBoolean(record: UnknownRecord, fieldName: string) {
  const fieldValue = record[fieldName]
  if (typeof fieldValue !== 'boolean') {
    throw createFieldContractError(fieldName)
  }

  return fieldValue
}

// 필수 배열 필드를 검증해 반환
function readRequiredArray(record: UnknownRecord, fieldName: string) {
  const fieldValue = record[fieldName]
  if (!Array.isArray(fieldValue)) {
    throw createFieldContractError(fieldName)
  }

  return fieldValue
}

// 입장 응답 players[] 원소를 계약 기준으로 정규화
function parseJoinPlayerPayload(
  item: unknown,
  index: number
): WaitingRoomPlayerPayload {
  const playerRecord = toRecord(item)
  if (!playerRecord) {
    throw createFieldContractError(`players[${index}]`)
  }

  return {
    id: readRequiredString(playerRecord, `id`),
    nickname: readRequiredString(playerRecord, `nickname`),
    is_ready: readRequiredBoolean(playerRecord, `is_ready`),
    is_host: readRequiredBoolean(playerRecord, `is_host`),
  }
}

// 입장 응답 chat_messages[] 원소를 계약 기준으로 정규화
function parseJoinChatPayload(
  item: unknown,
  index: number
): WaitingRoomChatPayload {
  const chatRecord = toRecord(item)
  if (!chatRecord) {
    throw createFieldContractError(`chat_messages[${index}]`)
  }

  const messageType = readRequiredString(chatRecord, `type`)
  if (messageType !== 'talk') {
    throw createFieldContractError(`chat_messages[${index}].type`)
  }

  return {
    id: readRequiredString(chatRecord, 'id'),
    sender_id: readRequiredString(chatRecord, 'sender_id'),
    sender_nickname: readRequiredString(chatRecord, 'sender_nickname'),
    message: readRequiredString(chatRecord, 'message'),
    sent_at: readRequiredString(chatRecord, 'sent_at'),
    type: messageType,
  }
}

// ROOM-002(join) 응답을 최신 계약 기준으로 strict 검증
export function parseJoinWaitingRoomPayload(
  payload: unknown
): JoinWaitingRoomResponsePayload {
  const payloadRecord = toRecord(payload)
  if (!payloadRecord) {
    throw new WaitingRoomContractError(
      'ROOM_JOIN_INVALID_RESPONSE: join 응답이 object 형태가 아닙니다.'
    )
  }

  const status = readRequiredString(payloadRecord, 'status')
  if (!WAITING_ROOM_STATUS_VALUES.has(status)) {
    throw createFieldContractError('status')
  }
  const normalizedStatus = status as JoinWaitingRoomResponsePayload['status']

  return {
    room_id: readRequiredString(payloadRecord, 'room_id'),
    title: readRequiredString(payloadRecord, 'title'),
    status: normalizedStatus,
    max_players: readRequiredNumber(payloadRecord, 'max_players'),
    is_private: readRequiredBoolean(payloadRecord, 'is_private'),
    players: readRequiredArray(payloadRecord, 'players').map(
      parseJoinPlayerPayload
    ),
    chat_messages: readRequiredArray(payloadRecord, 'chat_messages').map(
      parseJoinChatPayload
    ),
  }
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

// 계약 검증된 입장 응답 payload를 대기방 스냅샷으로 변환
function mapJoinResponse(
  payload: JoinWaitingRoomResponsePayload
): WaitingRoomSnapshot {
  return {
    roomId: payload.room_id,
    title: payload.title,
    status: payload.status,
    maxPlayers: payload.max_players,
    isPrivate: payload.is_private,
    players: payload.players.map(mapRoomPlayer),
    chatMessages: payload.chat_messages.map(mapChatMessage),
  }
}

// 방 생성 응답 payload를 생성 결과 모델로 변환
function mapCreateRoomResponse(
  payload: CreateRoomResponsePayload
): CreateWaitingRoomResult {
  return {
    roomId: payload.id,
    roomTitle: payload.title || DEFAULT_WAITING_ROOM_TITLE,
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
  return mapCreateRoomResponse(data)
}

// 대기방 입장 API 호출 또는 목 게이트웨이 호출
export async function joinWaitingRoom(params: JoinWaitingRoomParams) {
  const { roomId, userId, nickname, password } = params

  if (USE_WAITING_ROOM_MOCK) {
    return mockJoinWaitingRoom({
      roomId,
      userId,
      nickname,
      password,
    })
  }

  const requestBody = password ? { password } : undefined
  const { data } = await apiClient.post<unknown>(
    `/rooms/${roomId}/join`,
    requestBody
  )

  const joinPayload = parseJoinWaitingRoomPayload(data)
  return mapJoinResponse(joinPayload)
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
