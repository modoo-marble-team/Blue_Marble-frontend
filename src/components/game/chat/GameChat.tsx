import React, { useState } from 'react'
import { ChatMessage } from '../../../types/domain'
import { cn } from '../../../lib/utils'

interface ChatSectionProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  notice?: string
}

const ChatSection: React.FC<ChatSectionProps> = ({
  messages,
  onSendMessage,
  notice,
}) => {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    onSendMessage(input)
    setInput('')
  }

  return (
    <div className="flex h-full w-[320px] flex-col gap-4">
      {/* Notice Area */}
      {notice && (
        <div className="flex items-center justify-start rounded-lg border border-white/10 bg-[#314158]/90 p-3 shadow-md">
          <span className="text-xs font-bold text-white leading-none">
            {notice}
          </span>
        </div>
      )}

      {/* Chat Box */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/90 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#0F172B] bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-2">
            <span className="text-[#90A1B9] text-sm">💬</span>
            <span className="text-xs font-black tracking-widest text-[#45556C]">
              CHAT
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC]/30 p-3 space-y-3">
          {messages.map((msg) => {
            const isSystem = msg.type === 'system'
            const isMine = msg.sender_id === 'me'

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col',
                  isMine ? 'items-end' : 'items-start'
                )}
              >
                <div className="mb-0.5 px-0.5">
                  <span className="text-[9px] font-bold text-[#90A1B9]">
                    {isSystem ? 'System' : msg.sender_nickname}
                  </span>
                </div>

                <div
                  className={cn(
                    'max-w-[85%] px-3 py-2 text-xs font-medium shadow-sm leading-snug',
                    isMine
                      ? 'rounded-[16px_0_16px_16px] bg-[#2B7FFF] text-white'
                      : 'rounded-[0_16px_16px_16px] bg-white border border-[#E2E8F0] text-[#314158]'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            )
          })}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 border-t border-[#0F172B] bg-white p-3"
        >
          <div className="flex flex-1 items-center rounded-lg bg-[#F1F5F9] px-3 py-1.5 focus-within:ring-1 ring-[#2B7FFF]/30">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지..."
              className="w-full bg-transparent text-xs font-medium text-[#314158] outline-none placeholder:text-[#90A1B9]"
            />
          </div>
          <button
            type="submit"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2B7FFF] text-white shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            <span className="text-sm">➤</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatSection
