import { useEffect } from 'react'
import {
  RULEBOOK_TOLL_LABELS,
  type GameRulebookCityRow,
  type GameRulebookTierSummary,
} from '../../../pages/game/gameRulebookModel'

interface GameRulebookModalProps {
  open: boolean
  tiers: GameRulebookTierSummary[]
  cityRows: GameRulebookCityRow[]
  onClose: () => void
}

const TILE_GUIDE_ROWS = [
  {
    label: '출발',
    description: '시작 지점입니다. 보드를 한 바퀴 돌면 보상을 받습니다.',
  },
  {
    label: '도시',
    description: '구매/건설 가능한 칸입니다. 상대가 오면 통행비를 받습니다.',
  },
  {
    label: '찬스',
    description: '이동/금액/추가 턴 등 카드 효과가 즉시 적용됩니다.',
  },
  { label: '이벤트', description: '긍정/부정 이벤트 카드가 발동합니다.' },
  { label: '여행', description: '원하는 칸으로 이동할 수 있는 특수 칸입니다.' },
  {
    label: '무인도/무인도로 이동',
    description: '무인도는 3턴 휴식 상태이며, 더블이 나오면 즉시 탈출합니다.',
  },
]

const TURN_FLOW_STEPS = [
  '주사위를 굴립니다.',
  '더블이면 더블 팝업 확인 후 추가 주사위 기회를 얻습니다.',
  '말이 이동하고 도착 칸 효과(구매/통행비/찬스/이벤트)를 처리합니다.',
  '처리가 끝나면 턴이 종료되고 다음 플레이어로 넘어갑니다.',
]

const GameRulebookModal = ({
  open,
  tiers,
  cityRows,
  onClose,
}: GameRulebookModalProps) => {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="게임 룰북"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-[0_30px_120px_rgba(15,23,42,0.35)]">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <h2 className="text-xl font-black text-[#1F2A44]">게임 룰북</h2>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">
              턴 진행, 칸 효과, 도시 가격/통행비/티어 정보를 확인하세요.
            </p>
          </div>
          <button
            type="button"
            aria-label="룰북 닫기"
            onClick={onClose}
            className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-sm font-bold text-[#334155] transition-colors hover:bg-[#F8FAFC]"
          >
            닫기
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] space-y-7 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="text-lg font-black text-[#1F2A44]">기본 규칙</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm font-medium leading-6 text-[#334155]">
              <li>목표: 최종 총자산이 가장 높은 플레이어가 승리합니다.</li>
              <li>파산 처리된 플레이어는 순위 계산에서 뒤로 밀립니다.</li>
              <li>
                턴 제한 시간(30초) 내 선택하지 않으면 자동 처리될 수 있습니다.
              </li>
            </ul>
            <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm font-medium leading-6 text-[#334155]">
              {TURN_FLOW_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="text-lg font-black text-[#1F2A44]">칸 종류 설명</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {TILE_GUIDE_ROWS.map((tileGuideRow) => (
                <div
                  key={tileGuideRow.label}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5"
                >
                  <p className="text-sm font-black text-[#1E293B]">
                    {tileGuideRow.label}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-[#475569]">
                    {tileGuideRow.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-black text-[#1F2A44]">도시 티어</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {tiers.map((tier) => (
                <span
                  key={tier.tier}
                  className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1 text-xs font-bold text-[#1D4ED8]"
                >
                  {tier.tierLabel}: {tier.basePriceDisplay}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-black text-[#1F2A44]">
              도시 가격 / 통행비 / 티어순
            </h3>
            <p className="mt-2 text-xs font-semibold text-[#64748B]">
              정렬 기준: 티어 높은 순(티어 1 → 5), 같은 티어 내 보드
              순서(tileId).
            </p>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-[#E2E8F0]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] text-[#334155]">
                  <tr>
                    <th className="px-3 py-2 font-black">티어</th>
                    <th className="px-3 py-2 font-black">도시명</th>
                    <th className="px-3 py-2 font-black">가격</th>
                    <th className="px-3 py-2 font-black">
                      통행비 (
                      {`${RULEBOOK_TOLL_LABELS.land}/${RULEBOOK_TOLL_LABELS.villa}/${RULEBOOK_TOLL_LABELS.hotel}/${RULEBOOK_TOLL_LABELS.landmark}`}
                      )
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cityRows.map((row) => (
                    <tr
                      key={row.tileId}
                      className="border-t border-[#EEF2F7] align-top text-[#1E293B]"
                    >
                      <td className="px-3 py-2.5 font-bold">{row.tierLabel}</td>
                      <td className="px-3 py-2.5 font-semibold">
                        {row.cityName}
                      </td>
                      <td className="px-3 py-2.5 font-semibold">
                        {row.priceDisplay}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold leading-5 text-[#334155]">
                        {RULEBOOK_TOLL_LABELS.land} {row.tollDisplay.land} /{' '}
                        {RULEBOOK_TOLL_LABELS.villa} {row.tollDisplay.villa} /{' '}
                        {RULEBOOK_TOLL_LABELS.hotel} {row.tollDisplay.hotel} /{' '}
                        {RULEBOOK_TOLL_LABELS.landmark}{' '}
                        {row.tollDisplay.landmark}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default GameRulebookModal
