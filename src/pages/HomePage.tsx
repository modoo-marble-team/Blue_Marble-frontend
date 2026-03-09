import {
  Gamepad2,
  MessageCircle,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRedirectAuthenticatedToLobby } from '../features/auth/hooks/useRedirectAuthenticatedToLobby'
import { mockGuestLogin, mockKakaoLogin } from '../features/auth/mockApi'
import { useAuthStore } from '../features/auth/store'

// 홈 하단 기능 소개 카드 메타데이터
const featureCards = [
  {
    title: '실시간 대전',
    description: '친구들과 함께 즐기는 스릴만점 승부',
    icon: Gamepad2,
    iconBackground: 'bg-ui-brand',
  },
  {
    title: '최대 4인',
    description: '모두가 함께할 수 있는 멀티플레이',
    icon: UsersRound,
    iconBackground: 'bg-ui-presence-waiting',
  },
  {
    title: '빠른 한 판',
    description: '복잡한 규칙 없이 바로 시작하세요',
    icon: Zap,
    iconBackground: 'bg-ui-presence-playing',
  },
]

// 로그인 진입 홈 화면 렌더링과 인증 흐름 제어
function HomePage() {
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const setSession = useAuthStore((state) => state.setSession)

  const [isKakaoLoading, setIsKakaoLoading] = useState(false)
  const [isGuestLoading, setIsGuestLoading] = useState(false)

  useRedirectAuthenticatedToLobby(session)

  const isAnyLoading = isKakaoLoading || isGuestLoading

  // 카카오 로그인 결과에 따라 닉네임 설정/로비로 분기 이동
  async function handleKakaoLogin() {
    setIsKakaoLoading(true)
    try {
      const kakaoSession = await mockKakaoLogin()
      setSession(kakaoSession)
      navigate(kakaoSession.needsNicknameSetup ? '/nickname-setup' : '/lobby', {
        replace: true,
      })
    } finally {
      setIsKakaoLoading(false)
    }
  }

  // 게스트 세션을 발급받아 로비로 바로 이동
  async function handleGuestLogin() {
    setIsGuestLoading(true)
    try {
      const guestSession = await mockGuestLogin()
      setSession(guestSession)
      navigate('/lobby', { replace: true })
    } finally {
      setIsGuestLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ui-app-bg px-4 py-8 sm:px-8 sm:py-10">
      {/* 브랜드 중심을 받쳐주는 배경 레이어 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(59,130,246,0.1),transparent_24%),radial-gradient(circle_at_14%_84%,rgba(250,204,21,0.06),transparent_24%),radial-gradient(circle_at_86%_20%,rgba(14,165,233,0.06),transparent_22%)]" />
        <motion.div
          initial={{ y: 0, x: 0 }}
          animate={{ y: [0, -10, 0], x: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
          className="absolute left-[10%] top-[14%] size-24 rounded-full bg-ui-brand-soft/45 blur-3xl"
        />
        <motion.div
          initial={{ y: 0, x: 0 }}
          animate={{ y: [0, 12, 0], x: [0, -4, 0] }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: 'easeInOut',
            delay: 0.6,
          }}
          className="absolute bottom-[12%] right-[12%] size-28 rounded-full bg-ui-tag-playing-bg/35 blur-3xl"
        />
      </div>

      <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col items-center justify-center gap-12">
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: [0.18, 0.9, 0.28, 1] }}
          className="w-full max-w-4xl text-center"
        >
          <h1 className="text-[clamp(3.2rem,8vw,5.8rem)] font-extrabold leading-[0.92] tracking-tight text-ui-text-strong">
            <span className="text-ui-text-strong">MARBLE</span>
            <span className="ml-1.5 bg-linear-to-r from-ui-brand-strong via-ui-brand to-[#0ea5e9] bg-clip-text text-transparent sm:ml-2">
              POP
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-136 whitespace-pre-line text-[clamp(1rem,1.8vw,1.22rem)] font-bold leading-relaxed text-ui-text-primary">
            {
              '주사위를 굴려 나만의 도시를 건설하세요!\n귀엽고 신나는 실시간 보드게임'
            }
          </p>

          <div className="mx-auto mt-9 flex w-full max-w-[430px] flex-col gap-3 rounded-[24px] border border-ui-border/80 bg-ui-surface/95 p-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)] sm:p-4">
            <button
              type="button"
              onClick={handleKakaoLogin}
              disabled={isAnyLoading}
              className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-[#ffe812] py-3 text-[1.125rem] font-bold text-[#191919] shadow-[0_6px_14px_rgba(15,23,42,0.08)] transition-all hover:bg-[#f5dc00] hover:shadow-[0_8px_18px_rgba(15,23,42,0.1)] active:scale-[0.98] disabled:opacity-70"
            >
              <MessageCircle className="size-6 shrink-0 fill-[#191919]" />
              {isKakaoLoading ? '로그인 중...' : '카카오 로그인으로 시작'}
            </button>
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isAnyLoading}
              className="flex h-14 items-center justify-center gap-2.5 rounded-2xl border-2 border-ui-border bg-ui-surface/95 py-3 text-[1.125rem] font-bold text-ui-text-primary transition-colors hover:border-ui-text-subtle hover:bg-ui-surface-muted active:scale-[0.98] disabled:opacity-70"
            >
              <UserRound className="size-6 shrink-0 text-ui-text-muted" />
              {isGuestLoading ? '입장 중...' : '게스트로 시작'}
            </button>
            <p className="text-[0.75rem] font-medium text-ui-text-subtle">
              * 게스트는 전적이 저장되지 않으며 일부 기능이 제한됩니다.
            </p>
          </div>
        </motion.section>

        <section className="grid w-full max-w-[980px] grid-cols-1 gap-4 md:grid-cols-3">
          {featureCards.map((card, index) => {
            const Icon = card.icon

            return (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.15 + index * 0.12,
                  ease: [0.18, 0.9, 0.28, 1],
                }}
                className="group relative overflow-hidden rounded-[28px] border border-ui-border/90 bg-ui-surface/96 px-6 py-5 text-center shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
              >
                <div
                  className={`relative mx-auto mb-3 flex size-11 items-center justify-center rounded-xl ${card.iconBackground}`}
                >
                  <Icon className="size-5 text-white" strokeWidth={2} />
                </div>
                <h2 className="text-[1.125rem] font-bold text-ui-text-primary">
                  {card.title}
                </h2>
                <p className="mt-1.5 text-[0.875rem] font-medium text-ui-text-muted">
                  {card.description}
                </p>
              </motion.article>
            )
          })}
        </section>
      </main>
    </div>
  )
}

export default HomePage
