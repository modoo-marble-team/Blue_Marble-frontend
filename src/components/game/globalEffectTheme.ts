import type { GlobalEffectType } from '../../types/domain'

export type GlobalEffectTheme = {
  name: string
  overlayColor: string
  borderColor: string
  bannerBgColor: string
  bannerTextColor: string
  tileBorderColor: string
  tollTextColor: string
}

export const GLOBAL_EFFECT_THEME_BY_TYPE: Record<
  GlobalEffectType,
  GlobalEffectTheme
> = {
  PANDEMIC: {
    name: '🦠 전염병 확산',
    overlayColor: 'rgba(29,158,117,0.07)',
    borderColor: '#1D9E75',
    bannerBgColor: '#E1F5EE',
    bannerTextColor: '#04342C',
    tileBorderColor: '#9FE1CB',
    tollTextColor: '#0F6E56',
  },
  FESTIVAL: {
    name: '🎉 축제 시작',
    overlayColor: 'rgba(239,159,39,0.07)',
    borderColor: '#EF9F27',
    bannerBgColor: '#FAEEDA',
    bannerTextColor: '#633806',
    tileBorderColor: '#FAC775',
    tollTextColor: '#BA7517',
  },
  INFLATION: {
    name: '📈 인플레이션 발생',
    overlayColor: 'rgba(226,75,74,0.06)',
    borderColor: '#E24B4A',
    bannerBgColor: '#FCEBEB',
    bannerTextColor: '#501313',
    tileBorderColor: '#F7C1C1',
    tollTextColor: '#A32D2D',
  },
  DEFLATION: {
    name: '📉 디플레이션 발생',
    overlayColor: 'rgba(55,138,221,0.06)',
    borderColor: '#378ADD',
    bannerBgColor: '#E6F1FB',
    bannerTextColor: '#042C53',
    tileBorderColor: '#85B7EB',
    tollTextColor: '#185FA5',
  },
}
