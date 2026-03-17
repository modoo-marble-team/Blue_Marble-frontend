import { useEffect, useMemo, useState } from 'react'
import type {
  OnlineUser,
  OnlineUserStatus,
} from '../../../features/presence/types'
import { emitDirectMessageReceiveMockForDev } from '../../../features/presence/direct-message/directMessageSocket'
import { setMockOnlineUserStatus } from '../../../features/presence/mock/mockData'
import { emitMockOnlineUsersSnapshot } from '../../../features/presence/online-users/onlineUsersSocket'
import { cn } from '../../../lib/utils'
import { getWaitingRoomErrorMessage } from '../api'
import {
  mockDevAddWaitingRoomParticipant,
  mockDevGetWaitingRoomSnapshot,
  mockDevRemoveWaitingRoomParticipant,
  mockDevResetWaitingRoom,
  mockDevSeedStartCondition,
  mockDevSetAllNonHostReady,
  mockDevTransferWaitingRoomHost,
} from '../mockGateway'
import { sendWaitingRoomChat } from '../socket'
import type { WaitingRoomPlayer, WaitingRoomSnapshot } from '../types'
import { IS_SOCKET_MOCK_ENABLED } from '../../../config/env'

const IS_DEV_CONTROL_ENABLED = IS_SOCKET_MOCK_ENABLED

type DevControlMode = 'room' | 'presence' | 'chat'

interface RoomChatSenderOption {
  id: string
  nickname: string
}

// 대기방 DEV 통합 제어 패널 입력값 타입
interface DevControlPanelProps {
  roomId: string
  currentUserId: string
  currentNickname: string
  users: OnlineUser[]
  roomPlayers: WaitingRoomPlayer[]
  onApplySnapshot: (snapshot: WaitingRoomSnapshot) => void
  onError: (message: string) => void
}

// 대기방 DEV 제어(룸/접속자/채팅)를 단일 패널에서 탭 전환으로 제공
export function DevControlPanel({
  roomId,
  currentUserId,
  currentNickname,
  users,
  roomPlayers,
  onApplySnapshot,
  onError,
}: DevControlPanelProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<DevControlMode>('room')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [selectedPresenceUserId, setSelectedPresenceUserId] = useState('')
  const [incomingDirectMessage, setIncomingDirectMessage] =
    useState('테스트 DM')
  const [selectedChatSenderId, setSelectedChatSenderId] = useState('')
  const [incomingRoomChat, setIncomingRoomChat] = useState('테스트 채팅')

  const controllableUsers = useMemo(() => {
    return users.filter((user) => user.id !== currentUserId)
  }, [currentUserId, users])

  const selectedPresenceUser = controllableUsers.find(
    (user) => user.id === selectedPresenceUserId
  )

  const roomChatSenderOptions = useMemo(() => {
    const uniqueSenderMap = new Map<string, RoomChatSenderOption>()

    roomPlayers.forEach((player) => {
      if (!player.id || !player.nickname) {
        return
      }

      uniqueSenderMap.set(player.id, {
        id: player.id,
        nickname: player.nickname,
      })
    })

    return Array.from(uniqueSenderMap.values())
  }, [roomPlayers])

  const selectedRoomChatSender = roomChatSenderOptions.find(
    (senderOption) => senderOption.id === selectedChatSenderId
  )

  // 접속자 제어 대상 목록이 바뀌면 선택 유저를 안전하게 보정
  useEffect(() => {
    if (controllableUsers.length === 0) {
      setSelectedPresenceUserId('')
      return
    }

    const hasSelectedUser = controllableUsers.some(
      (user) => user.id === selectedPresenceUserId
    )

    if (!hasSelectedUser) {
      setSelectedPresenceUserId(controllableUsers[0].id)
    }
  }, [controllableUsers, selectedPresenceUserId])

  // 채팅 발신자 목록 변경 시 기본 발신자를 비방장 기준으로 보정
  useEffect(() => {
    if (roomChatSenderOptions.length === 0) {
      setSelectedChatSenderId('')
      return
    }

    const hasSelectedSender = roomChatSenderOptions.some(
      (senderOption) => senderOption.id === selectedChatSenderId
    )

    if (hasSelectedSender) {
      return
    }

    const preferredSender =
      roomChatSenderOptions.find(
        (senderOption) => senderOption.id !== currentUserId
      ) ?? roomChatSenderOptions[0]

    setSelectedChatSenderId(preferredSender?.id ?? '')
  }, [currentUserId, roomChatSenderOptions, selectedChatSenderId])

  if (!IS_DEV_CONTROL_ENABLED || !roomId) {
    return null
  }

  if (!isPanelOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsPanelOpen(true)}
        className="fixed bottom-4 left-4 z-50 h-9 rounded-xl border border-ui-border bg-white/95 px-3 text-xs font-bold text-ui-text-main shadow-xl backdrop-blur"
      >
        DEV CONTROL 열기
      </button>
    )
  }

  // 룸 제어 액션 결과 스냅샷을 화면에 반영하고 에러를 공통 처리
  function runRoomAction(
    actionName: string,
    action: () => WaitingRoomSnapshot
  ) {
    setPendingAction(actionName)

    try {
      const snapshot = action()
      onApplySnapshot(snapshot)
    } catch (error) {
      onError(getWaitingRoomErrorMessage(error, 'DEV 목 제어에 실패했습니다.'))
    } finally {
      setPendingAction(null)
    }
  }

  // 접속자 상태 변경 후 online_users 스냅샷을 즉시 갱신
  function handleChangePresenceStatus(status: OnlineUserStatus) {
    if (!selectedPresenceUser) {
      return
    }

    setMockOnlineUserStatus(selectedPresenceUser.id, status)
    emitMockOnlineUsersSnapshot()
  }

  // 선택 유저가 현재 사용자에게 DM을 보낸 이벤트를 수동 주입
  function handleEmitIncomingDirectMessage() {
    if (!selectedPresenceUser) {
      return
    }

    const normalizedMessage = incomingDirectMessage.trim()
    if (normalizedMessage.length === 0) {
      return
    }

    emitDirectMessageReceiveMockForDev({
      message_id: `dev-dm-${Date.now()}`,
      sender_id: selectedPresenceUser.id,
      sender_nickname: selectedPresenceUser.nickname,
      message: normalizedMessage,
      sent_at: new Date().toISOString(),
    })

    setIncomingDirectMessage('')
  }

  // 선택 발신자를 기준으로 room chat 이벤트를 수동 전송
  function handleEmitIncomingRoomChat() {
    if (!selectedRoomChatSender) {
      return
    }

    const normalizedMessage = incomingRoomChat.trim()
    if (normalizedMessage.length === 0) {
      return
    }

    sendWaitingRoomChat({
      roomId,
      senderId: selectedRoomChatSender.id,
      senderNickname: selectedRoomChatSender.nickname,
      message: normalizedMessage,
    })

    setIncomingRoomChat('')
  }

  const isRoomActionDisabled = pendingAction !== null
  const canControlPresence = controllableUsers.length > 0
  const canControlRoomChat = roomChatSenderOptions.length > 0
  const shouldDisablePresenceActions =
    !canControlPresence || !selectedPresenceUser
  const shouldDisableRoomChatActions =
    !canControlRoomChat || !selectedRoomChatSender

  return (
    <aside className="fixed bottom-4 left-4 z-50 w-[280px] rounded-2xl border border-ui-border bg-white/95 p-3 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold tracking-wide text-ui-text-main">
          DEV CONTROL
        </h3>
        <button
          type="button"
          onClick={() => setIsPanelOpen(false)}
          className="h-6 rounded-md border border-ui-border px-2 text-[10px] font-bold text-ui-text-sub transition-colors hover:bg-ui-surface-soft"
        >
          숨기기
        </button>
      </div>
      <p className="mt-1 text-[11px] text-ui-text-sub">{roomId}</p>

      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-lg bg-ui-surface-soft p-1">
        <button
          type="button"
          onClick={() => setSelectedMode('room')}
          className={cn(
            'h-7 rounded-md text-[11px] font-bold transition-colors',
            selectedMode === 'room'
              ? 'bg-white text-ui-text-main shadow-sm'
              : 'text-ui-text-sub hover:bg-white/70'
          )}
        >
          Room
        </button>
        <button
          type="button"
          onClick={() => setSelectedMode('presence')}
          className={cn(
            'h-7 rounded-md text-[11px] font-bold transition-colors',
            selectedMode === 'presence'
              ? 'bg-white text-ui-text-main shadow-sm'
              : 'text-ui-text-sub hover:bg-white/70'
          )}
        >
          Presence
        </button>
        <button
          type="button"
          onClick={() => setSelectedMode('chat')}
          className={cn(
            'h-7 rounded-md text-[11px] font-bold transition-colors',
            selectedMode === 'chat'
              ? 'bg-white text-ui-text-main shadow-sm'
              : 'text-ui-text-sub hover:bg-white/70'
          )}
        >
          Chat
        </button>
      </div>

      {selectedMode === 'room' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isRoomActionDisabled}
            onClick={() => {
              runRoomAction('sync', () => mockDevGetWaitingRoomSnapshot(roomId))
            }}
            className="rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
          >
            동기화
          </button>

          <button
            type="button"
            disabled={isRoomActionDisabled}
            onClick={() => {
              runRoomAction('add', () =>
                mockDevAddWaitingRoomParticipant(roomId)
              )
            }}
            className="rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
          >
            참가자 +1
          </button>

          <button
            type="button"
            disabled={isRoomActionDisabled}
            onClick={() => {
              runRoomAction('remove', () =>
                mockDevRemoveWaitingRoomParticipant(roomId, currentUserId)
              )
            }}
            className="rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
          >
            참가자 -1
          </button>

          <button
            type="button"
            disabled={isRoomActionDisabled}
            onClick={() => {
              runRoomAction('seed', () => mockDevSeedStartCondition(roomId))
            }}
            className="rounded-lg bg-ui-brand px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            시작조건
          </button>

          <button
            type="button"
            disabled={isRoomActionDisabled}
            onClick={() => {
              runRoomAction('ready-all', () =>
                mockDevSetAllNonHostReady(roomId, true)
              )
            }}
            className="col-span-2 rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
          >
            non-host 전원 준비
          </button>

          <button
            type="button"
            disabled={isRoomActionDisabled}
            onClick={() => {
              runRoomAction('ready-none', () =>
                mockDevSetAllNonHostReady(roomId, false)
              )
            }}
            className="col-span-2 rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
          >
            non-host 준비 해제
          </button>

          <button
            type="button"
            disabled={isRoomActionDisabled}
            onClick={() => {
              runRoomAction('transfer-host', () =>
                mockDevTransferWaitingRoomHost(roomId)
              )
            }}
            className="col-span-2 rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-semibold text-ui-text-main disabled:opacity-50"
          >
            방장 넘기기
          </button>

          <button
            type="button"
            disabled={isRoomActionDisabled}
            onClick={() => {
              runRoomAction('reset-room', () =>
                mockDevResetWaitingRoom(roomId, currentUserId, currentNickname)
              )
            }}
            className="col-span-2 rounded-lg border border-ui-danger-border bg-ui-danger-bg px-2 py-1.5 text-xs font-semibold text-ui-danger disabled:opacity-50"
          >
            방 초기화
          </button>
        </div>
      )}

      {selectedMode === 'presence' && (
        <div className="mt-3">
          <label
            htmlFor="dev-control-presence-user-select"
            className="block text-[11px] font-semibold text-ui-text-sub"
          >
            제어 유저
          </label>
          <select
            id="dev-control-presence-user-select"
            value={selectedPresenceUserId}
            onChange={(event) => setSelectedPresenceUserId(event.target.value)}
            disabled={!canControlPresence}
            className="mt-1 h-8 w-full rounded-lg border border-ui-border bg-white px-2 text-xs font-medium text-ui-text-main disabled:cursor-not-allowed disabled:opacity-50"
          >
            {controllableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.nickname}
              </option>
            ))}
          </select>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={shouldDisablePresenceActions}
              onClick={() => handleChangePresenceStatus('lobby')}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50',
                selectedPresenceUser?.status === 'lobby'
                  ? 'border-ui-presence-waiting bg-ui-presence-waiting/10 text-ui-presence-waiting'
                  : 'border-ui-border bg-white text-ui-text-main'
              )}
            >
              로비
            </button>
            <button
              type="button"
              disabled={shouldDisablePresenceActions}
              onClick={() => handleChangePresenceStatus('in_room')}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50',
                selectedPresenceUser?.status === 'in_room'
                  ? 'border-ui-presence-in-room bg-ui-presence-in-room/10 text-ui-presence-in-room'
                  : 'border-ui-border bg-white text-ui-text-main'
              )}
            >
              대기방
            </button>
            <button
              type="button"
              disabled={shouldDisablePresenceActions}
              onClick={() => handleChangePresenceStatus('playing')}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50',
                selectedPresenceUser?.status === 'playing'
                  ? 'border-ui-presence-playing bg-ui-presence-playing/10 text-ui-presence-playing'
                  : 'border-ui-border bg-white text-ui-text-main'
              )}
            >
              게임중
            </button>
          </div>

          <label
            htmlFor="dev-control-presence-incoming-message"
            className="mt-3 block text-[11px] font-semibold text-ui-text-sub"
          >
            수신 DM
          </label>
          <input
            id="dev-control-presence-incoming-message"
            type="text"
            value={incomingDirectMessage}
            onChange={(event) => setIncomingDirectMessage(event.target.value)}
            placeholder="상대가 보낼 메시지"
            disabled={shouldDisablePresenceActions}
            className="mt-1 h-8 w-full rounded-lg border border-ui-border bg-white px-2 text-xs font-medium text-ui-text-main disabled:cursor-not-allowed disabled:opacity-50"
          />

          <button
            type="button"
            disabled={shouldDisablePresenceActions}
            onClick={handleEmitIncomingDirectMessage}
            className="mt-2 h-8 w-full rounded-lg bg-ui-brand text-xs font-semibold text-white hover:bg-ui-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            선택 유저로 DM 수신
          </button>
        </div>
      )}

      {selectedMode === 'chat' && (
        <div className="mt-3">
          <label
            htmlFor="dev-control-room-chat-sender-select"
            className="block text-[11px] font-semibold text-ui-text-sub"
          >
            발신 유저
          </label>
          <select
            id="dev-control-room-chat-sender-select"
            value={selectedChatSenderId}
            onChange={(event) => setSelectedChatSenderId(event.target.value)}
            disabled={!canControlRoomChat}
            className="mt-1 h-8 w-full rounded-lg border border-ui-border bg-white px-2 text-xs font-medium text-ui-text-main disabled:cursor-not-allowed disabled:opacity-50"
          >
            {roomChatSenderOptions.map((senderOption) => (
              <option key={senderOption.id} value={senderOption.id}>
                {senderOption.nickname}
              </option>
            ))}
          </select>

          <label
            htmlFor="dev-control-room-chat-message"
            className="mt-3 block text-[11px] font-semibold text-ui-text-sub"
          >
            수신 채팅
          </label>
          <input
            id="dev-control-room-chat-message"
            type="text"
            value={incomingRoomChat}
            onChange={(event) => setIncomingRoomChat(event.target.value)}
            placeholder="상대가 보낼 채팅"
            disabled={shouldDisableRoomChatActions}
            className="mt-1 h-8 w-full rounded-lg border border-ui-border bg-white px-2 text-xs font-medium text-ui-text-main disabled:cursor-not-allowed disabled:opacity-50"
          />

          <button
            type="button"
            disabled={shouldDisableRoomChatActions}
            onClick={handleEmitIncomingRoomChat}
            className="mt-2 h-8 w-full rounded-lg bg-ui-brand text-xs font-semibold text-white hover:bg-ui-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            선택 유저 채팅 전송
          </button>
        </div>
      )}
    </aside>
  )
}
