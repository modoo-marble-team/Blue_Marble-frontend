import { cn } from '../../lib/utils'
import { getAvatarBackgroundColor, getAvatarText } from './avatarModel'

// 공통 아바타 사이즈 variant
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// 공통 아바타 렌더링 입력값 타입
interface AvatarProps {
  displayName?: string
  imageUrl?: string | null
  imageAlt?: string
  backgroundColor?: string
  colorSeed?: string
  size?: AvatarSize
  className?: string
  textClassName?: string
}

const AVATAR_SIZE_CLASS_MAP: Record<AvatarSize, string> = {
  xs: 'size-8 text-xs',
  sm: 'size-9 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-24 text-2xl',
  xl: 'size-32 text-5xl',
}

// 화면 전반에서 재사용하는 공통 아바타 렌더러
export function Avatar({
  displayName,
  imageUrl,
  imageAlt,
  backgroundColor,
  colorSeed,
  size = 'md',
  className,
  textClassName,
}: AvatarProps) {
  const fallbackText = getAvatarText(displayName)
  const resolvedBackgroundColor =
    backgroundColor ?? getAvatarBackgroundColor(colorSeed ?? displayName)

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-ui-text-strong',
        AVATAR_SIZE_CLASS_MAP[size],
        className
      )}
      style={{ backgroundColor: resolvedBackgroundColor }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt ?? `${displayName ?? '사용자'} 프로필`}
          className="size-full object-cover"
        />
      ) : (
        <span className={cn('leading-none', textClassName)}>
          {fallbackText}
        </span>
      )}
    </div>
  )
}
