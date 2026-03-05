import React from 'react'

interface GoToIslandModalProps {
  open: boolean
  onConfirm?: () => void
}

const GoToIslandModal: React.FC<GoToIslandModalProps> = ({
  open,
  onConfirm,
}) => {
  if (!open) {
    return null
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-11 shadow-2xl">
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#CFE1FF] bg-[#EFF5FF] text-[60px]">
          <span role="img" aria-label="경찰">
            👮
          </span>
        </div>
        <h2 className="mb-10 text-center text-[48px] font-black tracking-tight text-[#1F2A44] break-keep leading-tight">
          당신은 무인도로 가세요
        </h2>
        <button
          type="button"
          onClick={onConfirm}
          className="mx-auto flex h-15 w-full max-w-102 items-center justify-center rounded-[22px] bg-[#245FE5] text-[26px] font-black tracking-tight text-white shadow-lg transition-colors hover:bg-[#1F56D1]"
        >
          확인
        </button>
      </div>
    </div>
  )
}

export default GoToIslandModal
