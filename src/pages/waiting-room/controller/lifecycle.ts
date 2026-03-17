import { useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { AuthSession } from '../../../features/auth/types'
import { requestOnlineUsersSnapshotSync } from '../../../features/presence/online-users/onlineUsersSocket'
import { getWaitingRoomErrorMessage, joinWaitingRoom } from '../api'
import { enterWaitingRoomSocket } from '../socket'
import type { WaitingRoomChatMessage, WaitingRoomSnapshot } from '../types'

// 입장/초기화 훅 입력 파라미터 타입
interface UseWaitingRoomLifecycleParams {
  roomId: string
  session: AuthSession | null
  fallbackRoomTitle?: string
  preJoinedSnapshot?: WaitingRoomSnapshot | null
  hasReceivedRoomUpdatedRef: MutableRefObject<boolean>
  hasEnteredRoomRef: MutableRefObject<boolean>
  hasLeftRoomRef: MutableRefObject<boolean>
  hasInitializedPreJoinRef: MutableRefObject<boolean>
  setRoom: Dispatch<SetStateAction<WaitingRoomSnapshot | null>>
  setChatMessages: Dispatch<SetStateAction<WaitingRoomChatMessage[]>>
  setIsRoomLoading: Dispatch<SetStateAction<boolean>>
  setRoomErrorMessage: Dispatch<SetStateAction<string | null>>
}

// roomId/세션/사전 조인 상태에 따라 입장 시퀀스를 관리
export function useWaitingRoomLifecycle({
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
}: UseWaitingRoomLifecycleParams) {
  const preJoinedRoomId = preJoinedSnapshot?.roomId

  useEffect(() => {
    // roomId가 없으면 대기방 상태를 초기화
    if (!roomId) {
      setRoom(null)
      setChatMessages([])
      setIsRoomLoading(false)
      setRoomErrorMessage(null)
      hasReceivedRoomUpdatedRef.current = false
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
      hasReceivedRoomUpdatedRef.current = false
      hasEnteredRoomRef.current = false
      hasLeftRoomRef.current = false
      hasInitializedPreJoinRef.current = false
      return
    }

    // 사전 조인 초기화가 끝난 동일 roomId는 재조인 생략
    if (
      hasInitializedPreJoinRef.current &&
      hasEnteredRoomRef.current &&
      preJoinedRoomId === roomId
    ) {
      setIsRoomLoading(false)
      return
    }

    // 로비에서 사전 조인된 스냅샷이 있으면 즉시 반영
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
      requestOnlineUsersSnapshotSync()
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

        // 언마운트 이후에는 상태 반영을 건너뜀
        if (!isMounted) {
          return
        }

        if (!hasReceivedRoomUpdatedRef.current) {
          setRoom(joinedRoom)
          setChatMessages(joinedRoom.chatMessages)
        }
        enterWaitingRoomSocket({ roomId })
        requestOnlineUsersSnapshotSync()
        hasEnteredRoomRef.current = true
        hasLeftRoomRef.current = false
      } catch (error) {
        // 언마운트 이후에는 에러 반영을 건너뜀
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
  }, [
    fallbackRoomTitle,
    hasReceivedRoomUpdatedRef,
    hasEnteredRoomRef,
    hasInitializedPreJoinRef,
    hasLeftRoomRef,
    preJoinedRoomId,
    preJoinedSnapshot,
    roomId,
    session,
    setChatMessages,
    setIsRoomLoading,
    setRoom,
    setRoomErrorMessage,
  ])
}
