import { useEffect, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import type { ChatMessage } from '../../types/domain'
import { cn } from '../../lib/utils'
import {
  CHAT_MESSAGE_MAX_LENGTH,
  normalizeChatMessage,
} from '../../constants/chat'

// 공통 채팅 박스 렌더링 입력값 타입
interface RoomChatProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  notice?: string
  className?: string
  title?: string
  currentUserId?: string
  inputPlaceholder?: string
}

// 대기방/게임 공용 채팅 UI 렌더링
export default function RoomChat({
  messages,
  onSendMessage,
  notice,
  className,
  title = 'CHAT',
  currentUserId = 'me',
  inputPlaceholder = '메시지...',
}: RoomChatProps) {
  const [input, setInput] = useState('')
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const canSend = input.trim().length > 0

  // 새 메시지가 추가되면 스크롤을 최신 메시지 위치로 이동
  useEffect(() => {
    const containerElement = messagesContainerRef.current
    if (!containerElement) {
      return
    }

    containerElement.scrollTop = containerElement.scrollHeight
  }, [messages])

  // 채팅 입력 submit 처리
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedInput = normalizeChatMessage(input)

    // 공백 입력은 전송하지 않음
    if (!normalizedInput) {
      return
    }

    onSendMessage(normalizedInput)
    setInput('')
  }

  return (
    <div className={cn('flex h-full min-h-0 w-full flex-col gap-3', className)}>
      {notice ? (
        <div className="shrink-0 rounded-xl border border-ui-border bg-ui-brand-soft px-3 py-2">
          <span className="text-xs font-semibold text-ui-brand">{notice}</span>
        </div>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ui-border bg-ui-surface shadow-sm">
        <header className="shrink-0 border-b border-ui-border bg-ui-surface px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-ui-brand" />
            <span className="text-base font-semibold text-ui-text-strong">
              {title}
            </span>
          </div>
        </header>

        <div
          ref={messagesContainerRef}
          className="ui-scrollbar min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto bg-ui-surface px-3 py-3"
        >
          {messages.map((message) => {
            const isMine = message.sender_id === currentUserId

            return (
              <div
                key={message.id}
                className={cn(
                  'flex min-w-0 w-full flex-col',
                  isMine ? 'items-end' : 'items-start'
                )}
              >
                <div className="mb-0.5 max-w-[85%] px-0.5">
                  <span className="block truncate text-[11px] font-medium text-ui-text-subtle">
                    {message.sender_nickname}
                  </span>
                </div>

                <div
                  className={cn(
                    'min-w-0 w-fit max-w-[85%] whitespace-pre-wrap break-words [overflow-wrap:anywhere] px-3 py-2 text-sm leading-snug font-medium shadow-sm',
                    isMine
                      ? 'rounded-[16px_0_16px_16px] bg-ui-brand text-white'
                      : 'rounded-[0_16px_16px_16px] border border-ui-border bg-ui-surface-soft text-ui-text-primary'
                  )}
                >
                  {message.content}
                </div>
              </div>
            )
          })}
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 flex items-center gap-2 border-t border-ui-border bg-ui-surface p-3"
        >
          <div className="flex h-10 w-full items-center rounded-xl border border-ui-border bg-ui-surface-muted px-3 focus-within:border-ui-brand focus-within:ring-2 focus-within:ring-ui-brand/20">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={CHAT_MESSAGE_MAX_LENGTH}
              placeholder={inputPlaceholder}
              className="w-full bg-transparent text-sm font-medium text-ui-text-primary placeholder:text-ui-text-subtle outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!canSend}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-colors',
              canSend
                ? 'bg-ui-brand hover:bg-ui-brand-strong'
                : 'bg-ui-disabled-bg text-ui-disabled-text'
            )}
          >
            <span className="text-sm">➤</span>
          </button>
        </form>
      </section>
    </div>
  )
}
