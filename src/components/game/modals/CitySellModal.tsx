import React, { useState, useEffect } from 'react'
import {
  BuildingLevel,
  LEVEL_LABELS,
  LEVEL_MODAL_ICONS,
} from '../../board/board.constants'

interface CitySellModalProps {
  open: boolean
  ownerName?: string
  sellPriceText?: string
  currentLevel?: BuildingLevel
  onCancel?: () => void
  onSell?: () => void
}

const CitySellModal: React.FC<CitySellModalProps> = ({
  open,
  ownerName = '',
  sellPriceText = '0',
  currentLevel = 0,
  onCancel,
  onSell,
}) => {
  const [isVisible, setIsVisible] = useState(open)

  useEffect(() => {
    setIsVisible(open)
  }, [open])

  const handleCancel = () => {
    setIsVisible(false)
    onCancel?.()
  }

  const handleSell = () => {
    setIsVisible(false)
    onSell?.()
  }

  if (!isVisible) {
    return null
  }

  const iconSrc = LEVEL_MODAL_ICONS[currentLevel] || '/BuyModal-land.svg'
  const buildingName = LEVEL_LABELS[currentLevel] ?? '토지'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-11 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#CFE1FF] bg-[#EFF5FF]">
          <img
            src={iconSrc}
            alt={buildingName}
            className="h-14 w-14 object-contain"
          />
        </div>

        {/* Title */}
        <h2 className="mb-4 text-center text-[40px] font-black tracking-tight text-[#1F2A44]">
          {ownerName} 님의 {buildingName} 처분
        </h2>

        {/* Description */}
        <div className="mb-10 text-center">
          <p className="text-[28px] font-extrabold leading-tight text-[#F5A623]">
            예상 수익 ({sellPriceText})
          </p>
          <p className="mt-2 text-[24px] font-bold text-[#5A6D8A]">
            매각 하시겠습니까?
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="h-15 w-36 rounded-[22px] bg-[#E6EBF3] text-[24px] font-black tracking-tight text-[#5E708D] transition-colors hover:bg-[#DDE4EE]"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleSell}
            className="h-15 w-44 rounded-[22px] bg-[#F5A623] text-[24px] font-black tracking-tight text-white shadow-[0_12px_24px_rgba(245,166,35,0.3)] transition-colors hover:bg-[#E09820]"
          >
            매각하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default CitySellModal
