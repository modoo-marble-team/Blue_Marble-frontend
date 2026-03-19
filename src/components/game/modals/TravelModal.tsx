import React from 'react'

interface TravelModalProps {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  showCancel?: boolean
  onConfirm?: () => void
  onCancel?: () => void
}

const DEFAULT_TITLE = '국내여행'
const DEFAULT_DESCRIPTION = '원하는 도시를 클릭하여 이동할 수 있습니다'
const DEFAULT_CONFIRM_LABEL = '확인'

const TravelModal: React.FC<TravelModalProps> = ({
  open,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  showCancel = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)]">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-11 shadow-2xl">
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#CFE1FF] bg-[#EFF5FF]">
          <img
            src="/Travel- airplane.svg"
            alt="국내여행 아이콘"
            className="h-16 w-16"
          />
        </div>

        <h2 className="mb-5 text-center text-[56px] font-black tracking-tight text-[#1F2A44]">
          {title}
        </h2>

        <p className="break-keep px-1 text-center text-[16px] font-bold leading-[1.45] text-[#5A6D8A]">
          {description}
        </p>

        <button
          type="button"
          onClick={onConfirm}
          className="mx-auto mt-10 flex h-18.5 w-full max-w-102 items-center justify-center rounded-[22px] bg-[#245FE5] text-[24px] font-black tracking-tight text-white shadow-[0_12px_24px_rgba(36,95,229,0.3)] transition-colors hover:bg-[#1F56D1]"
        >
          {confirmLabel}
        </button>

        {showCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mx-auto mt-3 flex h-18.5 w-full max-w-102 items-center justify-center rounded-[22px] border border-[#D0D7E2] bg-white text-[24px] font-black tracking-tight text-[#5A6D8A] transition-colors hover:bg-[#F8FAFC]"
          ></button>
        )}
      </div>
    </div>
  )
}

export default TravelModal
