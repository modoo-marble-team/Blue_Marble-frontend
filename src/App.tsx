import { LoaderCircle } from 'lucide-react'
import { Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { DesktopViewportGuard } from './components/DesktopViewportGuard'
import { KAKAO_LOGIN_CALLBACK_PATH } from './features/auth/api/api'
import { useAuthBootstrap } from './features/auth/session/hooks/useAuthBootstrap'
import { useAuthStore } from './features/auth/session/store'

const HomePage = lazy(() => import('./pages/HomePage'))
const GamePage = lazy(() => import('./pages/GamePage'))
const LobbyPage = lazy(() => import('./pages/lobby/LobbyPage'))
const KakaoLoginCallbackPage = lazy(
  () => import('./pages/KakaoLoginCallbackPage')
)
const NicknameSetupPage = lazy(() => import('./pages/NicknameSetupPage'))
const MyPage = lazy(() => import('./pages/MyPage'))
const WaitingRoomPage = lazy(
  () => import('./pages/waiting-room/page/WaitingRoomPage')
)

function RouteLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ui-app-bg px-4">
      <div className="w-full max-w-sm rounded-[28px] border border-ui-border bg-ui-surface px-6 py-8 text-center shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <div
          className="flex flex-col items-center"
          role="status"
          aria-live="polite"
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-ui-brand/12 ring-1 ring-ui-brand/20">
            <LoaderCircle
              className="size-8 animate-spin text-ui-brand"
              strokeWidth={2.25}
            />
          </div>
          <h1 className="mt-5 text-xl font-bold text-ui-text-strong">
            화면을 준비하고 있어요
          </h1>
          <p className="mt-2 text-sm font-medium text-ui-text-muted">
            필요한 화면을 불러온 뒤 바로 보여드릴게요.
          </p>
        </div>
      </div>
    </div>
  )
}

// 앱 전체 페이지 라우팅 테이블 정의
function App() {
  const location = useLocation()
  const session = useAuthStore((state) => state.session)
  const isHomeRoute = location.pathname === '/'
  const isKakaoCallbackRoute = location.pathname === KAKAO_LOGIN_CALLBACK_PATH
  const hasPersistedSession = Boolean(session)
  const isAuthBootstrapping = useAuthBootstrap({
    skip: isKakaoCallbackRoute,
  })
  const shouldShowBootstrapScreen =
    isAuthBootstrapping &&
    !hasPersistedSession &&
    !isHomeRoute &&
    !isKakaoCallbackRoute

  return (
    <DesktopViewportGuard>
      {shouldShowBootstrapScreen ? (
        <div className="flex min-h-screen items-center justify-center bg-ui-app-bg px-4">
          <p className="text-sm font-medium text-ui-text-muted">
            세션 정보를 확인하고 있습니다.
          </p>
        </div>
      ) : (
        <Suspense fallback={<RouteLoadingScreen />}>
          <Routes>
            <Route
              path="/"
              element={<HomePage isAuthBootstrapping={isAuthBootstrapping} />}
            />
            <Route
              path={KAKAO_LOGIN_CALLBACK_PATH}
              element={<KakaoLoginCallbackPage />}
            />
            <Route path="/nickname-setup" element={<NicknameSetupPage />} />
            <Route path="/my-page" element={<MyPage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/rooms/:roomId" element={<WaitingRoomPage />} />
          </Routes>
        </Suspense>
      )}
    </DesktopViewportGuard>
  )
}

export default App
