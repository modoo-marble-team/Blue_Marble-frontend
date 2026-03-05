import React from 'react'
import { LEVEL_MODAL_ICONS } from '../../board/board.constants'

interface CityAcquisitionModalProps {
  open: boolean
  cityName?: string
  ownerName?: string
  purchaseCostText?: string
  currentLevel?: number
  onCancel?: () => void
  onAcquire?: () => void
}

const CityAcquisitionModal: React.FC<CityAcquisitionModalProps> = ({
  open,
  ownerName = '',
  purchaseCostText = '0',
  currentLevel = 0,
  onCancel,
  onAcquire,
}) => {
  if (!open) {
    return null
  }

  const iconSrc = LEVEL_MODAL_ICONS[currentLevel] || '/BuyModal-land.svg'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-11 shadow-2xl">
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#CFE1FF] bg-[#EFF5FF]">
          <img src={iconSrc} alt="도시" className="w-14 h-14 object-contain" />
        </div>

        <h2 className="mb-4 text-center text-[40px] font-black tracking-tight text-[#1F2A44]">
          {ownerName}님의 도시 인수
        </h2>

        <div className="text-center mb-10">
          <p className="text-[28px] font-extrabold text-[#245FE5] leading-tight">
            구매비용 ({purchaseCostText})
          </p>
          <p className="text-[24px] font-bold text-[#5A6D8A] mt-2">
            상대의 도시를 뺏어옵니다
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-15 w-36 rounded-[22px] bg-[#E6EBF3] text-[24px] font-black tracking-tight text-[#5E708D] transition-colors hover:bg-[#DDE4EE]"
          >
            취소
          </button>

          <button
            type="button"
            onClick={onAcquire}
            className="h-15 w-44 rounded-[22px] bg-[#245FE5] text-[24px] font-black tracking-tight text-white shadow-[0_12px_24px_rgba(36,95,229,0.3)] transition-colors hover:bg-[#1F56D1]"
          >
            인수하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default CityAcquisitionModal
