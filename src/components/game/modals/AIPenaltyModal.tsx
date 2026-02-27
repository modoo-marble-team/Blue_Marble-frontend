import React from 'react'

interface AIPenaltyModalProps {
  open: boolean
  status?: 'loading' | 'result' | 'error'
  title?: string
  description?: string
  resultDescription?: string
  errorDescription?: string
  confirmLabel?: string
  loadingLabel?: string
  errorConfirmLabel?: string
  onConfirm?: () => void
}

const DEFAULT_TITLE = 'AI 칸'
const DEFAULT_LOADING_DESCRIPTION = '생각중...'
const DEFAULT_RESULT_DESCRIPTION = '결과를 확인하세요.'
const DEFAULT_ERROR_DESCRIPTION = '결과를 불러오지 못했습니다.'
const DEFAULT_CONFIRM_LABEL = '확인하기'
const DEFAULT_LOADING_LABEL = '잠시만 기다려주세요'
const DEFAULT_ERROR_CONFIRM_LABEL = '다시 시도'

const AIPenaltyModal: React.FC<AIPenaltyModalProps> = ({
  open,
  status = 'loading',
  title = DEFAULT_TITLE,
  description,
  resultDescription = DEFAULT_RESULT_DESCRIPTION,
  errorDescription = DEFAULT_ERROR_DESCRIPTION,
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  loadingLabel = DEFAULT_LOADING_LABEL,
  errorConfirmLabel = DEFAULT_ERROR_CONFIRM_LABEL,
  onConfirm,
}) => {
  if (!open) {
    return null
  }

  const resolvedDescription =
    status === 'loading'
      ? (description ?? DEFAULT_LOADING_DESCRIPTION)
      : status === 'error'
        ? errorDescription
        : resultDescription

  const resolvedConfirmLabel =
    status === 'loading'
      ? loadingLabel
      : status === 'error'
        ? errorConfirmLabel
        : confirmLabel

  const isLoading = status === 'loading'
  const isError = status === 'error'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-11 shadow-2xl">
        <div
          className={`mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border ${
            isError
              ? 'border-[#FFE0DF] bg-[#FFF2F1]'
              : 'border-[#CFE1FF] bg-[#EFF5FF]'
          }`}
        >
          <img src="/ai-head.png" alt="AI 아이콘" className="h-16 w-16" />
        </div>

        <h2 className="mb-9 text-center text-[40px] font-black tracking-tight text-[#1F2A44]">
          {title}
        </h2>

        <p
          className={`text-center text-[22px] font-bold leading-[1.35] ${
            isError ? 'text-[#EF5350]' : 'text-[#5A6D8A]'
          }`}
        >
          {resolvedDescription}
        </p>

        <button
          type="button"
          onClick={onConfirm}
          className={`mx-auto mt-10 flex h-18.5 w-full max-w-102 items-center justify-center rounded-[22px] text-[24px] font-black tracking-tight text-white shadow-lg transition-colors ${
            isLoading
              ? 'bg-[#8DA7E9] cursor-not-allowed'
              : isError
                ? 'bg-[#EF5350] hover:bg-[#E34A47]'
                : 'bg-[#245FE5] hover:bg-[#1F56D1]'
          }`}
          disabled={isLoading}
        >
          {resolvedConfirmLabel}
        </button>
      </div>
    </div>
  )
}

export default AIPenaltyModal

