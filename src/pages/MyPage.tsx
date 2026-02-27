import { useEffect, useMemo } from 'react'
import { ArrowLeft, Gamepad2, Shield, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../features/auth/store'
import { useMyPageProfileQuery } from '../features/auth/hooks/useMyPageProfileQuery'
import { getAvatarText } from '../components/header/profileMenu'

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
    icon: Shield,
    iconClassName: 'text-[#ef4444]',
    iconBackgroundClassName: 'bg-[#fee2e2]',
  },
]

function MyPage() {
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const { data: profile, isLoading, isError } = useMyPageProfileQuery(session)

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    if (session.needsNicknameSetup) {
      navigate('/nickname-setup', { replace: true })
    }
  }, [navigate, session])

  const fallbackAvatarText = useMemo(() => {
    return getAvatarText(session?.nickname)
  }, [session?.nickname])

  if (!session || session.needsNicknameSetup) {
    return null
  }

  const isGuest = session.isGuest

  return (
    <div className="min-h-screen bg-ui-app-bg">
      <header className="flex h-14 items-center border-b border-ui-border bg-ui-surface px-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/lobby')}
          className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-ui-text-primary transition-colors hover:bg-ui-surface-muted"
        >
          <span className="flex size-9 items-center justify-center rounded-full border border-ui-border bg-ui-surface-soft">
            <ArrowLeft className="size-4" />
          </span>
          <span className="text-xl font-bold leading-none text-ui-text-strong">
            내 정보
          </span>
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
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
              ) : (
                <div className="flex items-center gap-6">
                  <div className="relative size-24 overflow-hidden rounded-full border border-ui-border bg-ui-brand-soft">
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt={`${profile.nickname} 프로필`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-2xl font-bold text-ui-brand">
                        {fallbackAvatarText}
                      </div>
                    )}
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-ui-text-strong">
                    {profile.nickname}
                  </h1>
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
