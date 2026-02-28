import { useCallback, useEffect, useMemo, useState } from 'react'
import { Lock, X } from 'lucide-react'
import { cn } from '../../lib/utils'

const ROOM_PASSWORD_PATTERN = /^\d{4}$/
const ROOM_TITLE_MAX_LENGTH = 16

export interface CreateRoomFormValues {
  title: string
  isPrivate: boolean
  password?: string
}

interface CreateRoomModalProps {
  defaultRoomTitle: string
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (values: CreateRoomFormValues) => void
}

export function CreateRoomModal({
  defaultRoomTitle,
  isSubmitting,
  onClose,
  onSubmit,
}: CreateRoomModalProps) {
  const [roomTitle, setRoomTitle] = useState('')
  const [isPrivateRoomEnabled, setIsPrivateRoomEnabled] = useState(false)
  const [roomPassword, setRoomPassword] = useState('')

  const normalizedRoomTitle = useMemo(() => {
    const trimmedTitle = roomTitle.trim()

    if (trimmedTitle.length > 0) {
      return trimmedTitle.slice(0, ROOM_TITLE_MAX_LENGTH)
    }

    return defaultRoomTitle.slice(0, ROOM_TITLE_MAX_LENGTH)
  }, [defaultRoomTitle, roomTitle])

  const isPrivatePasswordValid =
    !isPrivateRoomEnabled || ROOM_PASSWORD_PATTERN.test(roomPassword)
  const isSubmitDisabled = isSubmitting || !isPrivatePasswordValid
  const canClose = !isSubmitting

  const handleClose = useCallback(() => {
    if (!canClose) {
      return
    }

    onClose()
  }, [canClose, onClose])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      handleClose()
    }

    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [handleClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.35)] p-4 backdrop-blur-[2px]">
      <div className="absolute inset-0" onClick={handleClose} aria-hidden />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="방 만들기"
        className="relative z-10 w-full max-w-[450px] overflow-hidden rounded-[32px] border border-ui-border bg-ui-surface shadow-[0_24px_60px_rgba(15,23,42,0.2)]"
      >
        <button
          type="button"
          aria-label="모달 닫기"
          onClick={handleClose}
          disabled={!canClose}
          className={cn(
            'absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full text-white/80 transition-colors',
            canClose ? 'hover:bg-white/15 hover:text-white' : 'opacity-60'
          )}
        >
          <X className="size-5" />
        </button>

        <header className="bg-[linear-gradient(104deg,#3f8df7_0%,#334ce9_52%,#5633ea_100%)] px-7 pb-8 pt-7 text-center">
          <h2 className="text-[2.2rem] font-extrabold tracking-tight text-white">
            방 만들기
          </h2>
          <p className="mt-1 text-base font-semibold text-white/75">
            친구들을 초대하고 게임을 즐기세요!
          </p>
        </header>

        <form
          className="px-7 pb-8 pt-7"
          onSubmit={(event) => {
            event.preventDefault()

            if (isSubmitDisabled) {
              return
            }

            onSubmit({
              title: normalizedRoomTitle,
              isPrivate: isPrivateRoomEnabled,
              password: isPrivateRoomEnabled ? roomPassword : undefined,
            })
          }}
        >
          <label
            htmlFor="create-room-title"
            className="text-[1.05rem] font-semibold text-ui-text-primary"
          >
            방 제목
          </label>

          <input
            id="create-room-title"
            type="text"
            value={roomTitle}
            maxLength={ROOM_TITLE_MAX_LENGTH}
            onChange={(event) => {
              setRoomTitle(event.target.value)
            }}
            placeholder={defaultRoomTitle}
            className="mt-2 h-12 w-full rounded-2xl border border-ui-border bg-white px-4 text-[1.2rem] font-semibold text-ui-text-primary outline-none placeholder:text-ui-text-subtle focus:border-ui-brand focus:ring-2 focus:ring-ui-brand/20"
            autoComplete="off"
          />

          <div className="mt-8 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-[1.05rem] font-semibold text-ui-text-primary">
              <Lock className="size-4 text-ui-text-subtle" />
              비밀방 설정
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isPrivateRoomEnabled}
              onClick={() => {
                setIsPrivateRoomEnabled((previous) => {
                  const nextValue = !previous

                  if (!nextValue) {
                    setRoomPassword('')
                  }

                  return nextValue
                })
              }}
              className={cn(
                'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors',
                isPrivateRoomEnabled ? 'bg-ui-brand' : 'bg-ui-text-subtle/35'
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform',
                  isPrivateRoomEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {isPrivateRoomEnabled ? (
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={roomPassword}
              onChange={(event) => {
                const nextValue = event.target.value
                  .replace(/\D/g, '')
                  .slice(0, 4)
                setRoomPassword(nextValue)
              }}
              placeholder="비밀번호 (4자리)"
              className="mt-4 h-12 w-full rounded-2xl border border-ui-border bg-white px-4 text-[1.2rem] font-semibold text-ui-text-primary outline-none placeholder:text-ui-text-subtle focus:border-ui-brand focus:ring-2 focus:ring-ui-brand/20"
            />
          ) : null}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={cn(
              'mt-6 h-14 w-full rounded-2xl text-[1.35rem] font-extrabold transition-colors',
              isSubmitDisabled
                ? 'cursor-not-allowed bg-ui-disabled-bg text-ui-disabled-text'
                : 'bg-ui-brand text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)] hover:bg-ui-brand-strong'
            )}
          >
            {isSubmitting ? '생성 중...' : '방 만들기 완료'}
          </button>
        </form>
      </section>
    </div>
  )
}
