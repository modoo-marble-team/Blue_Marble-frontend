import { MonitorCog, TabletSmartphone } from 'lucide-react'
import { useEffect, useState } from 'react'

const MIN_DESKTOP_VIEWPORT_WIDTH = 1366

// 현재 브라우저 폭을 읽어 데스크톱 지원 여부를 판단
function readViewportWidth() {
  if (typeof window === 'undefined') {
    return MIN_DESKTOP_VIEWPORT_WIDTH
  }

  return window.innerWidth
}

// 최소 지원 폭 미만에서는 앱 대신 데스크톱 전용 안내 화면을 렌더링
export function DesktopViewportGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const [viewportWidth, setViewportWidth] = useState(readViewportWidth)
  const isDesktopViewport = viewportWidth >= MIN_DESKTOP_VIEWPORT_WIDTH

  useEffect(() => {
    // 브라우저 크기 변경 시 즉시 다시 계산해 차단/해제를 동기화
    function handleResize() {
      setViewportWidth(readViewportWidth())
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden={!isDesktopViewport}
        className={
          isDesktopViewport
            ? 'min-h-screen'
            : 'min-h-screen pointer-events-none'
        }
        data-testid="desktop-viewport-guard-content"
      >
        {children}
      </div>

      {!isDesktopViewport ? (
        <div className="fixed inset-0 z-[999] flex min-h-screen items-center justify-center bg-ui-app-bg px-5 py-8">
          <div className="w-full max-w-md rounded-[32px] border border-ui-border bg-ui-surface px-7 py-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <div className="mx-auto flex size-18 items-center justify-center rounded-3xl bg-ui-brand-soft text-ui-brand">
              <MonitorCog className="size-9" strokeWidth={2.1} />
            </div>

            <h1 className="mt-5 select-none text-[1.55rem] font-extrabold text-ui-text-strong">
              넓은 화면이 필요합니다
            </h1>

            <p className="mt-3 select-none text-sm font-medium leading-6 text-ui-text-muted">
              이 웹사이트는 로비, 대기방, 게임 보드가 넓은 가로 화면을 전제로
              설계되어 있습니다.
            </p>

            <div className="mt-6 rounded-2xl border border-ui-border bg-ui-surface-muted px-4 py-4">
              <div className="flex items-center justify-center gap-2 text-ui-text-primary">
                <TabletSmartphone className="size-4 shrink-0" strokeWidth={2} />
                <span className="select-none text-sm font-semibold">
                  현재 브라우저 폭 {viewportWidth}px
                </span>
              </div>
              <p className="mt-2 select-none text-sm font-medium text-ui-text-subtle">
                최소 권장 폭은 {MIN_DESKTOP_VIEWPORT_WIDTH}px 입니다.
              </p>
            </div>

            <p className="mt-5 select-none text-xs font-medium leading-5 text-ui-text-subtle">
              브라우저 창을 넓히거나 데스크톱/노트북 환경에서 다시 접속해
              주세요.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
