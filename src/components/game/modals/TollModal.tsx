import React from 'react'

interface TollModalProps {
  open: boolean
  cityName?: string
  ownerName?: string
  tollText?: string
  confirmLabel?: string
  onConfirm?: () => void
}

const DEFAULT_CITY_NAME = '대구'
const DEFAULT_OWNER_NAME = 'GoormEE'
const DEFAULT_TOLL_TEXT = '30M'
const DEFAULT_CONFIRM_LABEL = '확인하기'

const TollModal: React.FC<TollModalProps> = ({
  open,
  cityName = DEFAULT_CITY_NAME,
  ownerName = DEFAULT_OWNER_NAME,
  tollText = DEFAULT_TOLL_TEXT,
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  onConfirm,
}) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-11 shadow-2xl">
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#CFE1FF] bg-[#EFF5FF] text-[60px]">
          <span role="img" aria-label="통행료">
            💸
          </span>
        </div>

        <h2 className="mb-4 text-center text-[54px] font-black tracking-tight text-[#1F2A44]">
          통행료 지불
        </h2>

        <p className="text-center text-[28px] font-extrabold leading-[1.3] text-[#5A6D8A]">
          <span className="text-[#245FE5]">{cityName}</span> 도시에
          <br />
          도착했습니다.
        </p>

        <p className="mb-10 mt-4 text-center text-[24px] font-bold leading-[1.35] text-[#5A6D8A]">
          <span className="text-[#245FE5]">{ownerName}</span>님에게
          <br />
          <span className="text-[#EF5350]">{tollText}</span> 통행료를 지불합니다.
        </p>

        <button
          type="button"
          onClick={onConfirm}
          className="mx-auto flex h-15 w-full max-w-102 items-center justify-center rounded-[22px] bg-[#245FE5] text-[26px] font-black tracking-tight text-white shadow-lg transition-colors hover:bg-[#1F56D1]"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

export default TollModal
