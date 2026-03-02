import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuthSession } from '../../features/auth/types'
import {
  getWaitingRoomErrorMessage,
  joinWaitingRoom,
  leaveWaitingRoom,
  startWaitingGame,
  toggleWaitingReady,
} from './api'
import {
  enterWaitingRoomSocket,
  leaveWaitingRoomSocket,
  sendWaitingRoomChat,
  subscribeWaitingRoomSocketEvents,
} from './socket'
import type {
  ChatEventPayload,
  GameStartEventPayload,
  WaitingRoomChatMessage,
  WaitingRoomSeat,
  WaitingRoomSnapshot,
} from './types'

// 대기방 기본 정원과 좌석 색상 팔레트
const DEFAULT_WAITING_ROOM_MAX_PLAYERS = 4
const AVATAR_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#f97316',
  '#22c55e',
  '#8b5cf6',
  '#14b8a6',
]

// 대기방 컨트롤러 훅 입력값 타입
interface UseWaitingRoomControllerParams {
  roomId: string
  session: AuthSession | null
  fallbackRoomTitle?: string
  preJoinedSnapshot?: WaitingRoomSnapshot | null
  onGameStart: (payload: GameStartEventPayload) => void
}

// 대기방 액션 함수 공통 반환 타입
interface WaitingRoomActionResult {
  ok: boolean
  message?: string
}

// 퇴장 시퀀스 호출 경로 타입
interface LeaveRoomSequenceParams {
  source: 'manual' | 'cleanup'
}

// playerId 해시 기반으로 좌석 아바타 색상 선택
function getAvatarColor(playerId: string) {
  const colorIndex =
    playerId
      .split('')
      .reduce((sum, currentChar) => sum + currentChar.charCodeAt(0), 0) %
    AVATAR_COLORS.length

  return AVATAR_COLORS[colorIndex]
}

// 채팅 이벤트 payload에서 메시지 고유 ID 생성
function getChatMessageId(payload: ChatEventPayload) {
  return `${payload.room_id}-${payload.sender_id}-${payload.sent_at}`
}

// 채팅 이벤트 payload를 화면 메시지 모델로 매핑
function mapChatPayloadToMessage(
  payload: ChatEventPayload
): WaitingRoomChatMessage {
  return {
    id: getChatMessageId(payload),
    senderId: payload.sender_id,
    senderNickname: payload.sender_nickname,
    content: payload.message,
    timestamp: payload.sent_at,
    type: 'talk',
  }
}

// 방 스냅샷을 좌석 배열(빈 자리 포함)로 변환
function buildWaitingRoomSeats(
  room: WaitingRoomSnapshot | null,
  myUserId: string
): Array<WaitingRoomSeat | null> {
  const maxPlayers = room?.maxPlayers ?? DEFAULT_WAITING_ROOM_MAX_PLAYERS
  const seats = Array.from(
    { length: maxPlayers },
    () => null
  ) as Array<WaitingRoomSeat | null>

  // 방 정보가 없으면 빈 자리 배열만 반환
  if (!room) {
    return seats
  }

  room.players.slice(0, maxPlayers).forEach((player, index) => {
    seats[index] = {
      id: player.id,
      nickname: player.nickname,
      isReady: player.isReady,
      isHost: player.isHost,
      isMe: player.id === myUserId,
      avatarColor: getAvatarColor(player.id),
    }
  })

  return seats
}

// 게임 시작 가능 조건(2명 이상 + 방장 제외 전원 ready) 판별
function getStartConditionMet(room: WaitingRoomSnapshot | null) {
  if (!room || room.players.length < 2) {
    return false
  }

  return room.players
    .filter((player) => !player.isHost)
    .every((player) => player.isReady)
}

