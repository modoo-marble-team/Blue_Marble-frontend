import {
  Coins,
  Dice5,
  Gamepad2,
  MapPin,
  MessageCircle,
  Trophy,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'

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

function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ui-app-bg px-4 py-8 sm:px-8 sm:py-10">
      {/* 배경 반투명 아이콘 */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 4.8, ease: 'easeInOut' }}
          className="absolute left-[10%] top-[10%]"
        >
          <Dice5
            className="size-14 stroke-[1.5] text-ui-brand-soft opacity-60"
            strokeWidth={1.5}
          />
        </motion.div>
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [0, -6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 5.2,
            ease: 'easeInOut',
            delay: 0.3,
          }}
          className="absolute right-[10%] top-[12%]"
        >
          <Coins
            className="size-14 stroke-[1.5] text-ui-tag-playing-bg opacity-60"
            strokeWidth={1.5}
          />
        </motion.div>
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [0, -6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: 'easeInOut',
            delay: 0.45,
          }}
          className="absolute bottom-[12%] left-[8%]"
        >
          <MapPin
            className="size-20 stroke-[1.5] text-ui-tag-playing-bg opacity-80"
            strokeWidth={1.5}
          />
        </motion.div>
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [0, -6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 4.9,
            ease: 'easeInOut',
            delay: 0.6,
          }}
          className="absolute bottom-[12%] right-[8%]"
        >
          <Trophy
            className="size-20 stroke-[1.5] text-ui-tag-private-bg opacity-80"
            strokeWidth={1.5}
          />
        </motion.div>
      </div>

      <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col items-center justify-center gap-10">
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: [0.18, 0.9, 0.28, 1] }}
          className="text-center"
        >
          {/* 로고 영역: 빨간 핀 | 흰색 박스+주사위 | 노란 동전 */}
          <div className="relative mx-auto mb-6 flex items-center justify-center gap-4">
            <MapPin
              className="size-14 shrink-0 text-[#ff3f47] sm:size-16"
              strokeWidth={2}
            />
            <div className="flex size-28 items-center justify-center rounded-3xl border border-ui-border bg-ui-surface shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:size-32">
              <Dice5
                className="size-12 text-ui-brand sm:size-14"
                strokeWidth={2}
              />
            </div>
            <Coins
              className="size-12 shrink-0 text-[#efb309] sm:size-14"
              strokeWidth={2}
            />
          </div>

          <h1 className="text-[clamp(2.5rem,8vw,5rem)] font-extrabold leading-[0.95] tracking-tight text-ui-text-strong">
            <span className="text-ui-text-strong">MARBLE</span>
            <span className="ml-1.5 bg-linear-to-r from-[#a78bfa] via-[#8b5cf6] to-[#7c3aed] bg-clip-text text-transparent sm:ml-2">
              POP
            </span>
          </h1>

          <p className="mt-5 whitespace-pre-line text-[clamp(1rem,1.8vw,1.25rem)] font-bold leading-relaxed text-ui-text-primary">
            {
              '주사위를 굴려 나만의 도시를 건설하세요!\n귀엽고 신나는 실시간 보드게임'
            }
          </p>

          <div className="mx-auto mt-8 flex w-full max-w-[380px] flex-col gap-3">
            <button
              type="button"
              className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-[#ffe812] py-3 text-[1.125rem] font-bold text-[#191919] shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all hover:bg-[#f5dc00] active:scale-[0.98]"
            >
              <MessageCircle className="size-6 shrink-0 fill-[#191919]" />
              카카오 로그인으로 시작
            </button>
            <button
              type="button"
              className="flex h-14 items-center justify-center gap-2.5 rounded-2xl border-2 border-ui-border bg-ui-surface py-3 text-[1.125rem] font-bold text-ui-text-primary transition-colors hover:border-ui-text-subtle hover:bg-ui-surface-muted active:scale-[0.98]"
            >
              <UserRound className="size-6 shrink-0 text-ui-text-muted" />
              게스트로 시작
            </button>
          </div>

          <p className="mt-2.5 text-[0.75rem] font-medium text-ui-text-subtle">
            * 게스트는 전적이 저장되지 않으며 일부 기능이 제한됩니다.
          </p>
        </motion.section>

        <section className="grid w-full max-w-[960px] grid-cols-1 gap-5 md:grid-cols-3">
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
                className="rounded-3xl border border-ui-border bg-ui-surface px-6 py-6 text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
              >
                <div
                  className={`mx-auto mb-3 flex size-12 items-center justify-center rounded-xl ${card.iconBackground}`}
                >
                  <Icon className="size-6 text-white" strokeWidth={2} />
                </div>
                <h2 className="text-[1.25rem] font-bold text-ui-text-primary">
                  {card.title}
                </h2>
                <p className="mt-1.5 text-[0.9375rem] font-medium text-ui-text-muted">
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
