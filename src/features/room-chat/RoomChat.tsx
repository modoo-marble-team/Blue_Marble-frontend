import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Avatar } from '../../components/avatar/Avatar'
import type { ChatMessage } from '../../types/domain'
import { cn } from '../../lib/utils'
import {
  CHAT_MESSAGE_MAX_LENGTH,
  normalizeChatMessage,
} from '../../constants/chat'

export interface RoomChatSenderMeta {
  avatarColor?: string
  accentColor?: string
  badgeLabel?: string
  displayName?: string
}

// 공통 채팅 박스 렌더링 입력값 타입
interface RoomChatProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  notice?: string
  className?: string
  title?: string
  currentUserId?: string
  inputPlaceholder?: string
  senderMetaById?: Record<string, RoomChatSenderMeta>
}

interface RoomChatMessageGroup {
  key: string
  senderId: string
  senderNickname: string
  meta?: RoomChatSenderMeta
  isMine: boolean
  messages: ChatMessage[]
}

const MESSAGE_GROUP_WINDOW_MS = 5 * 60 * 1000

function getMessageTimestampMs(timestamp: string) {
  const parsedTimestamp = Date.parse(timestamp)

  return Number.isNaN(parsedTimestamp) ? null : parsedTimestamp
}

function withAlpha(color: string | undefined, alphaHex: string) {
  if (!color) {
    return undefined
  }

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return `${color}${alphaHex}`
  }

  return undefined
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
  senderMetaById,
}: RoomChatProps) {
  const [input, setInput] = useState('')
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const canSend = input.trim().length > 0
  const messageGroups = useMemo<RoomChatMessageGroup[]>(() => {
    return messages.reduce<RoomChatMessageGroup[]>((groups, message) => {
      const currentGroup = groups[groups.length - 1]
      const previousMessage =
        currentGroup?.messages[currentGroup.messages.length - 1] ?? null
      const previousTimestampMs = previousMessage
        ? getMessageTimestampMs(previousMessage.timestamp)
        : null
      const currentTimestampMs = getMessageTimestampMs(message.timestamp)
      const isWithinGroupWindow =
        previousTimestampMs != null &&
        currentTimestampMs != null &&
        currentTimestampMs - previousTimestampMs <= MESSAGE_GROUP_WINDOW_MS

      if (
        currentGroup &&
        currentGroup.senderId === message.sender_id &&
        isWithinGroupWindow
      ) {
        currentGroup.messages.push(message)
        return groups
      }

      groups.push({
        key: `${message.sender_id}-${message.id}`,
        senderId: message.sender_id,
        senderNickname: message.sender_nickname,
        meta: senderMetaById?.[message.sender_id],
        isMine: message.sender_id === currentUserId,
        messages: [message],
      })

      return groups
    }, [])
  }, [currentUserId, messages, senderMetaById])

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
          {messageGroups.map((group) => {
            const accentColor = group.meta?.accentColor
            const displayName = group.meta?.displayName ?? group.senderNickname
            const badgeBackgroundColor = withAlpha(accentColor, '1F')

            return (
              <div
                key={group.key}
                className={cn(
                  'flex min-w-0 w-full',
                  group.isMine ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'flex min-w-0',
                    group.isMine
                      ? 'max-w-[85%] flex-col items-end gap-1'
                      : 'max-w-[90%] items-start gap-2'
                  )}
                >
                  {group.isMine ? null : (
                    <Avatar
                      size="xs"
                      displayName={displayName}
                      backgroundColor={group.meta?.avatarColor}
                      colorSeed={group.senderId}
                      className="mt-0.5 text-white shadow-sm"
                      textClassName="text-[10px] font-bold"
                    />
                  )}

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {group.isMine ? null : (
                      <div className="flex min-w-0 items-center gap-2 px-0.5">
                        <span
                          className="block truncate text-[12px] font-semibold text-ui-text-primary"
                          style={
                            accentColor ? { color: accentColor } : undefined
                          }
                        >
                          {displayName}
                        </span>
                        {group.meta?.badgeLabel ? (
                          <span
                            className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.12em]"
                            style={{
                              color: accentColor,
                              borderColor: accentColor,
                              backgroundColor: badgeBackgroundColor,
                            }}
                          >
                            {group.meta.badgeLabel}
                          </span>
                        ) : null}
                      </div>
                    )}

                    <div className="flex min-w-0 flex-col gap-1">
                      {group.messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'min-w-0 w-fit max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] px-3 py-2 text-sm leading-snug font-medium shadow-sm',
                            group.isMine
                              ? 'self-end rounded-2xl rounded-tr-md bg-ui-brand text-white'
                              : 'rounded-2xl rounded-tl-md border border-ui-border bg-ui-surface-soft text-ui-text-primary'
                          )}
                        >
                          {message.content}
                        </div>
                      ))}
                    </div>
                  </div>
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
