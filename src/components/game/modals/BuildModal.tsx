import {
  LEVEL_LABELS,
  LEVEL_MODAL_ICONS,
  BuildingLevel,
} from '../../board/board.constants'

interface BuildModalProps {
  open: boolean
  cityName?: string
  nextLevel?: BuildingLevel
  currentLevelLabel?: string
  nextLevelLabel?: string
  buildCostText?: string
  nextTollText?: string
  cancelLabel?: string
  confirmLabel?: string
  canBuild?: boolean
  onCancel?: () => void
  onConfirm?: () => void
}

const DEFAULT_CITY_NAME = '대구'
const DEFAULT_BUILD_COST_TEXT = '30M'
const DEFAULT_NEXT_TOLL_TEXT = '60M'
const DEFAULT_CANCEL_LABEL = '취소'
const DEFAULT_CONFIRM_LABEL = '건설하기'

const BuildModal: React.FC<BuildModalProps> = ({
  open,
  cityName = DEFAULT_CITY_NAME,
  nextLevel = 1,
  currentLevelLabel,
  nextLevelLabel,
  buildCostText = DEFAULT_BUILD_COST_TEXT,
  nextTollText = DEFAULT_NEXT_TOLL_TEXT,
  cancelLabel = DEFAULT_CANCEL_LABEL,
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  canBuild = true,
  onCancel,
  onConfirm,
}) => {
  if (!open) {
    return null
  }

  const currentLevel = Math.max(0, nextLevel - 1) as BuildingLevel
  const resolvedCurrentLevelLabel =
    currentLevelLabel ?? LEVEL_LABELS[currentLevel]
  const resolvedNextLevelLabel = nextLevelLabel ?? LEVEL_LABELS[nextLevel]

  const iconSrc = LEVEL_MODAL_ICONS[nextLevel] || '/BuyModal-house.svg'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.35)] backdrop-blur-sm">
      <div className="w-full max-w-105 rounded-[44px] bg-white px-10 pb-10 pt-11 shadow-2xl">
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#CFE1FF] bg-[#EFF5FF]">
          <img src={iconSrc} alt="건설" className="w-14 h-14 object-contain" />
        </div>

        <h2 className="mb-4 text-center text-[48px] font-black tracking-tight text-[#1F2A44]">
          {resolvedNextLevelLabel} 업그레이드
        </h2>

        <p className="text-center text-[24px] font-extrabold leading-[1.3] text-[#5A6D8A]">
          <span className="text-[#245FE5]">{cityName}</span> 도시를
          <br />
          업그레이드하시겠습니까?
        </p>

        <p className="mb-8 mt-4 text-center text-[20px] font-bold leading-[1.35] text-[#5A6D8A]">
          <span>{resolvedCurrentLevelLabel}</span>
          <span> → </span>
          <span className="text-[#245FE5]">{resolvedNextLevelLabel}</span>
          <br />
          건설 비용 <span className="text-[#EF5350]">{buildCostText}</span> ·
          다음 통행료 <span className="text-[#245FE5]">{nextTollText}</span>
        </p>

        {!canBuild ? (
          <p className="mb-6 text-center text-[20px] font-bold text-[#EF5350]">
            더 이상 건설할 수 없습니다.
          </p>
        ) : null}

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-15 w-full max-w-42 rounded-[22px] bg-[#E6EBF3] text-[24px] font-black tracking-tight text-[#5E708D] transition-colors hover:bg-[#DDE4EE]"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canBuild}
            className="h-15 w-full max-w-56 rounded-[22px] bg-[#245FE5] text-[24px] font-black tracking-tight text-white shadow-lg transition-colors hover:bg-[#1F56D1] disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BuildModal
