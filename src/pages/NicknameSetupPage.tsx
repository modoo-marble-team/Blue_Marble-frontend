import { ArrowLeft, UserRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNicknameSetupForm } from '../features/auth/nickname/hooks/useNicknameSetupForm'

// 최초 닉네임 설정 폼 화면 렌더링
function NicknameSetupPage() {
  const {
    shouldRender,
    nickname,
    helperFeedback,
    isSubmitting,
    isSubmitDisabled,
    handleSubmit,
    handleNicknameChange,
    handleNicknameFocus,
    handleNicknameBlur,
    handleBackToHome,
  } = useNicknameSetupForm()

  // 세션/진입 조건이 맞지 않으면 렌더링 중단
  if (!shouldRender) {
    return null
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ui-app-bg">
      <div className="pointer-events-none absolute inset-0">
        <picture>
          <source srcSet="/HomePage_background.webp" type="image/webp" />
          <img
            src="/HomePage_background.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-45"
          />
        </picture>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.52),transparent_32%),linear-gradient(180deg,rgba(250,248,240,0.76),rgba(250,248,240,0.88))]" />
      </div>

      <button
        type="button"
        onClick={handleBackToHome}
        aria-label="홈으로 이동"
        className="absolute left-4 top-4 z-10 inline-flex select-none items-center gap-2 rounded-full border border-ui-border bg-ui-surface/92 px-4 py-2 text-sm font-semibold text-ui-text-primary shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition-colors hover:bg-ui-surface-muted sm:left-6 sm:top-6"
      >
        <ArrowLeft className="size-5" />
        홈으로
      </button>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <motion.section
          className="w-full max-w-[520px] rounded-[32px] border border-ui-border bg-ui-surface/94 px-8 py-9 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur-sm"
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.34, ease: [0.18, 0.9, 0.28, 1] }}
        >
          <div className="mb-5 flex justify-center">
            <div className="flex size-[68px] items-center justify-center rounded-full bg-ui-brand-soft">
              <UserRound className="size-8 text-ui-brand" />
            </div>
          </div>

          <h1 className="select-none text-center text-4xl font-extrabold tracking-tight text-ui-text-strong">
            닉네임 설정
          </h1>
          <p className="mt-2 select-none text-center text-[0.97rem] font-medium leading-7 text-ui-text-muted">
            친구들이 당신을 알아볼 수 있도록 닉네임을 정해 주세요.
          </p>

          <form className="mt-8" onSubmit={handleSubmit}>
            <label
              htmlFor="nickname"
              className="mb-2 block text-base font-semibold text-ui-text-primary"
            >
              닉네임
            </label>

            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ui-text-subtle" />
              <input
                id="nickname"
                type="text"
                value={nickname}
                maxLength={10}
                onFocus={handleNicknameFocus}
                onBlur={handleNicknameBlur}
                onChange={(event) => handleNicknameChange(event.target.value)}
                placeholder="예) GoormEE"
                className="h-12 w-full rounded-2xl border border-ui-border bg-ui-surface pl-11 pr-4 text-base text-ui-text-primary outline-none placeholder:text-ui-text-subtle focus:border-ui-brand focus:ring-2 focus:ring-ui-brand/20"
                autoComplete="off"
              />
            </div>

            <p
              className={`mt-3 text-sm font-medium ${
                helperFeedback.tone === 'danger'
                  ? 'text-ui-danger'
                  : helperFeedback.tone === 'success'
                    ? 'text-ui-presence-lobby'
                    : 'text-ui-text-muted'
              }`}
            >
              {helperFeedback.message}
            </p>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="mt-6 flex h-12 w-full select-none items-center justify-center rounded-2xl bg-ui-brand text-lg font-bold text-white shadow-[0_8px_20px_rgba(59,130,246,0.16)] transition-colors hover:bg-ui-brand-strong disabled:cursor-not-allowed disabled:bg-ui-disabled-bg disabled:text-ui-disabled-text disabled:shadow-none"
            >
              {isSubmitting ? '처리 중...' : '시작하기'}
            </button>
          </form>
        </motion.section>
      </main>
    </div>
  )
}

export default NicknameSetupPage
