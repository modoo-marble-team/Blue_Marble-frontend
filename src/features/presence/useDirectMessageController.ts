import { useCallback, useEffect, useState } from 'react'
import type { AuthSession } from '../auth/types'
import {
  sendDirectMessage as sendDirectMessageSocket,
  subscribeDirectMessageSocketEvents,
} from './directMessageSocket'
import { isDirectMessageAllowed } from './status'
import type {
  DirectMessage,
  DirectMessageReceiveSocketPayload,
  OnlineUser,
} from './types'

// DM 컨트롤러 훅 입력값 타입
interface UseDirectMessageControllerParams {
  session: AuthSession | null
  users: OnlineUser[]
  onBlockedByPlaying?: () => void
}

// DM 상태/구독/전송 로직을 공통으로 관리
export function useDirectMessageController({
  session,
  users,
  onBlockedByPlaying,
}: UseDirectMessageControllerParams) {
  const [dmTargetUser, setDmTargetUser] = useState<OnlineUser | null>(null)
  const [directMessagesByUserId, setDirectMessagesByUserId] = useState<
    Record<string, DirectMessage[]>
  >({})
  const [
    unreadDirectMessageCountByUserId,
    setUnreadDirectMessageCountByUserId,
  ] = useState<Record<string, number>>({})

  const openedDirectMessageUserId = dmTargetUser?.id

  // DM 수신 이벤트를 구독해 대화 목록과 unread 카운트를 갱신
  useEffect(() => {
    if (!session) {
      return
    }

    const unsubscribe = subscribeDirectMessageSocketEvents({
      onReceive: (payload: DirectMessageReceiveSocketPayload) => {
        const receivedMessage: DirectMessage = {
          id: `${payload.sender_id}-${payload.sent_at}`,
          senderId: payload.sender_id,
          senderNickname: payload.sender_nickname,
          content: payload.message,
          sentAt: payload.sent_at,
        }

        setDirectMessagesByUserId((previousMessagesByUserId) => {
          const previousMessages =
            previousMessagesByUserId[payload.sender_id] ?? []
          const hasSameMessage = previousMessages.some(
            (message) => message.id === receivedMessage.id
          )

          // 동일 메시지 ID는 중복 삽입을 방지
          if (hasSameMessage) {
            return previousMessagesByUserId
          }

          return {
            ...previousMessagesByUserId,
            [payload.sender_id]: [...previousMessages, receivedMessage],
          }
        })

        // 현재 열려 있는 사용자 메시지는 unread 카운트에서 제외
        if (payload.sender_id === openedDirectMessageUserId) {
          return
        }

        setUnreadDirectMessageCountByUserId((previousCountByUserId) => {
          const previousCount = previousCountByUserId[payload.sender_id] ?? 0

          return {
            ...previousCountByUserId,
            [payload.sender_id]: previousCount + 1,
          }
        })
      },
    })

    return () => {
      unsubscribe()
    }
  }, [openedDirectMessageUserId, session])

  // 접속자 목록 갱신 시 DM 대상 사용자 참조를 최신 객체로 동기화
  useEffect(() => {
    if (!dmTargetUser) {
      return
    }

    const matchedUser = users.find((user) => user.id === dmTargetUser.id)

    if (!matchedUser) {
      setDmTargetUser(null)
      return
    }

    if (!isDirectMessageAllowed(matchedUser.status)) {
      setDmTargetUser(null)
      return
    }

    if (matchedUser !== dmTargetUser) {
      setDmTargetUser(matchedUser)
    }
  }, [dmTargetUser, users])

  // DM 창을 열고 해당 사용자 unread 카운트를 초기화
  const openDirectMessage = useCallback(
    (user: OnlineUser) => {
      if (!isDirectMessageAllowed(user.status)) {
        onBlockedByPlaying?.()
        return
      }

      setDmTargetUser(user)
      setUnreadDirectMessageCountByUserId((previousCountByUserId) => {
        if (!previousCountByUserId[user.id]) {
          return previousCountByUserId
        }

        const nextCountByUserId = { ...previousCountByUserId }
        delete nextCountByUserId[user.id]
        return nextCountByUserId
      })
    },
    [onBlockedByPlaying]
  )

  // DM 창 닫기
  const closeDirectMessage = useCallback(() => {
    setDmTargetUser(null)
  }, [])

  // 로컬 DM 목록에 메시지를 추가하고 소켓 전송 실행
  const sendDirectMessage = useCallback(
    (message: string) => {
      // 대상 사용자 또는 세션이 없으면 전송 중단
      if (!dmTargetUser || !session) {
        return
      }

      if (!isDirectMessageAllowed(dmTargetUser.status)) {
        onBlockedByPlaying?.()
        return
      }

      const targetUserId = dmTargetUser.id
      const nextDirectMessage: DirectMessage = {
        id: `${targetUserId}-${Date.now()}`,
        senderId: session.userId,
        senderNickname: session.nickname,
        content: message,
        sentAt: new Date().toISOString(),
      }

      setDirectMessagesByUserId((previousMessagesByUserId) => {
        const previousMessages = previousMessagesByUserId[targetUserId] ?? []

        return {
          ...previousMessagesByUserId,
          [targetUserId]: [...previousMessages, nextDirectMessage],
        }
      })

      sendDirectMessageSocket({
        receiverId: dmTargetUser.id,
        message,
      })
    },
    [dmTargetUser, onBlockedByPlaying, session]
  )

  return {
    dmTargetUser,
    directMessagesByUserId,
    unreadDirectMessageCountByUserId,
    openDirectMessage,
    closeDirectMessage,
    sendDirectMessage,
  }
}
