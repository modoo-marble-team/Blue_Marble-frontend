import React from 'react'

interface DiceTimerModalProps {
  open: boolean
  title?: string
  description?: string
  timeLeftSec?: number | null
  confirmLabel?: string
  isSubmitting?: boolean
  onConfirm?: () => void
}

const DEFAULT_TITLE =
  '\uC774\uB7F0... \uC2DC\uAC04\uC774 \uB2E4\uB410\uB124\uC694'
const DEFAULT_DESCRIPTION =
  '\uC790\uB3D9\uC73C\uB85C \uD134\uC774 \uC885\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4'
const DEFAULT_CONFIRM_LABEL = '\uD655\uC778'

const DiceIcon: React.FC = () => {
  const renderPip = (className: string, color = '#202633') => (
    <span
      className={`absolute h-2.5 w-2.5 rounded-full ${className}`}
      style={{ backgroundColor: color }}
    />
  )

  return (
    <div className="relative h-27 w-33" aria-hidden="true">
      <div className="absolute left-0 top-5 h-18 w-18 rotate-[-14deg] rounded-[28px] bg-[linear-gradient(145deg,#FCFCFC_0%,#E3E3E3_100%)] shadow-[0_12px_20px_rgba(0,0,0,0.16)]">
        {renderPip('left-3.5 top-3.5')}
        {renderPip('right-3.5 bottom-3.5')}
        {renderPip('left-3.5 bottom-3.5')}
        {renderPip('right-3.5 top-1/2 -translate-y-1/2', '#EF5350')}
      </div>

      <div className="absolute right-0 top-1 h-18 w-18 rotate-18deg rounded-[28px] bg-[linear-gradient(145deg,#FCFCFC_0%,#DCDCDC_100%)] shadow-[0_12px_20px_rgba(0,0,0,0.16)]">
        {renderPip('left-3.5 top-3.5', '#EF5350')}
        {renderPip('left-3.5 bottom-3.5')}
        {renderPip('right-3.5 top-3.5')}
        {renderPip('right-3.5 bottom-3.5')}
      </div>
    </div>
  )
}

const DiceTimerModal: React.FC<DiceTimerModalProps> = ({
  open,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  timeLeftSec = null,
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  isSubmitting = false,
  onConfirm,
}) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-13 shadow-2xl">
        <div className="mb-7 flex justify-center">
          <DiceIcon />
        </div>

        <h2 className="text-center text-[35px] font-black tracking-tight text-[#1F2A44]">
          {title}
        </h2>

        <p className="mb-10 mt-5 text-center text-[22px] font-bold leading-[1.35] text-[#5A6D8A]">
          {description}
        </p>
        {typeof timeLeftSec === 'number' && (
          <p className="mb-8 text-center text-[18px] font-extrabold text-[#245FE5]">
            남은 시간: {Math.max(0, Math.ceil(timeLeftSec))}초
          </p>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="mx-auto flex h-15 w-full max-w-102 items-center justify-center rounded-[22px] bg-[#245FE5] text-[24px] font-black tracking-tight text-white shadow-[0_12px_24px_rgba(36,95,229,0.3)] transition-colors hover:bg-[#1F56D1] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

export default DiceTimerModal
