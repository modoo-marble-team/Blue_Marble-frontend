import React from 'react'

import { LEVEL_LABELS, LEVEL_MODAL_ICONS } from '../../board/board.constants'

interface BuyModalProps {
  open: boolean
  cityName?: string
  purchaseCostText?: string
  isUpgrade?: boolean
  currentLevel?: number
  passLabel?: string
  buyLabel?: string
  isSubmitting?: boolean
  onPass?: () => void
  onBuy?: () => void
}

const DEFAULT_CITY_NAME = '대구'
const DEFAULT_PURCHASE_COST_TEXT = '6칸'
const DEFAULT_PASS_LABEL = '패스'
const DEFAULT_BUY_LABEL = '구매하기'

const BuyModal: React.FC<BuyModalProps> = ({
  open,
  cityName = DEFAULT_CITY_NAME,
  purchaseCostText = DEFAULT_PURCHASE_COST_TEXT,
  isUpgrade = false,
  currentLevel = 0,
  passLabel = DEFAULT_PASS_LABEL,
  buyLabel = DEFAULT_BUY_LABEL,
  isSubmitting = false,
  onPass,
  onBuy,
}) => {
  if (!open) {
    return null
  }

  const nextLevel = Math.min(currentLevel + 1, 7)
  const canUpgrade = currentLevel < 7

  const iconSrc = LEVEL_MODAL_ICONS[currentLevel] || '/BuyModal-land.svg'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)]">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-11 shadow-2xl">
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#CFE1FF] bg-[#EFF5FF]">
          <img src={iconSrc} alt="도시" className="w-14 h-14 object-contain" />
        </div>

        <h2 className="mb-4 text-center text-[54px] font-black tracking-tight text-[#1F2A44]">
          {isUpgrade ? '도시 업그레이드' : '토지 구매'}
        </h2>

        <p className="text-center text-[36px] font-extrabold leading-[1.3] text-[#5A6D8A] mb-10 mt-4">
          <span className="text-[#245FE5]">{cityName}</span>{' '}
          <span>({purchaseCostText})을(를)</span>
          <br />
          {isUpgrade ? (
            <span>
              {LEVEL_LABELS[currentLevel]} →{' '}
              <span className="text-[#245FE5]">{LEVEL_LABELS[nextLevel]}</span>
              {!canUpgrade && (
                <span className="text-[#EF5350]"> (최대 레벨)</span>
              )}
            </span>
          ) : (
            <span>구매하시겠습니까?</span>
          )}
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onPass}
            disabled={isSubmitting}
            className="h-18.5 w-39.5 rounded-[22px] bg-[#E6EBF3] text-[34px] font-black tracking-tight text-[#5E708D] transition-colors hover:bg-[#DDE4EE] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {passLabel}
          </button>

          <button
            type="button"
            onClick={onBuy}
            disabled={isSubmitting || (isUpgrade && !canUpgrade)}
            className="h-18.5 w-46.5 rounded-[22px] bg-[#245FE5] text-[34px] font-black tracking-tight text-white shadow-lg transition-colors hover:bg-[#1F56D1] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isUpgrade ? '업그레이드' : buyLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BuyModal
