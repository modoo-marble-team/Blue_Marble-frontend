import React from 'react'
import type { GlobalEffectState } from '../../types/domain'
import { GLOBAL_EFFECT_THEME_BY_TYPE } from './globalEffectTheme'

export interface GlobalEffectOverlayProps {
  activeEffect: GlobalEffectState | null
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

  const theme = GLOBAL_EFFECT_THEME_BY_TYPE[activeEffect.effect]

  return (
    <>
      {/* Inset board border shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        style={{
          boxShadow: `inset 0 0 0 4px ${theme.borderColor}`,
        }}
      />

      {/* Subtle overlay tint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
        style={{ backgroundColor: theme.overlayColor }}
      />

      {/* Top banner */}
      <div
        className="absolute inset-x-0 top-0 z-30 flex items-center justify-between rounded-t-[inherit] px-4 py-1.5"
        style={{
          backgroundColor: theme.bannerBgColor,
        }}
      >
        <span
          className="text-sm font-bold tracking-tight"
          style={{ color: theme.bannerTextColor }}
        >
          {theme.name} 효과 활성
        </span>
        <span
          className="rounded-full border px-2 py-0.5 text-xs font-semibold"
          style={{
            color: theme.bannerTextColor,
            borderColor: theme.tileBorderColor,
            backgroundColor: 'rgba(255,255,255,0.55)',
          }}
        >
          {activeEffect.duration}턴 남음
        </span>
      </div>
    </>
  )
}

export default GlobalEffectOverlay
