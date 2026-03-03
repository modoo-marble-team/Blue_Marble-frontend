import React from 'react'

interface DiceTimerModalProps {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  onConfirm?: () => void
}

const DEFAULT_TITLE =
  '\uC774\uB7F0... \uC2DC\uAC04\uC774 \uB2E4\uB410\uB124\uC694'
const DEFAULT_DESCRIPTION =
  '\uC790\uB3D9\uC73C\uB85C \uD134\uC774 \uC885\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4'
const DEFAULT_CONFIRM_LABEL = '\uD655\uC778'

const DiceIcon: React.FC = () => (
  <svg
    width="75"
    height="75"
    viewBox="0 0 75 75"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M16.3826 74.1027L74.1027 57.7201L57.72 -1.4408e-05L-7.87476e-05 16.3826L16.3826 74.1027Z"
      fill="#0F172B"
    />
  </svg>
)

const DiceTimerModal: React.FC<DiceTimerModalProps> = ({
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
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-13 shadow-2xl">
        <div className="mb-7 flex justify-center">
          <DiceIcon />
        </div>

        <h2 className="text-center text-[50px] font-black tracking-tight text-[#1F2A44]">
          {title}
        </h2>

        <p className="mb-10 mt-5 text-center text-[22px] font-bold leading-[1.35] text-[#5A6D8A]">
          {description}
        </p>

        <button
          type="button"
          onClick={onConfirm}
          className="mx-auto flex h-15 w-full max-w-102 items-center justify-center rounded-[22px] bg-[#245FE5] text-[24px] font-black tracking-tight text-white shadow-[0_12px_24px_rgba(36,95,229,0.3)] transition-colors hover:bg-[#1F56D1]"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

export default DiceTimerModal
