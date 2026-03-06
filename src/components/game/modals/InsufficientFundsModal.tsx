import React, { useState, useEffect } from 'react'
import { BuildingLevel, LEVEL_LABELS } from '../../board/board.constants'

type CardModalVariant = 'EVENT' | 'CHANCE' | 'INSUFFICIENT_FUNDS'

interface CardModalProps {
  open: boolean
  variant?: CardModalVariant
  title?: string
  descriptionLine1?: string
  descriptionLine2?: string
  highlightText?: string
  confirmLabel?: string
  buildingLevel?: BuildingLevel
  onConfirm?: () => void
}

const DEFAULT_EVENT_TITLE = '이벤트 카드'
const DEFAULT_CHANCE_TITLE = '찬스 카드'
const DEFAULT_INSUFFICIENT_FUNDS_TITLE = '보유금이 부족합니다'

const DEFAULT_EVENT_DESC_1 = '이런 ㅠㅠㅠㅠ'
const DEFAULT_EVENT_DESC_2 = '당신은 무인도로 가게 됩니다'
const DEFAULT_CHANCE_DESC_1 = '주사위를 못 굴립니다'
const DEFAULT_CHANCE_DESC_2 = ''
const DEFAULT_INSUFFICIENT_FUNDS_DESC_1 = (buildingName: string) =>
  `${buildingName}을(를) 구매할 보유금이 부족합니다.`
const DEFAULT_INSUFFICIENT_FUNDS_DESC_2 = ''

const DEFAULT_CONFIRM_LABEL = '확인하기'
const DEFAULT_INSUFFICIENT_FUNDS_CONFIRM_LABEL = '확인'

const ICON_BG: Record<CardModalVariant, string> = {
  EVENT: 'bg-[#FFF3E5]',
  CHANCE: 'bg-[#FFF3E5]',
  INSUFFICIENT_FUNDS: 'bg-[#EEF3FF]',
}

const BUTTON_BG: Record<CardModalVariant, string> = {
  EVENT: 'bg-[#245FE5] hover:bg-[#1F56D1]',
  CHANCE: 'bg-[#245FE5] hover:bg-[#1F56D1]',
  INSUFFICIENT_FUNDS: 'bg-[#245FE5] hover:bg-[#1F56D1]',
}

const CardModal: React.FC<CardModalProps> = ({
  open,
  variant = 'EVENT',
  title,
  descriptionLine1,
  descriptionLine2,
  highlightText = '무인도',
  confirmLabel,
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

  const resolvedTitle =
    title ??
    (variant === 'EVENT'
      ? DEFAULT_EVENT_TITLE
      : variant === 'CHANCE'
        ? DEFAULT_CHANCE_TITLE
        : DEFAULT_INSUFFICIENT_FUNDS_TITLE)

  const resolvedDescriptionLine1 =
    descriptionLine1 ??
    (variant === 'EVENT'
      ? DEFAULT_EVENT_DESC_1
      : variant === 'CHANCE'
        ? DEFAULT_CHANCE_DESC_1
        : DEFAULT_INSUFFICIENT_FUNDS_DESC_1(
            LEVEL_LABELS[buildingLevel ?? 0] ?? '토지'
          ))

  const resolvedDescriptionLine2 =
    descriptionLine2 ??
    (variant === 'EVENT'
      ? DEFAULT_EVENT_DESC_2
      : variant === 'CHANCE'
        ? DEFAULT_CHANCE_DESC_2
        : DEFAULT_INSUFFICIENT_FUNDS_DESC_2)

  const resolvedConfirmLabel =
    confirmLabel ??
    (variant === 'INSUFFICIENT_FUNDS'
      ? DEFAULT_INSUFFICIENT_FUNDS_CONFIRM_LABEL
      : DEFAULT_CONFIRM_LABEL)

  const [prefixText, suffixText] = resolvedDescriptionLine2.split(highlightText)
  const hasHighlightText = resolvedDescriptionLine2.includes(highlightText)

  const iconBg = ICON_BG[variant]
  const buttonBg = BUTTON_BG[variant]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-11 pt-12 shadow-2xl">
        {/* Icon */}
        <div
          className={`mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-3xl ${iconBg}`}
        >
          {variant === 'EVENT' ? (
            <img
              src="/chance-box.svg"
              alt="이벤트 카드 아이콘"
              className="h-24 w-24"
            />
          ) : variant === 'CHANCE' ? (
            <img
              src="/event-question.svg"
              alt="찬스 카드 아이콘"
              className="h-24 w-24"
            />
          ) : (
            <img
              src="/money.svg"
              alt="보유금 부족 아이콘"
              className="h-24 w-24"
            />
          )}
        </div>

        {/* Title */}
        <h2 className="mb-5 text-center text-[40px] font-black tracking-tight text-[#1F2A44]">
          {resolvedTitle}
        </h2>

        {/* Description */}
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

        {/* Confirm Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className={`mt-10 h-18.5 w-full rounded-[22px] text-[24px] font-black tracking-tight text-white shadow-lg transition-colors ${buttonBg}`}
        >
          {resolvedConfirmLabel}
        </button>
      </div>
    </div>
  )
}

export default CardModal
