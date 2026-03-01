import { useMemo, useState } from 'react'
import { SendHorizontal, X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { DirectMessage, OnlineUser } from '../types'

// 1:1 채팅 패널 렌더링 입력값 타입
interface DirectMessagePanelProps {
  user: OnlineUser
  currentUserId: string
  messages: DirectMessage[]
  onClose: () => void
  onSendMessage: (message: string) => void
}

// ISO 시간 문자열을 한국어 시각 표시로 변환
function formatMessageTime(sentAt: string) {
  return new Date(sentAt).toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// 선택된 사용자와의 1:1 채팅 패널 렌더링
export function DirectMessagePanel({
  user,
  currentUserId,
  messages,
  onClose,
  onSendMessage,
}: DirectMessagePanelProps) {
  const [inputMessage, setInputMessage] = useState('')

  // 메시지 목록을 전송 시각 기준으로 오름차순 정렬
  const sortedMessages = useMemo(() => {
    return [...messages].sort((firstMessage, secondMessage) => {
      return firstMessage.sentAt.localeCompare(secondMessage.sentAt)
    })
  }, [messages])

  const canSend = inputMessage.trim().length > 0

  return (
    <section className="fixed bottom-6 right-4 z-40 w-[340px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-ui-border bg-ui-surface shadow-[0_18px_40px_rgba(15,23,42,0.2)] sm:right-6">
      <header className="flex h-14 items-center justify-between border-b border-ui-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-ui-text-strong"
            style={{ backgroundColor: user.avatarBackground }}
          >
            {user.avatarText}
          </div>
          <p className="truncate text-base font-semibold text-ui-text-primary">
            {user.nickname}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface-soft hover:text-ui-text-primary"
          aria-label="DM 닫기"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="h-[320px] overflow-y-auto bg-ui-surface px-4 py-3">
        {sortedMessages.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm font-medium text-ui-text-subtle">
            메시지를 보내 대화를 시작하세요
          </p>
        ) : (
          <div className="space-y-2">
            {sortedMessages.map((message) => {
              const isMine = message.senderId === currentUserId

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex flex-col',
                    isMine ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2 text-sm font-medium',
                      isMine
                        ? 'rounded-br-md bg-ui-brand text-white'
                        : 'rounded-bl-md bg-ui-surface-soft text-ui-text-primary'
                    )}
                  >
                    {message.content}
                  </div>
                  <span className="mt-1 text-[11px] text-ui-text-subtle">
                    {formatMessageTime(message.sentAt)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-ui-border bg-ui-surface p-3"
        onSubmit={(event) => {
          event.preventDefault()

          const normalizedMessage = inputMessage.trim()

          // 공백 메시지는 전송하지 않음
          if (!normalizedMessage) {
            return
          }

          onSendMessage(normalizedMessage)
          setInputMessage('')
        }}
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(event) => setInputMessage(event.target.value)}
          placeholder="메시지를 입력하세요..."
          className="h-9 flex-1 rounded-xl border border-ui-border bg-ui-surface-muted px-3 text-sm text-ui-text-primary outline-none placeholder:text-ui-text-subtle focus:border-ui-brand focus:ring-2 focus:ring-ui-brand/20"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!canSend}
          className={cn(
            'inline-flex size-9 items-center justify-center rounded-xl transition-colors',
            canSend
              ? 'bg-ui-brand text-white hover:bg-ui-brand-strong'
              : 'cursor-not-allowed bg-ui-disabled-bg text-ui-disabled-text'
          )}
          aria-label="DM 전송"
        >
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </section>
  )
}
