import {
  Gamepad2,
  MessageCircle,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import {
  getAuthErrorMessage,
  loginAsGuest,
  startKakaoLogin,
} from '../features/auth/api/api'
import { useAuthStore } from '../features/auth/session/store'

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
  const setSession = useAuthStore((state) => state.setSession)

  const [isKakaoLoading, setIsKakaoLoading] = useState(false)
  const [isGuestLoading, setIsGuestLoading] = useState(false)

  const isAnyLoading = isKakaoLoading || isGuestLoading

  // 카카오 로그인 결과에 따라 닉네임 설정/로비로 분기 이동
  async function handleKakaoLogin() {
    if (import.meta.env.DEV) {
      toast.error('카카오 로그인은 배포 환경에서만 테스트 가능합니다.')
      return
    }

    setIsKakaoLoading(true)
    try {
      const kakaoSession = await startKakaoLogin()

      if (!kakaoSession) {
        return
      }

      setSession(kakaoSession)
      navigate(kakaoSession.needsNicknameSetup ? '/nickname-setup' : '/lobby', {
        replace: true,
      })
    } catch (error) {
      toast.error(
        getAuthErrorMessage(error, '카카오 로그인 시작에 실패했습니다.')
      )
    } finally {
      setIsKakaoLoading(false)
    }
  }

  // 게스트 세션을 발급받아 로비로 바로 이동
  async function handleGuestLogin() {
    setIsGuestLoading(true)
    try {
      const guestSession = await loginAsGuest()
      setSession(guestSession)
      navigate('/lobby', { replace: true })
    } catch (error) {
      toast.error(getAuthErrorMessage(error, '게스트 로그인에 실패했습니다.'))
    } finally {
      setIsGuestLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ui-app-bg px-4 py-5 sm:px-8 sm:py-6 lg:py-8">
      {/* 브랜드 중심을 받쳐주는 배경 레이어 */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/HomePage_background.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.24),transparent_28%),linear-gradient(180deg,rgba(250,248,240,0.1),rgba(250,248,240,0.08))]" />
      </div>

      <main className="relative mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-6xl flex-col items-center justify-center gap-8 sm:min-h-[calc(100dvh-3rem)] lg:min-h-[calc(100dvh-4rem)] lg:gap-10">
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: [0.18, 0.9, 0.28, 1] }}
          className="w-full max-w-4xl text-center"
        >
          <h1 className="select-none text-[clamp(3.2rem,8vw,5.8rem)] font-extrabold leading-[0.92] tracking-tight text-ui-text-strong">
            <span className="ui-brand-solid-3d-hero text-ui-text-strong">
              MARBLE
            </span>
            <span className="ui-brand-gradient-3d-hero ml-1.5 bg-linear-to-r from-ui-brand-strong via-ui-brand to-[#0ea5e9] bg-clip-text text-transparent sm:ml-2">
              POP
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-md select-none whitespace-pre-line text-[clamp(1rem,1.8vw,1.22rem)] font-bold leading-relaxed text-ui-text-primary">
            {
              '주사위를 굴려 나만의 도시를 건설하세요!\n귀엽고 신나는 실시간 보드게임'
            }
          </p>

          <div className="mx-auto mt-7 flex w-full max-w-[430px] flex-col gap-3">
            <button
              type="button"
              onClick={handleKakaoLogin}
              disabled={isAnyLoading}
              className="flex h-14 select-none items-center justify-center gap-2.5 rounded-2xl bg-[#ffe812] py-3 text-[1.125rem] font-bold text-[#191919] shadow-[0_6px_14px_rgba(15,23,42,0.08)] transition-all hover:bg-[#f5dc00] hover:shadow-[0_8px_18px_rgba(15,23,42,0.1)] active:scale-[0.98] disabled:opacity-70"
            >
              <MessageCircle className="size-6 shrink-0 fill-[#191919]" />
              {isKakaoLoading ? '로그인 중...' : '카카오 로그인으로 시작'}
            </button>
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isAnyLoading}
              className="flex h-14 select-none items-center justify-center gap-2.5 rounded-2xl border-2 border-ui-border bg-ui-surface/92 py-3 text-[1.125rem] font-bold text-ui-text-primary shadow-[0_4px_10px_rgba(15,23,42,0.03)] transition-colors hover:border-ui-text-subtle hover:bg-ui-surface-muted active:scale-[0.98] disabled:opacity-70"
            >
              <UserRound className="size-6 shrink-0 text-ui-text-muted" />
              {isGuestLoading ? '입장 중...' : '게스트로 시작'}
            </button>
            <p className="select-none pt-0.5 text-[0.75rem] font-medium text-ui-text-subtle">
              * 게스트는 전적이 저장되지 않으며 일부 기능이 제한됩니다.
            </p>
          </div>
        </motion.section>

        <section className="grid w-full max-w-[980px] grid-cols-1 gap-3.5 md:grid-cols-3">
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
                className="group relative overflow-hidden rounded-[28px] border border-ui-border/80 bg-ui-surface/88 px-5 py-4 text-center shadow-[0_3px_10px_rgba(15,23,42,0.03)] select-none"
              >
                <div
                  className={`relative mx-auto mb-2.5 flex size-10 items-center justify-center rounded-xl ${card.iconBackground}`}
                >
                  <Icon className="size-[1.15rem] text-white" strokeWidth={2} />
                </div>
                <h2 className="text-[0.95rem] font-bold text-ui-text-primary">
                  {card.title}
                </h2>
                <p className="mt-1 text-[0.84rem] font-medium text-ui-text-muted">
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