// 대기방 상태 동기화/소켓 구독/액션 핸들러를 통합한 컨트롤러 훅
export function useWaitingRoomController({
  roomId,
  session,
  fallbackRoomTitle,
  preJoinedSnapshot,
  onGameStart,
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
  const shouldSkipNextCleanupLeaveRef = useRef(import.meta.env.DEV)
  const leaveInFlightRef = useRef<Promise<WaitingRoomActionResult> | null>(null)
  const sessionRef = useRef<AuthSession | null>(session)
  const roomIdRef = useRef(roomId)
  const roomRef = useRef<WaitingRoomSnapshot | null>(room)
  const preJoinedRoomId = preJoinedSnapshot?.roomId

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

  // roomId/세션/사전 조인 상태에 따라 초기 입장 로직을 실행
  useEffect(() => {
    // roomId가 없으면 관련 상태를 초기값으로 리셋
    if (!roomId) {
      setRoom(null)
      setChatMessages([])
      setIsRoomLoading(false)
      setRoomErrorMessage(null)
      hasEnteredRoomRef.current = false
      hasLeftRoomRef.current = false
      hasInitializedPreJoinRef.current = false
      return
    }

    // 세션이 없으면 대기방 상태를 유지하지 않음
    if (!session) {
      setRoom(null)
      setChatMessages([])
      setIsRoomLoading(false)
      setRoomErrorMessage(null)
      hasEnteredRoomRef.current = false
      hasLeftRoomRef.current = false
      hasInitializedPreJoinRef.current = false
      return
    }

    // 사전 조인 초기화가 이미 끝난 동일 roomId는 재조인 생략
    if (
      hasInitializedPreJoinRef.current &&
      hasEnteredRoomRef.current &&
      preJoinedRoomId === roomId
    ) {
      setIsRoomLoading(false)
      return
    }

    // 로비에서 사전 조인된 스냅샷이 있으면 즉시 화면 반영
    if (
      preJoinedSnapshot &&
      preJoinedRoomId === roomId &&
      !hasInitializedPreJoinRef.current
    ) {
      setRoom(preJoinedSnapshot)
      setChatMessages(preJoinedSnapshot.chatMessages)
      setRoomErrorMessage(null)
      setIsRoomLoading(false)
      enterWaitingRoomSocket({ roomId })
      hasEnteredRoomRef.current = true
      hasLeftRoomRef.current = false
      hasInitializedPreJoinRef.current = true
      return
    }

    const activeSession = session
    let isMounted = true

    async function joinRoom() {
      setIsRoomLoading(true)
      setRoomErrorMessage(null)

      try {
        const joinedRoom = await joinWaitingRoom({
          roomId,
          userId: activeSession.userId,
          nickname: activeSession.nickname,
          fallbackTitle: fallbackRoomTitle,
        })

        // 언마운트 이후에는 상태 업데이트를 건너뜀
        if (!isMounted) {
          return
        }

        setRoom(joinedRoom)
        setChatMessages(joinedRoom.chatMessages)
        enterWaitingRoomSocket({ roomId })
        hasEnteredRoomRef.current = true
        hasLeftRoomRef.current = false
      } catch (error) {
        // 언마운트 이후에는 에러 상태 반영을 건너뜀
        if (!isMounted) {
          return
        }

        setRoomErrorMessage(
          getWaitingRoomErrorMessage(error, '대기방 입장에 실패했습니다.')
        )
      } finally {
        // 마운트된 상태에서만 로딩 종료 반영
        if (isMounted) {
          setIsRoomLoading(false)
        }
      }
    }

    joinRoom()

    return () => {
      isMounted = false
    }
  }, [fallbackRoomTitle, preJoinedRoomId, preJoinedSnapshot, roomId, session])

  const activeRoomId = room?.roomId

  // 대기방 소켓 이벤트를 구독해 room/chat 상태를 실시간 반영
  useEffect(() => {
    if (!roomId || !session || !activeRoomId) {
      return
    }

    const unsubscribe = subscribeWaitingRoomSocketEvents({
      onPlayerReady: (payload) => {
        setRoom((previousRoom) => {
          if (!previousRoom) {
            return previousRoom
          }

          return {
            ...previousRoom,
            players: previousRoom.players.map((player) => {
              if (player.id !== payload.player_id) {
                return player
              }

              return {
                ...player,
                isReady: payload.is_ready,
              }
            }),
          }
        })
      },
      onHostChanged: (payload) => {
        setRoom((previousRoom) => {
          if (!previousRoom) {
            return previousRoom
          }

          return {
            ...previousRoom,
            players: previousRoom.players.map((player) => ({
              ...player,
              isHost: player.id === payload.new_host_id,
              isReady:
                player.id === payload.new_host_id ? false : player.isReady,
            })),
          }
        })
      },
      onChat: (payload) => {
        // 다른 방 채팅 이벤트는 무시
        if (payload.room_id !== activeRoomId) {
          return
        }

        const message = mapChatPayloadToMessage(payload)

        setChatMessages((previousMessages) => {
          const hasSameMessage = previousMessages.some(
            (previousMessage) => previousMessage.id === message.id
          )

          // 동일 메시지 중복 삽입 방지
          if (hasSameMessage) {
            return previousMessages
          }

          return [...previousMessages, message]
        })
      },
      onGameStart: (payload) => {
        onGameStart(payload)
      },
    })

    return () => {
      unsubscribe()
    }
  }, [activeRoomId, onGameStart, roomId, session])

  // 수동 퇴장과 언마운트 cleanup에서 재사용하는 공통 퇴장 시퀀스
  const runLeaveRoomSequence = useCallback(
    async ({
      source,
    }: LeaveRoomSequenceParams): Promise<WaitingRoomActionResult> => {
      const activeSession = sessionRef.current

      // 세션이 없거나 이미 퇴장 완료된 상태는 성공으로 간주
      if (!activeSession || hasLeftRoomRef.current) {
        return {
          ok: true,
        }
      }

      // 진행 중인 퇴장 요청이 있으면 동일 Promise 재사용
      if (leaveInFlightRef.current) {
        return leaveInFlightRef.current
      }

      const targetRoomId = roomRef.current?.roomId ?? roomIdRef.current

      // 퇴장 대상 roomId가 없으면 실패 반환
      if (!targetRoomId) {
        return {
          ok: false,
          message: '대기방 퇴장에 실패했습니다.',
        }
      }

      const shouldTrackPending = source === 'manual'
      if (shouldTrackPending) {
        setIsLeavePending(true)
      }

      const leavePromise = (async (): Promise<WaitingRoomActionResult> => {
        try {
          await leaveWaitingRoom({
            roomId: targetRoomId,
            userId: activeSession.userId,
          })

          // leave API 성공 이후에만 leave_room 소켓 이벤트 전송
          leaveWaitingRoomSocket({
            roomId: targetRoomId,
          })
          hasLeftRoomRef.current = true

          return {
            ok: true,
          }
        } catch (error) {
          return {
            ok: false,
            message: getWaitingRoomErrorMessage(
              error,
              '대기방 퇴장에 실패했습니다.'
            ),
          }
        } finally {
          if (shouldTrackPending) {
            setIsLeavePending(false)
          }
          leaveInFlightRef.current = null
        }
      })()

      leaveInFlightRef.current = leavePromise
      return leavePromise
    },
    []
  )

  // 언마운트 시 대기방 퇴장 API와 소켓 leave를 정리
  useEffect(() => {
    return () => {
      // StrictMode 첫 cleanup은 테스트성 호출이므로 1회 스킵
      if (shouldSkipNextCleanupLeaveRef.current) {
        shouldSkipNextCleanupLeaveRef.current = false
        return
      }

      // 퇴장 조건을 만족할 때만 leave API 호출
      if (
        !session ||
        !roomId ||
        !hasEnteredRoomRef.current ||
        hasLeftRoomRef.current
      ) {
        return
      }

      void runLeaveRoomSequence({
        source: 'cleanup',
      })
    }
  }, [roomId, runLeaveRoomSequence, session])

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

  // 좌석 렌더링용 배열 계산
  const seats = useMemo(() => {
    return buildWaitingRoomSeats(room, session?.userId ?? '')
  }, [room, session])

  // 채팅 전송 요청을 소켓 레이어로 전달
  const sendChatMessage = useCallback(
    (message: string) => {
      if (!room || !session) {
        return
      }

      sendWaitingRoomChat({
        roomId: room.roomId,
        senderId: session.userId,
        senderNickname: session.nickname,
        message,
      })
    },
    [room, session]
  )

  // 준비 상태 토글 액션 처리
  const handleToggleReady =
    useCallback(async (): Promise<WaitingRoomActionResult> => {
      // 액션 불가 상태에서는 즉시 종료
      if (!room || !session || !canToggleReady || isReadyPending) {
        return {
          ok: false,
        }
      }

      setIsReadyPending(true)

      try {
        const result = await toggleWaitingReady({
          roomId: room.roomId,
          userId: session.userId,
        })

        setRoom((previousRoom) => {
          if (!previousRoom) {
            return previousRoom
          }

          return {
            ...previousRoom,
            players: previousRoom.players.map((player) => {
              if (player.id !== session.userId) {
                return player
              }

              return {
                ...player,
                isReady: result.isReady,
              }
            }),
          }
        })

        return {
          ok: true,
        }
      } catch (error) {
        return {
          ok: false,
          message: getWaitingRoomErrorMessage(
            error,
            '준비 상태를 변경하지 못했습니다.'
          ),
        }
      } finally {
        setIsReadyPending(false)
      }
    }, [canToggleReady, isReadyPending, room, session])

  const handleStartGame =
    useCallback(async (): Promise<WaitingRoomActionResult> => {
      // 시작 조건 미충족 또는 요청 중 상태에서는 종료
      if (!room || !session || !canStartGame || isStartPending) {
        return {
          ok: false,
        }
      }

      setIsStartPending(true)

      try {
        await startWaitingGame({
          roomId: room.roomId,
          userId: session.userId,
        })

        return {
          ok: true,
        }
      } catch (error) {
        return {
          ok: false,
          message: getWaitingRoomErrorMessage(
            error,
            '게임 시작에 실패했습니다.'
          ),
        }
      } finally {
        setIsStartPending(false)
      }
    }, [canStartGame, isStartPending, room, session])

  const leaveRoom = useCallback(async (): Promise<WaitingRoomActionResult> => {
    return runLeaveRoomSequence({
      source: 'manual',
    })
  }, [runLeaveRoomSequence])

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
  }
}
