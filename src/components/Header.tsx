import { Link } from 'react-router-dom'
import { Dice5 } from 'lucide-react'

interface HeaderProps {
  avatarText?: string
  avatarBackground?: string
}

function Header({
  avatarText = 'P',
  avatarBackground = '#fde68a',
}: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#e2e8f0] bg-white px-4 sm:px-6">
      <Link
        to="/"
        className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
      >
        <div className="flex size-9 items-center justify-center rounded-lg bg-[#3b82f6] text-white">
          <Dice5 className="size-5" strokeWidth={2} />
        </div>
        <h1 className="text-lg font-bold text-[#1e293b]">MARBLE POP</h1>
      </Link>

      <div className="flex items-center gap-2 text-sm font-medium text-[#64748b]">
        <span>플레이어</span>
        <div
          className="flex size-9 items-center justify-center rounded-full text-xs font-semibold text-[#92400e]"
          style={{ backgroundColor: avatarBackground }}
        >
          {avatarText}
        </div>
      </div>
    </header>
  )
}

export default Header
