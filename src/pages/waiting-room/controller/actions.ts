import { useCallback, useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { AuthSession } from '../../../features/auth/types'
import {
  getWaitingRoomErrorMessage,
  leaveWaitingRoom,
  startWaitingGame,
  toggleWaitingReady,
} from '../api'
import { leaveWaitingRoomSocket, sendWaitingRoomChat } from '../socket'
import type { WaitingRoomSnapshot } from '../types'
import type { LeaveRoomSequenceParams, WaitingRoomActionResult } from './state'

// 액션 훅 입력 파라미터 타입
interface UseWaitingRoomActionsParams {
  roomId: string
  room: WaitingRoomSnapshot | null
  session: AuthSession | null
  canToggleReady: boolean
  canStartGame: boolean
  isReadyPending: boolean
  isStartPending: boolean
  hasEnteredRoomRef: MutableRefObject<boolean>
  hasLeftRoomRef: MutableRefObject<boolean>
  shouldSkipNextCleanupLeaveRef: MutableRefObject<boolean>
  leaveInFlightRef: MutableRefObject<Promise<WaitingRoomActionResult> | null>
  sessionRef: MutableRefObject<AuthSession | null>
  roomIdRef: MutableRefObject<string>
  roomRef: MutableRefObject<WaitingRoomSnapshot | null>
  setRoom: Dispatch<SetStateAction<WaitingRoomSnapshot | null>>
  setIsReadyPending: Dispatch<SetStateAction<boolean>>
  setIsStartPending: Dispatch<SetStateAction<boolean>>
  setIsLeavePending: Dispatch<SetStateAction<boolean>>
}

// 준비/시작/퇴장 액션과 cleanup 퇴장 시퀀스를 관리
export function useWaitingRoomActions({
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
}: UseWaitingRoomActionsParams) {
  useEffect(() => {
    const markBrowserUnload = () => {
      shouldSkipNextCleanupLeaveRef.current = true
    }

    window.addEventListener('beforeunload', markBrowserUnload)
    window.addEventListener('pagehide', markBrowserUnload)

    return () => {
      window.removeEventListener('beforeunload', markBrowserUnload)
      window.removeEventListener('pagehide', markBrowserUnload)
    }
  }, [shouldSkipNextCleanupLeaveRef])

  // 수동 퇴장과 언마운트 cleanup에서 재사용하는 공통 퇴장 시퀀스
  const runLeaveRoomSequence = useCallback(
    async ({
      source,
    }: LeaveRoomSequenceParams): Promise<WaitingRoomActionResult> => {
      // cleanup 경로에서 입장 완료 전이면 퇴장 요청을 생략
      if (source === 'cleanup' && !hasEnteredRoomRef.current) {
        return {
          ok: true,
        }
      }

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
    [
      hasEnteredRoomRef,
      hasLeftRoomRef,
      leaveInFlightRef,
      roomIdRef,
      roomRef,
      sessionRef,
      setIsLeavePending,
    ]
  )

  // 언마운트 시 대기방 퇴장 API와 소켓 leave를 정리
  useEffect(() => {
    return () => {
      // StrictMode 첫 cleanup은 테스트성 호출이므로 1회 스킵
      if (shouldSkipNextCleanupLeaveRef.current) {
        shouldSkipNextCleanupLeaveRef.current = false
        return
      }

      // 브라우저 새로고침/탭 종료처럼 문서가 hidden 상태면 cleanup leave를 보내지 않는다.
      if (document.visibilityState === 'hidden') {
        return
      }

      // 핵심 입력값이 없으면 cleanup 퇴장 시퀀스를 생략
      if (!session || !roomId) {
        return
      }

      void runLeaveRoomSequence({
        source: 'cleanup',
      })
    }
  }, [
    hasEnteredRoomRef,
    hasLeftRoomRef,
    roomId,
    runLeaveRoomSequence,
    session,
    shouldSkipNextCleanupLeaveRef,
  ])

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
    }, [
      canToggleReady,
      isReadyPending,
      room,
      session,
      setIsReadyPending,
      setRoom,
    ])

  // 게임 시작 액션 처리
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
    }, [canStartGame, isStartPending, room, session, setIsStartPending])

  // 수동 퇴장 핸들러
  const leaveRoom = useCallback(async (): Promise<WaitingRoomActionResult> => {
    return runLeaveRoomSequence({
      source: 'manual',
    })
  }, [runLeaveRoomSequence])

  return {
    sendChatMessage,
    handleToggleReady,
    handleStartGame,
    leaveRoom,
  }
}
