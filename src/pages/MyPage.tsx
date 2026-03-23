import { ArrowLeft, Frown, Gamepad2, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRequireActiveSession } from '../features/auth/session/hooks/useRequireActiveSession'
import { useAuthStore } from '../features/auth/session/store'
import { useMyPageProfileQuery } from '../features/auth/profile/hooks/useMyPageProfileQuery'
import { useMyPageNicknameForm } from '../features/auth/profile/hooks/useMyPageNicknameForm'
import { Avatar } from '../components/avatar/Avatar'
import { getAvatarBackground } from '../components/header/profileMenu'

// 전적 카드 렌더링 메타데이터
const myPageStatsCardMeta = [
  {
    key: 'total' as const,
    label: '총 게임',
    icon: Gamepad2,
    iconClassName: 'text-ui-brand',
    iconBackgroundClassName: 'bg-ui-brand-soft',
  },
  {
    key: 'wins' as const,
    label: '승리',
    icon: Trophy,
    iconClassName: 'text-[#e0a300]',
    iconBackgroundClassName: 'bg-[#fff5d6]',
  },
  {
    key: 'losses' as const,
    label: '패배',
    icon: Frown,
    iconClassName: 'text-[#ef4444]',
    iconBackgroundClassName: 'bg-[#fee2e2]',
  },
]

// 마이페이지 진입 제어와 프로필/전적 화면 렌더링
function MyPage() {
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const isAllowedSession = useRequireActiveSession(session)
  const { data: profile, isLoading, isError } = useMyPageProfileQuery(session)
  const {
    draftNickname,
    helperFeedback,
    isEditing,
    isSubmitting,
    isSaveDisabled,
    startEditing,
    cancelEditing,
    handleNicknameChange,
    handleNicknameFocus,
    handleNicknameBlur,
    handleSubmit,
  } = useMyPageNicknameForm({
    session,
    profile: profile ?? null,
  })

  // 리다이렉트 조건에서는 화면을 렌더링하지 않음
  if (!isAllowedSession || !session) {
    return null
  }

  const isGuest = session.isGuest

  return (
    <div className="relative min-h-screen overflow-hidden bg-ui-app-bg">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-14">
        <img
          src="/LobbyPage_background.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.34),transparent_30%),linear-gradient(180deg,rgba(250,248,240,0.38),rgba(250,248,240,0.5))]" />
      </div>

      <header className="relative flex h-14 items-center border-b border-ui-border bg-ui-surface px-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/lobby')}
          aria-label="로비로 돌아가기"
          className="inline-flex items-center justify-center rounded-xl p-1 text-ui-text-primary transition-colors hover:bg-ui-surface-muted"
        >
          <span className="flex size-9 items-center justify-center rounded-full border border-ui-border bg-ui-surface-soft">
            <ArrowLeft className="size-4" />
          </span>
        </button>
        <span className="ml-2 text-xl font-bold leading-none text-ui-text-strong">
          내 정보
        </span>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {isGuest ? (
          <section className="rounded-3xl border border-ui-border bg-ui-surface p-7 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-bold text-ui-text-strong">
              마이페이지 제한
            </h2>
            <p className="mt-2 text-sm font-medium text-ui-text-muted">
              게스트는 마이페이지 및 전적 조회를 이용할 수 없습니다.
            </p>
            <button
              type="button"
              onClick={() => navigate('/lobby')}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-ui-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-ui-brand-strong"
            >
              로비로 돌아가기
            </button>
          </section>
        ) : null}

        {!isGuest ? (
          <section className="space-y-5">
            <article className="rounded-3xl border border-ui-border bg-ui-surface px-8 py-8 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
              {isLoading ? (
                <div className="flex items-center gap-6">
                  <div className="size-24 animate-pulse rounded-full bg-ui-surface-soft" />
                  <div className="h-8 w-36 animate-pulse rounded-xl bg-ui-surface-soft" />
                </div>
              ) : isError || !profile ? (
                <p className="text-sm font-medium text-ui-danger">
                  프로필 정보를 불러오지 못했습니다.
                </p>
              ) : isEditing ? (
                <form
                  onSubmit={handleSubmit}
                  className="flex w-full flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-start gap-6">
                    <Avatar
                      size="lg"
                      displayName={draftNickname || profile.nickname}
                      imageUrl={profile.profileImage}
                      imageAlt={`${profile.nickname} 프로필`}
                      backgroundColor={getAvatarBackground(session.userId)}
                      className="border border-ui-border"
                      textClassName="text-black"
                    />

                    <div className="flex min-h-24 w-full max-w-sm flex-col justify-end">
                      <label htmlFor="my-page-nickname" className="sr-only">
                        닉네임
                      </label>
                      <input
                        id="my-page-nickname"
                        type="text"
                        value={draftNickname}
                        maxLength={10}
                        onFocus={handleNicknameFocus}
                        onBlur={handleNicknameBlur}
                        onChange={(event) =>
                          handleNicknameChange(event.target.value)
                        }
                        placeholder="예) GoormEE"
                        className="h-12 w-full rounded-2xl border border-ui-border bg-ui-surface px-4 text-base text-ui-text-primary outline-none placeholder:text-ui-text-subtle focus:border-ui-brand focus:ring-2 focus:ring-ui-brand/20"
                        autoComplete="off"
                        aria-label="닉네임"
                      />
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
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end lg:self-center">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-ui-border bg-ui-surface px-4 text-sm font-semibold text-ui-text-primary transition-colors hover:bg-ui-surface-muted"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isSaveDisabled}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-ui-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-ui-brand-strong disabled:cursor-not-allowed disabled:bg-ui-disabled-bg disabled:text-ui-disabled-text"
                    >
                      {isSubmitting ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-6">
                    <Avatar
                      size="lg"
                      displayName={profile.nickname}
                      imageUrl={profile.profileImage}
                      imageAlt={`${profile.nickname} 프로필`}
                      backgroundColor={getAvatarBackground(session.userId)}
                      className="border border-ui-border"
                      textClassName="text-black"
                    />
                    <h1 className="text-3xl font-extrabold tracking-tight text-ui-text-strong">
                      {profile.nickname}
                    </h1>
                  </div>

                  <button
                    type="button"
                    onClick={startEditing}
                    className="inline-flex h-11 items-center justify-center self-end rounded-xl border border-ui-border bg-ui-surface px-4 text-sm font-semibold text-ui-text-primary transition-colors hover:bg-ui-surface-muted lg:self-center"
                  >
                    닉네임 변경
                  </button>
                </div>
              )}
            </article>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {myPageStatsCardMeta.map((statCardMeta) => {
                const StatIcon = statCardMeta.icon
                const statValue = profile?.stats[statCardMeta.key] ?? 0

                return (
                  <article
                    key={statCardMeta.key}
                    className="rounded-3xl border border-ui-border bg-ui-surface px-6 py-6 shadow-[0_8px_22px_rgba(15,23,42,0.06)]"
                  >
                    <div
                      className={`mb-3 flex size-12 items-center justify-center rounded-2xl ${statCardMeta.iconBackgroundClassName}`}
                    >
                      <StatIcon
                        className={`size-6 ${statCardMeta.iconClassName}`}
                      />
                    </div>

                    <p className="text-3xl font-extrabold tracking-tight text-ui-text-strong">
                      {isLoading ? '--' : statValue.toLocaleString()}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-ui-text-muted">
                      {statCardMeta.label}
                    </p>
                  </article>
                )
              })}
            </section>
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default MyPage
