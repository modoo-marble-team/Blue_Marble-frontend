import React, { useState } from 'react'
import { ChatMessage } from '../../types/domain'
import { Send } from 'lucide-react'

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
    <div className="flex h-full flex-col gap-3">
      {/* Notice Area */}
      {notice && (
        <div className="rounded-xl bg-[#4b5563] p-3 text-center text-sm font-bold text-white shadow-md">
          {notice}
        </div>
      )}

      {/* Chat Window */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border-2 border-[#e5e7eb] bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 p-3">
          <span className="text-gray-400">💬</span>
          <span className="text-[12px] font-bold tracking-widest text-gray-500">
            CHAT
          </span>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {messages.map((msg) => {
            const isSystem = msg.type === 'system'

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="rounded-full bg-gray-50 px-4 py-1 text-[11px] font-medium text-gray-400 border border-gray-100">
                    {msg.content}
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 px-1">
                  {msg.sender_nickname}
                </span>
                <div className="max-w-[80%] rounded-2xl bg-[#f3f4f6] px-4 py-2 text-[12px] font-medium text-[#374151] shadow-sm self-start">
                  {msg.content}
                </div>
              </div>
            )
          })}
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-gray-100 p-3 flex items-center gap-2 bg-[#f9fafb]"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지..."
            className="flex-1 bg-transparent px-2 py-1 text-[13px] outline-none"
          />
          <button
            type="submit"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatSection
