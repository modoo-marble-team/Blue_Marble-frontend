import { useEffect, useMemo, useState } from 'react'
import { IS_SOCKET_MOCK_ENABLED } from '../../config/env'
import { cn } from '../../lib/utils'
import { sendWaitingRoomChat } from '../../pages/waiting-room/socket/socket'

const IS_DEV_ROOM_CHAT_CONTROL_ENABLED = IS_SOCKET_MOCK_ENABLED

// 게임방 채팅 테스트 패널에서 사용할 발신자 정보 타입
interface RoomChatSenderOption {
  id: string
  nickname: string
}

// 게임방 채팅 테스트 패널 입력값 타입
interface DevRoomChatControlPanelProps {
  roomId: string
  senderOptions: RoomChatSenderOption[]
  preferredSenderId?: string
  className?: string
}

// 대기방/게임 공통 채팅 수신 이벤트를 수동 주입하는 테스트 패널
export function DevRoomChatControlPanel({
  roomId,
  senderOptions,
  preferredSenderId,
  className,
}: DevRoomChatControlPanelProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [selectedSenderId, setSelectedSenderId] = useState('')
  const [incomingMessage, setIncomingMessage] = useState('테스트 채팅')

  const normalizedSenderOptions = useMemo(() => {
    const uniqueSenderMap = new Map<string, RoomChatSenderOption>()

    senderOptions.forEach((senderOption) => {
      if (!senderOption.id || !senderOption.nickname) {
        return
      }

      uniqueSenderMap.set(senderOption.id, senderOption)
    })

    return Array.from(uniqueSenderMap.values())
  }, [senderOptions])

  const selectedSender = normalizedSenderOptions.find(
    (senderOption) => senderOption.id === selectedSenderId
  )

  // 발신자 목록/선호 발신자 기준으로 기본 선택값을 동기화
  useEffect(() => {
    if (normalizedSenderOptions.length === 0) {
      setSelectedSenderId('')
      return
    }

    const hasSelectedSender = normalizedSenderOptions.some(
      (senderOption) => senderOption.id === selectedSenderId
    )

    if (hasSelectedSender) {
      return
    }

    const preferredSender = normalizedSenderOptions.find(
      (senderOption) => senderOption.id === preferredSenderId
    )

    setSelectedSenderId(
      preferredSender?.id ?? normalizedSenderOptions[0].id ?? ''
    )
  }, [normalizedSenderOptions, preferredSenderId, selectedSenderId])

  if (!IS_DEV_ROOM_CHAT_CONTROL_ENABLED || !roomId) {
    return null
  }

  if (normalizedSenderOptions.length === 0) {
    return null
  }

  if (!isPanelOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsPanelOpen(true)}
        className={cn(
          'fixed bottom-4 left-4 z-50 h-9 rounded-xl border border-ui-border bg-white/95 px-3 text-xs font-bold text-ui-text-main shadow-xl',
          className
        )}
      >
        게임방 채팅 테스트 패널 열기
      </button>
    )
  }

  // 선택한 발신자 기준으로 room chat 이벤트를 수동 전송
  function handleEmitRoomChat() {
    if (!selectedSender) {
      return
    }

    const normalizedMessage = incomingMessage.trim()

    if (normalizedMessage.length === 0) {
      return
    }

    sendWaitingRoomChat({
      roomId,
      senderId: selectedSender.id,
      senderNickname: selectedSender.nickname,
      message: normalizedMessage,
    })

    setIncomingMessage('')
  }

  return (
    <aside
      className={cn(
        'fixed bottom-4 left-4 z-50 w-[288px] rounded-2xl border border-ui-border bg-white/95 p-3 shadow-xl',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold tracking-wide text-ui-text-main">
          게임방 채팅 테스트 패널
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

      <label
        htmlFor="dev-room-chat-sender-select"
        className="mt-3 block text-[11px] font-semibold text-ui-text-sub"
      >
        발신 유저
      </label>
      <select
        id="dev-room-chat-sender-select"
        value={selectedSenderId}
        onChange={(event) => setSelectedSenderId(event.target.value)}
        className="mt-1 h-8 w-full rounded-lg border border-ui-border bg-white px-2 text-xs font-medium text-ui-text-main"
      >
        {normalizedSenderOptions.map((senderOption) => (
          <option key={senderOption.id} value={senderOption.id}>
            {senderOption.nickname}
          </option>
        ))}
      </select>

      <label
        htmlFor="dev-room-chat-message"
        className="mt-3 block text-[11px] font-semibold text-ui-text-sub"
      >
        수신 채팅
      </label>
      <input
        id="dev-room-chat-message"
        type="text"
        value={incomingMessage}
        onChange={(event) => setIncomingMessage(event.target.value)}
        placeholder="상대가 보낼 채팅"
        className="mt-1 h-8 w-full rounded-lg border border-ui-border bg-white px-2 text-xs font-medium text-ui-text-main"
      />

      <button
        type="button"
        onClick={handleEmitRoomChat}
        className="mt-2 h-8 w-full rounded-lg bg-ui-brand text-xs font-semibold text-white hover:bg-ui-brand-strong"
      >
        선택 유저 채팅 전송
      </button>
    </aside>
  )
}
