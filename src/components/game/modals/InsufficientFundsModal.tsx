import React, { useState, useEffect } from 'react'
import { BuildingLevel, LEVEL_LABELS } from '../../board/board.constants'

interface InsufficientFundsModalProps {
  open: boolean
  buildingLevel?: BuildingLevel
  onConfirm?: () => void
}

const InsufficientFundsModal: React.FC<InsufficientFundsModalProps> = ({
  open,
  buildingLevel,
  onConfirm,
}) => {
  const [isVisible, setIsVisible] = useState(open)

  useEffect(() => {
    setIsVisible(open)
  }, [open])

  const handleConfirm = () => {
    setIsVisible(false)
    onConfirm?.()
  }

  if (!isVisible) {
    return null
  }

  const buildingName = LEVEL_LABELS[buildingLevel ?? 0] ?? '토지'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)]">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-11 pt-12 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-3xl bg-[#EEF3FF]">
          <img
            src="/Money.svg"
            alt="보유금 부족 아이콘"
            className="h-24 w-24"
          />
        </div>

        {/* Title */}
        <h2 className="mb-5 text-center text-[40px] font-black tracking-tight text-[#1F2A44]">
          보유금이 부족합니다
        </h2>

        {/* Description */}
        <p className="text-center text-[20px] font-bold leading-[1.35] text-[#5A6D8A]">
          {buildingName}을(를) 구매할 보유금이 부족합니다.
        </p>

        {/* Confirm Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-10 h-18.5 w-full rounded-[22px] bg-[#245FE5] text-[24px] font-black tracking-tight text-white shadow-lg transition-colors hover:bg-[#1F56D1]"
        >
          확인
        </button>
      </div>
    </div>
  )
}

export default InsufficientFundsModal
