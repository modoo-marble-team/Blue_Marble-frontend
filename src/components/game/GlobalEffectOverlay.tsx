import React from 'react'

export type GlobalEffect = 'PANDEMIC' | 'FESTIVAL' | 'INFLATION' | 'DEFLATION'

interface GlobalEffectState {
  type: 'TOLL_MULTIPLIER' | 'PRICE_MULTIPLIER'
  effect: GlobalEffect
  duration: number
  multiplier: number
  description: string
}

export interface GlobalEffectOverlayProps {
  activeEffect: GlobalEffectState | null
}

const EFFECT_CONFIG: Record<
  GlobalEffect,
  {
    label: string
    borderColor: string
    overlayColor: string
    tollTextClass: string
    badgeClass: string
  }
> = {
  PANDEMIC: {
    label: '전염병',
    borderColor: '#16a34a',
    overlayColor: 'rgba(22,163,74,0.06)',
    tollTextClass: 'text-green-600',
    badgeClass: 'bg-green-100 text-green-700',
  },
  FESTIVAL: {
    label: '축제',
    borderColor: '#d97706',
    overlayColor: 'rgba(217,119,6,0.06)',
    tollTextClass: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  INFLATION: {
    label: '인플레이션',
    borderColor: '#dc2626',
    overlayColor: 'rgba(220,38,38,0.06)',
    tollTextClass: 'text-red-600',
    badgeClass: 'bg-red-100 text-red-700',
  },
  DEFLATION: {
    label: '디플레이션',
    borderColor: '#2563eb',
    overlayColor: 'rgba(37,99,235,0.06)',
    tollTextClass: 'text-blue-600',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
}

/**
 * GlobalEffectOverlay
 *
 * Wrap this around your board container (position: relative required on parent).
 * It renders:
 *  - an inset box-shadow on the board border (via a zero-size absolute div)
 *  - a very subtle color overlay tint
 *  - a top banner with the effect name + remaining turns badge
 *
 * Toll text color tokens are exported separately as `EFFECT_TOLL_TEXT_CLASS`
 * so BoardTile can consume them without needing this component.
 */
const GlobalEffectOverlay: React.FC<GlobalEffectOverlayProps> = ({
  activeEffect,
}) => {
  if (!activeEffect) return null

  const cfg = EFFECT_CONFIG[activeEffect.effect]

  return (
    <>
      {/* Inset board border shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        style={{
          boxShadow: `inset 0 0 0 4px ${cfg.borderColor}`,
        }}
      />

      {/* Subtle overlay tint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
        style={{ backgroundColor: cfg.overlayColor }}
      />

      {/* Top banner */}
      <div
        className="absolute inset-x-0 top-0 z-30 flex items-center justify-between rounded-t-[inherit] px-4 py-1.5"
        style={{
          backgroundColor: cfg.borderColor,
        }}
      >
        <span className="text-sm font-bold tracking-tight text-white">
          {cfg.label} 효과 활성
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.badgeClass}`}
        >
          {activeEffect.duration}턴 남음
        </span>
      </div>
    </>
  )
}

export { EFFECT_CONFIG }
export default GlobalEffectOverlay
