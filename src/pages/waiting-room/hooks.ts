import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuthSession } from '../../features/auth/types'
import type {
  GameStartEventPayload,
  WaitingRoomChatMessage,
  WaitingRoomSnapshot,
} from './types'
import { useWaitingRoomActions } from './controller/actions'
import { useWaitingRoomLifecycle } from './controller/lifecycle'
import {
  buildWaitingRoomSeats,
  getStartConditionMet,
  type WaitingRoomActionResult,
} from './controller/state'
import { useWaitingRoomSocketSync } from './controller/socketSync'

// 대기방 컨트롤러 훅 입력값 타입
interface UseWaitingRoomControllerParams {
  roomId: string
  session: AuthSession | null
  fallbackRoomTitle?: string
  preJoinedSnapshot?: WaitingRoomSnapshot | null
  onGameStart: (payload: GameStartEventPayload) => void
  onRoomRemoved: () => void
}

// 대기방 상태 동기화/소켓 구독/액션 핸들러를 통합한 컨트롤러 훅
export function useWaitingRoomController({
  roomId,
  session,
  fallbackRoomTitle,
  preJoinedSnapshot,
  onGameStart,
  onRoomRemoved,
}: UseWaitingRoomControllerParams) {
  const [room, setRoom] = useState<WaitingRoomSnapshot | null>(null)
  const [chatMessages, setChatMessages] = useState<WaitingRoomChatMessage[]>([])
  const [isRoomLoading, setIsRoomLoading] = useState(true)
  const [roomErrorMessage, setRoomErrorMessage] = useState<string | null>(null)
  const [isReadyPending, setIsReadyPending] = useState(false)
  const [isStartPending, setIsStartPending] = useState(false)
  const [isLeavePending, setIsLeavePending] = useState(false)

  const hasEnteredRoomRef = useRef(false)
  const hasLeftRoomRef = useRef(false)
  const hasInitializedPreJoinRef = useRef(false)
  const hasReceivedRoomUpdatedRef = useRef(false)
  const shouldSkipNextCleanupLeaveRef = useRef(import.meta.env.DEV)
  const leaveInFlightRef = useRef<Promise<WaitingRoomActionResult> | null>(null)
  const sessionRef = useRef<AuthSession | null>(session)
  const roomIdRef = useRef(roomId)
  const roomRef = useRef<WaitingRoomSnapshot | null>(room)

  // 최신 세션/roomId/room 값을 ref에 동기화해 cleanup에서도 동일 시퀀스 사용
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    roomIdRef.current = roomId
  }, [roomId])

  useEffect(() => {
    roomRef.current = room
  }, [room])

  const handleRoomRemoved = useCallback(() => {
    roomRef.current = null
    hasReceivedRoomUpdatedRef.current = false
    hasEnteredRoomRef.current = false
    hasLeftRoomRef.current = true
    hasInitializedPreJoinRef.current = false
    setRoomErrorMessage(null)
    setIsRoomLoading(false)
    onRoomRemoved()
  }, [onRoomRemoved])

  useWaitingRoomLifecycle({
    roomId,
    session,
    fallbackRoomTitle,
    preJoinedSnapshot,
    hasReceivedRoomUpdatedRef,
    hasEnteredRoomRef,
    hasLeftRoomRef,
    hasInitializedPreJoinRef,
    setRoom,
    setChatMessages,
    setIsRoomLoading,
    setRoomErrorMessage,
  })

  const activeRoomId = room?.roomId

  useWaitingRoomSocketSync({
    roomId,
    session,
    activeRoomId,
    hasReceivedRoomUpdatedRef,
    onGameStart,
    onRoomRemoved: handleRoomRemoved,
    setRoom,
    setChatMessages,
  })

  // 현재 세션 사용자 정보 조회
  const me = useMemo(() => {
    if (!room || !session) {
      return null
    }

    return room.players.find((player) => player.id === session.userId) ?? null
  }, [room, session])

  // UI 제어에 필요한 파생 상태 계산
  const isHost = me?.isHost ?? false
  const isReady = me?.isReady ?? false
  const canToggleReady = Boolean(me) && !isHost
  const canStartGame = isHost && getStartConditionMet(room)

  const { sendChatMessage, handleToggleReady, handleStartGame, leaveRoom } =
    useWaitingRoomActions({
      roomId,
      room,
      session,
      canToggleReady,
      canStartGame,
      isReadyPending,
      isStartPending,
      hasEnteredRoomRef,
      hasLeftRoomRef,
      shouldSkipNextCleanupLeaveRef,
      leaveInFlightRef,
      sessionRef,
      roomIdRef,
      roomRef,
      setRoom,
      setIsReadyPending,
      setIsStartPending,
      setIsLeavePending,
    })

  // 좌석 렌더링용 배열 계산
  const seats = useMemo(() => {
    return buildWaitingRoomSeats(room, session?.userId ?? '')
  }, [room, session])

  // DEV 목 제어 패널에서 받은 스냅샷을 화면 상태에 반영
  const applyRoomSnapshot = useCallback((snapshot: WaitingRoomSnapshot) => {
    setRoom(snapshot)
    setChatMessages(snapshot.chatMessages)
    setRoomErrorMessage(null)
    setIsRoomLoading(false)
  }, [])

  return {
    room,
    seats,
    chatMessages,
    isRoomLoading,
    roomErrorMessage,
    isReadyPending,
    isStartPending,
    isLeavePending,
    isHost,
    isReady,
    canToggleReady,
    canStartGame,
    sendChatMessage,
    handleToggleReady,
    handleStartGame,
    leaveRoom,
    applyRoomSnapshot,
  }
}
