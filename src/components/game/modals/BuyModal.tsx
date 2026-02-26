import React from 'react'

interface BuyModalProps {
  open: boolean
  cityName?: string
  purchaseCostText?: string
  tollText?: string
  onPass?: () => void
  onBuy?: () => void
}

const DEFAULT_CITY_NAME = '대구'
const DEFAULT_PURCHASE_COST_TEXT = '6칸'
const DEFAULT_TOLL_TEXT = '6칸'

const BuyModal: React.FC<BuyModalProps> = ({
  open,
  cityName = DEFAULT_CITY_NAME,
  purchaseCostText = DEFAULT_PURCHASE_COST_TEXT,
  tollText = DEFAULT_TOLL_TEXT,
  onPass,
  onBuy,
}) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-11 shadow-2xl">
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#CFE1FF] bg-[#EFF5FF] text-[44px]">
          <span role="img" aria-label="도시">
            🏠
          </span>
        </div>

        <h2 className="mb-4 text-center text-[54px] font-black tracking-tight text-[#1F2A44]">
          도시 구매
        </h2>

        <p className="text-center text-[36px] font-extrabold leading-[1.3] text-[#5A6D8A]">
          <span className="text-[#245FE5]">{cityName}</span>{' '}
          <span>({purchaseCostText})을(를)</span>
          <br />
          <span>구매하시겠습니까?</span>
        </p>

        <p className="mb-10 mt-4 text-center text-[32px] font-bold leading-[1.35] text-[#5A6D8A]">
          건설 후 통행료는 {tollText} 입니다
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
            className="h-18.5 w-46.5 rounded-[22px] bg-[#245FE5] text-[34px] font-black tracking-tight text-white shadow-lg transition-colors hover:bg-[#1F56D1]"
          >
            구매하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default BuyModal
