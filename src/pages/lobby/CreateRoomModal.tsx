import { useCallback, useEffect, useMemo, useState } from 'react'
import { Lock, X } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  ROOM_PASSWORD_LENGTH,
  ROOM_PASSWORD_PATTERN,
} from '../../constants/room'
import { cn } from '../../lib/utils'

// 방 제목 최대 글자수 제한
const ROOM_TITLE_MAX_LENGTH = 16

// 방 생성 제출 payload 타입
export interface CreateRoomFormValues {
  title: string
  isPrivate: boolean
  password?: string
}

// 방 생성 모달 입력값 타입
interface CreateRoomModalProps {
  defaultRoomTitle: string
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (values: CreateRoomFormValues) => void
}

// 방 제목/비밀방 여부/비밀번호를 입력받는 방 생성 모달
export function CreateRoomModal({
  defaultRoomTitle,
  isSubmitting,
  onClose,
  onSubmit,
}: CreateRoomModalProps) {
  const [roomTitle, setRoomTitle] = useState('')
  const [isPrivateRoomEnabled, setIsPrivateRoomEnabled] = useState(false)
  const [roomPassword, setRoomPassword] = useState('')

  // 입력 제목이 비어 있으면 기본 제목을 사용하고 길이를 제한
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

  // 제출 중이 아닐 때만 모달 닫기를 허용
  const handleClose = useCallback(() => {
    if (!canClose) {
      return
    }

    onClose()
  }, [canClose, onClose])

  // ESC 키 입력 시 모달 닫기 처리
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
      <motion.div
        className="absolute inset-0"
        onClick={handleClose}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />

      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label="방 만들기"
        className="relative z-10 w-full max-w-[430px] rounded-[32px] border border-ui-border bg-ui-surface px-7 pb-7 pt-8 shadow-[0_24px_60px_rgba(15,23,42,0.2)]"
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.18, 0.9, 0.28, 1] }}
      >
        <button
          type="button"
          aria-label="모달 닫기"
          onClick={handleClose}
          disabled={!canClose}
          className={cn(
            'absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full border border-ui-border bg-white text-ui-text-muted transition-colors',
            canClose
              ? 'hover:bg-ui-surface-soft hover:text-ui-text-strong'
              : 'cursor-not-allowed opacity-60'
          )}
        >
          <X className="size-5" />
        </button>

        <h2 className="text-center text-[1.85rem] font-extrabold tracking-tight text-ui-text-strong">
          방 만들기
        </h2>
        <p className="mt-1 text-center text-base font-semibold text-ui-text-muted">
          친구들을 초대하고 게임을 즐기세요!
        </p>

        <form
          className="mt-6"
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          onSubmit={(event) => {
            event.preventDefault()

            // 유효하지 않은 상태에서는 submit 동작 차단
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
            className="text-base font-semibold text-ui-text-primary"
          >
            방 제목
          </label>

          <input
            id="create-room-title"
            name="room-title"
            type="text"
            value={roomTitle}
            maxLength={ROOM_TITLE_MAX_LENGTH}
            onChange={(event) => {
              setRoomTitle(event.target.value)
            }}
            placeholder={defaultRoomTitle}
            className="mt-2 h-12 w-full rounded-2xl border border-ui-border bg-white px-4 text-[1.05rem] font-semibold text-ui-text-primary outline-none placeholder:text-ui-text-subtle focus:border-ui-brand focus:ring-2 focus:ring-ui-brand/20"
            autoComplete="off"
          />

          <div className="mt-7 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-base font-semibold text-ui-text-primary">
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

                  // 비밀방 설정 해제 시 기존 비밀번호 입력값 초기화
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
              name="room-access-code"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={ROOM_PASSWORD_LENGTH}
              autoComplete="new-password"
              data-1p-ignore="true"
              data-lpignore="true"
              value={roomPassword}
              onChange={(event) => {
                const nextValue = event.target.value
                  .replace(/\D/g, '')
                  .slice(0, ROOM_PASSWORD_LENGTH)
                setRoomPassword(nextValue)
              }}
              placeholder="비밀번호 (4자리)"
              className="mt-4 h-12 w-full rounded-2xl border border-ui-border bg-white px-4 text-[1.05rem] font-semibold text-ui-text-primary outline-none placeholder:text-ui-text-subtle focus:border-ui-brand focus:ring-2 focus:ring-ui-brand/20"
            />
          ) : null}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={cn(
              'mt-5 h-12 w-full rounded-2xl text-base font-bold transition-colors',
              isSubmitDisabled
                ? 'cursor-not-allowed bg-ui-disabled-bg text-ui-disabled-text'
                : 'bg-ui-brand text-white hover:bg-ui-brand-strong'
            )}
          >
            {isSubmitting ? '생성 중...' : '방 만들기 완료'}
          </button>
        </form>
      </motion.section>
    </div>
  )
}
