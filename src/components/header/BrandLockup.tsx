import { cn } from '../../lib/utils'

interface BrandLockupProps {
  compact?: boolean
  className?: string
}

export function BrandLockup({ compact = false, className }: BrandLockupProps) {
  return (
    <div
      className={cn(
        'flex items-center select-none',
        compact ? 'gap-1.5' : 'gap-2',
        className
      )}
    >
      <img
        src="/logo.webp"
        alt=""
        aria-hidden="true"
        className={cn(
          'w-auto shrink-0 object-contain',
          compact ? 'h-8 sm:h-9' : 'h-10 sm:h-11'
        )}
      />

      <div
        className={cn(
          'flex items-baseline font-extrabold leading-none tracking-tight',
          compact
            ? 'gap-0.5 text-lg sm:text-xl'
            : 'gap-1 text-[1.55rem] sm:text-[1.7rem]'
        )}
      >
        <span className="text-ui-text-strong">MARBLE</span>
        <span className="bg-linear-to-r from-ui-brand-strong via-ui-brand to-[#0ea5e9] bg-clip-text text-transparent">
          POP
        </span>
      </div>
    </div>
  )
}
