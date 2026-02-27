import { CheckCircle2, Clock3, Crown, UserRound } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { WaitingRoomSeat } from '../types'

interface WaitingSeatCardProps {
  seat: WaitingRoomSeat | null
}

export function WaitingSeatCard({ seat }: WaitingSeatCardProps) {
  if (!seat) {
    return (
      <article className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-[34px] border-[3px] border-dashed border-ui-border/80 bg-ui-app-bg text-ui-text-subtle">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full border-4 border-ui-border bg-ui-surface-soft">
          <UserRound className="size-9" />
        </div>
        <p className="text-4xl font-extrabold tracking-tight text-ui-text-subtle">
          빈 자리
        </p>
      </article>
    )
  }

  return (
    <article className="relative flex h-full min-h-[260px] flex-col rounded-[34px] border border-ui-border bg-ui-surface px-7 py-7 shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
      <div
        className="relative mx-auto mb-5 flex size-32 items-center justify-center rounded-full text-5xl font-extrabold text-white shadow-[inset_0_-5px_0_rgba(0,0,0,0.2)]"
        style={{ backgroundColor: seat.avatarColor }}
      >
        {seat.nickname.slice(0, 1).toUpperCase()}

        {seat.isHost ? (
          <span className="absolute -left-2 top-2 inline-flex size-12 items-center justify-center rounded-full border-[3px] border-white bg-[#f7c600] text-white shadow-md">
            <Crown className="size-6 fill-white" />
          </span>
        ) : null}
      </div>

      <p className="truncate text-center text-[3rem] font-extrabold tracking-tight text-ui-text-strong">
        {seat.nickname}
        {seat.isMe ? (
          <span className="ml-2 rounded-lg bg-ui-surface-soft px-2 py-0.5 text-xl font-semibold text-ui-text-subtle">
            나
          </span>
        ) : null}
      </p>

      <div className="mt-auto flex justify-end">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-2xl font-bold',
            seat.isReady
              ? 'border-ui-tag-waiting-bg bg-ui-tag-waiting-bg text-ui-tag-waiting-text'
              : 'border-ui-border bg-ui-surface-soft text-ui-text-subtle'
          )}
        >
          {seat.isReady ? (
            <CheckCircle2 className="size-6" />
          ) : (
            <Clock3 className="size-6" />
          )}
          {seat.isReady ? '준비완료' : '대기중'}
        </span>
      </div>
    </article>
  )
}
