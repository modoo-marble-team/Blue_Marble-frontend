import { useCallback, useEffect } from 'react'
import { Lock, X } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  ROOM_PASSWORD_LENGTH,
  ROOM_PASSWORD_PATTERN,
} from '../../constants/room'
import { cn } from '../../lib/utils'

// 비밀방 입장 모달 입력값 타입
interface PrivateRoomJoinModalProps {
  roomTitle: string
  password: string
  isSubmitting: boolean
  isPasswordInvalid: boolean
  onPasswordChange: (password: string) => void
  onClose: () => void
  onSubmit: () => void
}

// 비밀방 비밀번호 입력/검증 상태를 렌더링하는 입장 모달
export function PrivateRoomJoinModal({
  roomTitle,
  password,
  isSubmitting,
  isPasswordInvalid,
  onPasswordChange,
  onClose,
  onSubmit,
}: PrivateRoomJoinModalProps) {
  const isJoinDisabled = !ROOM_PASSWORD_PATTERN.test(password) || isSubmitting
  const helperMessage = isPasswordInvalid
    ? '비밀번호가 올바르지 않습니다.'
    : '• 비밀번호 4자리를 입력해주세요'
  const canClose = !isSubmitting

  // 제출 중이 아닐 때만 모달 닫기를 허용
  const handleClose = useCallback(() => {
    if (!canClose) {
      return
    }
    onClose()
  }, [canClose, onClose])

  // ESC 키 입력으로 모달 닫기 처리
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
        aria-label="비밀방 입장"
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

        <div className="mx-auto mb-4 flex size-[58px] items-center justify-center rounded-full bg-ui-surface-soft text-ui-text-subtle">
          <Lock className="size-8" />
        </div>

        <h2 className="text-center text-[1.85rem] font-extrabold tracking-tight text-ui-text-strong">
          비밀방 입장
        </h2>

        <p className="mt-1 text-center text-base font-semibold text-ui-text-muted">
          {roomTitle}
        </p>

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault()
            // 비밀번호 형식이 맞지 않으면 입장 요청 차단
            if (isJoinDisabled) {
              return
            }
            onSubmit()
          }}
        >
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={ROOM_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => {
              const nextValue = event.target.value
                .replace(/\D/g, '')
                .slice(0, ROOM_PASSWORD_LENGTH)
              onPasswordChange(nextValue)
            }}
            placeholder="비밀번호 입력"
            className={cn(
              'h-12 w-full rounded-2xl border bg-white px-4 text-[1.05rem] font-semibold text-ui-text-strong placeholder:text-ui-text-subtle focus:outline-none focus:ring-0 transition-colors',
              isPasswordInvalid
                ? 'border-2 border-ui-danger bg-ui-danger-bg/30 focus:border-ui-danger'
                : 'border-ui-border focus:border-ui-border'
            )}
          />

          <p
            className={cn(
              'mt-2 min-h-5 text-sm font-semibold',
              isPasswordInvalid ? 'text-ui-danger' : 'text-ui-text-muted'
            )}
          >
            {helperMessage}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-12 rounded-2xl bg-ui-disabled-bg text-base font-bold text-ui-text-muted transition-colors hover:bg-ui-surface-soft"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isJoinDisabled}
              className={cn(
                'h-12 rounded-2xl text-base font-bold transition-colors',
                isJoinDisabled
                  ? 'cursor-not-allowed bg-ui-disabled-bg text-ui-disabled-text'
                  : 'bg-ui-brand text-white hover:bg-ui-brand-strong'
              )}
            >
              {isSubmitting ? '입장 중...' : '입장'}
            </button>
          </div>
        </form>
      </motion.section>
    </div>
  )
}
