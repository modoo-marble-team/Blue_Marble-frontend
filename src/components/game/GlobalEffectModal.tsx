import React, { useEffect } from 'react'
import BaseModal from './modals/BaseModal'
import type { GlobalEffect } from '../game/GlobalEffectOverlay'

interface GlobalEffectChance {
  type: 'TOLL_MULTIPLIER' | 'PRICE_MULTIPLIER'
  effect: GlobalEffect
  duration: number
  multiplier: number
  description: string
}

export interface GlobalEffectModalProps {
  open: boolean
  chance: GlobalEffectChance | null
  onClose: () => void
}

const EFFECT_DISPLAY: Record<GlobalEffect, { icon: string; title: string }> = {
  PANDEMIC: { icon: '🦠', title: '전염병 확산' },
  FESTIVAL: { icon: '🎉', title: '축제 시작' },
  INFLATION: { icon: '📈', title: '인플레이션 발생' },
  DEFLATION: { icon: '📉', title: '디플레이션 발생' },
}

const AUTO_CLOSE_MS = 3000

/**
 * GlobalEffectModal
 *
 * Shows a popup when a global effect starts.
 * Auto-closes after 3 seconds.
 * Uses BaseModal for consistent styling.
 */
const GlobalEffectModal: React.FC<GlobalEffectModalProps> = ({
  open,
  chance,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      onClose()
    }, AUTO_CLOSE_MS)
    return () => clearTimeout(timer)
  }, [open, onClose])

  if (!chance) return null

  const display = EFFECT_DISPLAY[chance.effect]

  return (
    <BaseModal open={open} title={`${display.icon} ${display.title}`}>
      <p className="mb-4 text-sm leading-relaxed text-[#5A6D8A]">
        {chance.description}
      </p>
      <p className="text-sm font-semibold text-[#314158]">
        {chance.duration}턴 동안 지속됩니다
      </p>

      {/* Progress bar auto-close hint */}
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#245FE5] transition-all"
          style={{
            animation: `shrink ${AUTO_CLOSE_MS}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-xl bg-[#F1F4F9] py-2 text-sm font-semibold text-[#314158] transition-colors hover:bg-[#E3E8F0]"
      >
        닫기
      </button>
    </BaseModal>
  )
}

export default GlobalEffectModal
