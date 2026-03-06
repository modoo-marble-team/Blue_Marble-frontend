import React, { useState, useEffect } from 'react'

interface GoToIslandModalProps {
  open: boolean
  onConfirm?: () => void
}

const GoToIslandModal: React.FC<GoToIslandModalProps> = ({
  open,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-11 pt-12 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-3xl bg-[#FFF3E5] text-[64px]">
          <span role="img" aria-label="경찰">
            👮
          </span>
        </div>

        {/* Title */}
        <h2 className="mb-5 text-center text-[40px] font-black tracking-tight text-[#1F2A44]">
          당신은 무인도로 가세요
        </h2>

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

export default GoToIslandModal
