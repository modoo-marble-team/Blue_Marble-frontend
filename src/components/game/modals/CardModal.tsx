import React from 'react'

type CardModalVariant = 'EVENT' | 'CHANCE'

interface CardModalProps {
  open: boolean
  variant?: CardModalVariant
  title?: string
  descriptionLine1?: string
  descriptionLine2?: string
  highlightText?: string
  confirmLabel?: string
  onConfirm?: () => void
}

const DEFAULT_EVENT_TITLE = '이벤트 카드'
const DEFAULT_CHANCE_TITLE = '찬스 카드'
const DEFAULT_EVENT_DESC_1 = '이런 ㅠㅠㅠㅠ'
const DEFAULT_EVENT_DESC_2 = '당신은 무인도로 가게 됩니다'
const DEFAULT_CHANCE_DESC_1 = '주사위를 못 굴립니다'
const DEFAULT_CHANCE_DESC_2 = ''
const DEFAULT_CONFIRM_LABEL = '확인하기'

const CardModal: React.FC<CardModalProps> = ({
  open,
  variant = 'EVENT',
  title,
  descriptionLine1,
  descriptionLine2,
  highlightText = '무인도',
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  onConfirm,
}) => {
  if (!open) {
    return null
  }

  const resolvedTitle =
    title ?? (variant === 'EVENT' ? DEFAULT_EVENT_TITLE : DEFAULT_CHANCE_TITLE)
  const resolvedDescriptionLine1 =
    descriptionLine1 ??
    (variant === 'EVENT' ? DEFAULT_EVENT_DESC_1 : DEFAULT_CHANCE_DESC_1)
  const resolvedDescriptionLine2 =
    descriptionLine2 ??
    (variant === 'EVENT' ? DEFAULT_EVENT_DESC_2 : DEFAULT_CHANCE_DESC_2)

  const [prefixText, suffixText] = resolvedDescriptionLine2.split(highlightText)
  const hasHighlightText = resolvedDescriptionLine2.includes(highlightText)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-11 pt-12 shadow-2xl">
        <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-3xl bg-[#FFF3E5]">
          {variant === 'EVENT' ? (
            <img
              src="/chance-box.svg"
              alt="이벤트 카드 아이콘"
              className="h-24 w-24"
            />
          ) : (
            <img
              src="/event-question.svg"
              alt="찬스 카드 아이콘"
              className="h-24 w-24"
            />
          )}
        </div>
        <h2 className="mb-5 text-center text-[40px] font-black tracking-tight text-[#1F2A44]">
          {resolvedTitle}
        </h2>
        <p className="text-center text-[22px] font-bold leading-[1.35] text-[#5A6D8A]">
          {resolvedDescriptionLine1}
          {resolvedDescriptionLine2 ? (
            <>
              <br />
              {hasHighlightText ? (
                <>
                  {prefixText}
                  <span className="text-[#E53935]">{highlightText}</span>
                  {suffixText}
                </>
              ) : (
                resolvedDescriptionLine2
              )}
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-10 h-18.5 w-full rounded-[22px] bg-[#245FE5] text-[24px] font-black tracking-tight text-white shadow-lg transition-colors hover:bg-[#1F56D1]"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

export default CardModal
