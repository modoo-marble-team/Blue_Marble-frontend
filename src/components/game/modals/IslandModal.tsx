import React, { useState, useEffect } from 'react'

interface IslandModalProps {
  open: boolean
  restTurns?: number | null
  onConfirm?: () => void
}

const IslandModal: React.FC<IslandModalProps> = ({
  open,
  restTurns = null,
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

  const description = `당신은 무인도에 갇혔습니다.\n${restTurns ?? 3}턴 동안 쉬거나, 주사위 더블 시 탈출합니다.`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2438]/30">
      <div className="flex w-[340px] flex-col items-center rounded-[32px] bg-white px-6 pb-8 pt-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
        {/* Icon */}
        <div className="mb-4 text-[72px] leading-none drop-shadow-md">
          <span role="img" aria-label="무인도">
            🏝️
          </span>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-[26px] font-black tracking-tight text-[#1F2A44]">
          무인도
        </h2>

        {/* Subtitle */}
        <p className="mb-8 text-[15px] font-medium tracking-tight text-[#6A788A]">
          {description}
        </p>

        {/* Confirm Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="h-[56px] w-full rounded-[18px] bg-[#1A5EFF] text-[18px] font-bold tracking-tight text-white transition-colors hover:bg-[#104EC8] active:scale-[0.98]"
        >
          확인
        </button>
      </div>
    </div>
  )
}

export default IslandModal
