import { useState } from 'react'
import type { ChatMessage } from '../../types/domain'
import { cn } from '../../lib/utils'

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

  // 채팅 입력 submit 처리
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedInput = input.trim()

    // 공백 입력은 전송하지 않음
    if (!normalizedInput) {
      return
    }

    onSendMessage(normalizedInput)
    setInput('')
  }

  return (
    <div className={cn('flex h-full w-[320px] flex-col gap-4', className)}>
      {notice ? (
        <div className="flex items-center justify-start rounded-lg border border-white/10 bg-[#314158]/90 p-3 shadow-md">
          <span className="text-xs leading-none font-bold text-white">
            {notice}
          </span>
        </div>
      ) : null}

      <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/90 shadow-xl">
        <header className="flex items-center justify-between border-b border-[#0F172B] bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#90A1B9]">💬</span>
            <span className="text-xs font-black tracking-widest text-[#45556C]">
              {title}
            </span>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-[#F8FAFC]/30 p-3">
          {messages.map((message) => {
            const isMine = message.sender_id === currentUserId

            return (
              <div
                key={message.id}
                className={cn(
                  'flex flex-col',
                  isMine ? 'items-end' : 'items-start'
                )}
              >
                <div className="mb-0.5 px-0.5">
                  <span className="text-[9px] font-bold text-[#90A1B9]">
                    {message.sender_nickname}
                  </span>
                </div>

                <div
                  className={cn(
                    'max-w-[85%] px-3 py-2 text-xs leading-snug font-medium shadow-sm',
                    isMine
                      ? 'rounded-[16px_0_16px_16px] bg-[#2B7FFF] text-white'
                      : 'rounded-[0_16px_16px_16px] border border-[#E2E8F0] bg-white text-[#314158]'
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
          className="flex gap-2 border-t border-[#0F172B] bg-white p-3"
        >
          <div className="ring-[#2B7FFF]/30 flex flex-1 items-center rounded-lg bg-[#F1F5F9] px-3 py-1.5 focus-within:ring-1">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={inputPlaceholder}
              className="w-full bg-transparent text-xs font-medium text-[#314158] placeholder:text-[#90A1B9] outline-none"
            />
          </div>

          <button
            type="submit"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2B7FFF] text-white shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            <span className="text-sm">➤</span>
          </button>
        </form>
      </section>
    </div>
  )
}
