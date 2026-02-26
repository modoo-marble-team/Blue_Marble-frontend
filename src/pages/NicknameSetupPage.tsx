import { ArrowLeft, UserRound } from 'lucide-react'
import { useNicknameSetupForm } from '../features/auth/hooks/useNicknameSetupForm'

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

  if (!shouldRender) {
    return null
  }

  return (
    <div className="relative min-h-screen bg-ui-app-bg">
      <button
        type="button"
        onClick={handleBackToHome}
        aria-label="홈으로 이동"
        className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full border border-ui-border bg-ui-surface text-ui-text-primary transition-colors hover:bg-ui-surface-muted sm:left-6 sm:top-6"
      >
        <ArrowLeft className="size-5" />
      </button>

      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <section className="-mt-24 w-full max-w-[560px] rounded-3xl border border-ui-border bg-ui-surface px-8 py-10 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex justify-center">
            <div className="flex size-[72px] items-center justify-center rounded-full bg-ui-brand-soft">
              <UserRound className="size-8 text-ui-brand" />
            </div>
          </div>

          <h1 className="text-center text-4xl font-extrabold tracking-tight text-ui-text-strong">
            닉네임 설정
          </h1>
          <p className="mt-2 text-center text-base font-medium text-ui-text-muted">
            친구들이 당신을 알아볼 수 있도록 닉네임을 정해 주세요.
          </p>

          <form className="mt-9" onSubmit={handleSubmit}>
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
              className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-ui-brand text-lg font-bold text-white transition-colors hover:bg-ui-brand-strong disabled:cursor-not-allowed disabled:bg-ui-disabled-bg disabled:text-ui-disabled-text"
            >
              {isSubmitting ? '처리 중...' : '시작하기'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default NicknameSetupPage
