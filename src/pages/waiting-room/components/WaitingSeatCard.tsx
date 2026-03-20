import { CheckCircle2, Clock3, Crown, UserRound } from 'lucide-react'
import { Avatar } from '../../../components/avatar/Avatar'
import { cn } from '../../../lib/utils'
import type { WaitingRoomSeat } from '../api/types'

// 좌석 카드 렌더링 입력값 타입
interface WaitingSeatCardProps {
  seat: WaitingRoomSeat | null
}

// 플레이어 좌석 또는 빈 좌석 카드를 렌더링
export function WaitingSeatCard({ seat }: WaitingSeatCardProps) {
  // 좌석 데이터가 없으면 빈 자리 플레이스홀더를 렌더링
  if (!seat) {
    return (
      <article className="flex h-full min-h-[260px] select-none flex-col items-center justify-center rounded-[34px] border-[3px] border-dashed border-ui-border/70 bg-ui-surface/40 text-ui-text-subtle">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full border-4 border-ui-border/80 bg-ui-surface/55">
          <UserRound className="size-9" />
        </div>
        <p className="text-4xl font-extrabold tracking-tight text-ui-text-subtle">
          빈 자리
        </p>
      </article>
    )
  }

  return (
    <article className="relative flex h-full min-h-[260px] select-none flex-col rounded-[34px] border border-ui-border bg-ui-surface px-7 py-7 shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative mb-5">
          <Avatar
            size="xl"
            displayName={seat.nickname}
            backgroundColor={seat.avatarColor}
            className="text-white shadow-[inset_0_-5px_0_rgba(0,0,0,0.2)]"
          />

          {seat.isHost ? (
            <span className="absolute -left-2 top-2 inline-flex size-12 items-center justify-center rounded-full border-[3px] border-white bg-[#f7c600] text-white shadow-md">
              <Crown className="size-6 fill-white" />
            </span>
          ) : null}
        </div>

        <div className="flex w-full items-center justify-center gap-2">
          <p
            title={seat.nickname}
            className={cn(
              'block min-w-0 truncate text-center text-[2.25rem] font-extrabold tracking-tight text-ui-text-strong',
              seat.isMe ? 'max-w-[calc(100%-3.5rem)]' : 'max-w-full'
            )}
          >
            {seat.nickname}
          </p>
          {seat.isMe ? (
            <span className="shrink-0 rounded-lg bg-ui-surface-soft px-2 py-0.5 text-xl font-semibold text-ui-text-subtle">
              나
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex justify-end">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-2xl font-bold',
            // 준비 상태에 따라 배지 색상/문구를 분기
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
