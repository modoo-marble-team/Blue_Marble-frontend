import React from 'react'

interface AIPenaltyModalProps {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  onConfirm?: () => void
}

const DEFAULT_TITLE = 'AI 칸'
const DEFAULT_DESCRIPTION = '생각중...'
const DEFAULT_CONFIRM_LABEL = '확인하기'

const AIPenaltyModal: React.FC<AIPenaltyModalProps> = ({
  open,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  onConfirm,
}) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-11 shadow-2xl">
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#CFE1FF] bg-[#EFF5FF]">
          <img src="/ai-head.png" alt="AI 아이콘" className="h-16 w-16" />
        </div>

        <h2 className="mb-9 text-center text-[40px] font-black tracking-tight text-[#1F2A44]">
          {title}
        </h2>

        <p className="text-center text-[22px] font-bold leading-[1.35] text-[#5A6D8A]">
          {description}
        </p>

        <button
          type="button"
          onClick={onConfirm}
          className="mx-auto mt-10 flex h-18.5 w-full max-w-102 items-center justify-center rounded-[22px] bg-[#245FE5] text-[24px] font-black tracking-tight text-white shadow-lg transition-colors hover:bg-[#1F56D1]"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

export default AIPenaltyModal

