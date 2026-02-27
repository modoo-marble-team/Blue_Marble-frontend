import React from 'react'

interface BankruptModalProps {
  open: boolean
  playerName?: string
  description?: string
  confirmLabel?: string
  onConfirm?: () => void
}

const DEFAULT_PLAYER_NAME = 'Player 3'
const DEFAULT_DESCRIPTION = '게임에서 탈락합니다.'
const DEFAULT_CONFIRM_LABEL = '확인하기'

const BankruptModal: React.FC<BankruptModalProps> = ({
  open,
  playerName = DEFAULT_PLAYER_NAME,
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
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#FFE0DF] bg-[#FFF2F1]">
          <svg
            width="55"
            height="50"
            viewBox="0 0 31 27"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="파산"
            role="img"
          >
            <path
              d="M1.42577 26.586C1.15277 26.586 0.911268 26.5212 0.701268 26.3917C0.491268 26.2622 0.327935 26.0913 0.211268 25.879C0.0852679 25.6702 0.0152681 25.4444 0.00126813 25.2017C-0.0103986 24.9579 0.0584348 24.7123 0.207768 24.465L13.9803 0.707C14.1296 0.459666 14.3093 0.28 14.5193 0.168C14.7293 0.0559995 14.9579 0 15.2053 0C15.4526 0 15.6807 0.0559995 15.8895 0.168C16.0984 0.28 16.278 0.459666 16.4285 0.707L30.2028 24.465C30.3521 24.7123 30.4204 24.9573 30.4075 25.2C30.3959 25.445 30.3258 25.6713 30.1975 25.879C30.0809 26.0913 29.9175 26.2622 29.7075 26.3917C29.4975 26.5212 29.2566 26.586 28.9848 26.586H1.42577ZM15.2053 22.414C15.5109 22.414 15.767 22.3107 15.9735 22.1042C16.18 21.8977 16.2827 21.6417 16.2815 21.336C16.2804 21.0303 16.1771 20.7748 15.9718 20.5695C15.7664 20.3642 15.5109 20.2603 15.2053 20.258C14.8996 20.2557 14.6441 20.3589 14.4388 20.5678C14.2334 20.7766 14.1302 21.0327 14.129 21.336C14.1279 21.6393 14.2311 21.8954 14.4388 22.1042C14.6464 22.3131 14.9019 22.4163 15.2053 22.414ZM15.2053 18.5098C15.4549 18.5098 15.6632 18.4258 15.83 18.2578C15.9969 18.0898 16.0803 17.8821 16.0803 17.6348V10.6348C16.0803 10.3863 15.9963 10.178 15.8283 10.01C15.6603 9.842 15.452 9.75858 15.2035 9.75975C14.955 9.76092 14.7474 9.84433 14.5805 10.01C14.4137 10.1757 14.3303 10.3839 14.3303 10.6348V17.6348C14.3303 17.8821 14.4143 18.0898 14.5823 18.2578C14.7503 18.4258 14.9585 18.5098 15.207 18.5098"
              fill="#CC0A0A"
            />
          </svg>
        </div>

        <h2 className="mb-4 text-center text-[44px] font-black tracking-tight text-[#1F2A44]">
          파산
        </h2>

        <p className="whitespace-nowrap text-center text-[22px] font-extrabold leading-[1.35] text-[#5A6D8A]">
          <span className="text-[#EF5350]">{playerName}</span>님이 파산했습니다.
        </p>

        <p className="mb-10 mt-4 text-center text-[20px] font-bold leading-[1.35] text-[#5A6D8A]">
          {description}
        </p>

        <button
          type="button"
          onClick={onConfirm}
          className="mx-auto flex h-15 w-full max-w-102 items-center justify-center rounded-[22px] bg-[#245FE5] text-[24px] font-black tracking-tight text-white shadow-lg transition-colors hover:bg-[#1F56D1]"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

export default BankruptModal
