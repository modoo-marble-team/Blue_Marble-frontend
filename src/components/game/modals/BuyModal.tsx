import React from 'react'

const LEVEL_LABEL: Record<number, string> = {
  0: '없음',
  1: '집 1채',
  2: '집 2채',
  3: '집 3채',
  4: '호텔',
  5: '랜드마크',
}

interface BuyModalProps {
  open: boolean
  cityName?: string
  purchaseCostText?: string
  isUpgrade?: boolean
  currentLevel?: number
  onPass?: () => void
  onBuy?: () => void
}

const DEFAULT_CITY_NAME = '대구'
const DEFAULT_PURCHASE_COST_TEXT = '6칸'

const BuyModal: React.FC<BuyModalProps> = ({
  open,
  cityName = DEFAULT_CITY_NAME,
  purchaseCostText = DEFAULT_PURCHASE_COST_TEXT,
  isUpgrade = false,
  currentLevel = 0,
  onPass,
  onBuy,
}) => {
  if (!open) {
    return null
  }

  const nextLevel = Math.min(currentLevel + 1, 5)
  const canUpgrade = currentLevel < 5

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-11 shadow-2xl">
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#CFE1FF] bg-[#EFF5FF] text-[44px]">
          <span role="img" aria-label="도시">
            🏠
          </span>
        </div>

        <h2 className="mb-4 text-center text-[54px] font-black tracking-tight text-[#1F2A44]">
          {isUpgrade ? '도시 업그레이드' : '도시 구매'}
        </h2>

        <p className="text-center text-[36px] font-extrabold leading-[1.3] text-[#5A6D8A] mb-10 mt-4">
          <span className="text-[#245FE5]">{cityName}</span>{' '}
          <span>({purchaseCostText})을(를)</span>
          <br />
          {isUpgrade ? (
            <span>
              {LEVEL_LABEL[currentLevel]} →{' '}
              <span className="text-[#245FE5]">{LEVEL_LABEL[nextLevel]}</span>
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
            className="h-18.5 w-39.5 rounded-[22px] bg-[#E6EBF3] text-[34px] font-black tracking-tight text-[#5E708D] transition-colors hover:bg-[#DDE4EE]"
          >
            패스
          </button>

          <button
            type="button"
            onClick={onBuy}
            disabled={isUpgrade && !canUpgrade}
            className="h-18.5 w-46.5 rounded-[22px] bg-[#245FE5] text-[34px] font-black tracking-tight text-white shadow-lg transition-colors hover:bg-[#1F56D1] disabled:opacity-40"
          >
            {isUpgrade ? '업그레이드' : '구매하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BuyModal
