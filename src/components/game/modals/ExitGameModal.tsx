import { useEffect, Fragment } from 'react'

interface ExitGameModalProps {
  open: boolean
  onCancel?: () => void
  onConfirm?: () => void
}

const ExitGameModal = ({ open, onCancel, onConfirm }: ExitGameModalProps) => {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onCancel])

  if (!open) {
    return null
  }

  return (
    <Fragment>
      <div className="fixed inset-0 z-80 flex items-center justify-center bg-[rgba(15,23,42,0.36)]">
        <div className="w-full max-w-125 rounded-[40px] bg-white px-11 pb-11 pt-9 shadow-[0_24px_64px_rgba(15,23,42,0.32)]">
          <div className="mx-auto mb-6 flex h-20 w-20 -rotate-3 items-center justify-center">
            <img
              src="/logo.webp"
              alt=""
              aria-hidden="true"
              className="h-30 w-30 object-contain"
            />
          </div>

          <h2 className="mb-5 text-center text-[40px] font-black leading-none tracking-tight text-[#DC2626]">
            게임 종료
          </h2>

          <p className="break-keep text-center text-[24px] font-extrabold leading-tight text-[#DC2626]">
            정말로 게임을 종료하시겠습니까?
          </p>
          <p className="mt-6 break-keep text-center text-[20px] font-bold leading-[1.45] text-[#DC2626]">
            게임이 아직 진행 중입니다.
            <br />
            지금 종료하면 게임에서 이탈하게 됩니다.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="h-14 min-w-40 rounded-[20px] bg-[#E9EEF5] px-8 text-[24px] font-black tracking-tight text-[#64748B] transition-colors hover:bg-[#DCE3ED]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="h-14 min-w-40 rounded-[20px] bg-[#E10606] px-8 text-[24px] font-black tracking-tight text-white shadow-[0_10px_24px_rgba(225,6,6,0.35)] transition-colors hover:bg-[#C80505]"
            >
              종료
            </button>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default ExitGameModal
