import { Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { DesktopViewportGuard } from './components/DesktopViewportGuard'
import { KAKAO_LOGIN_CALLBACK_PATH } from './features/auth/api'
import { useAuthBootstrap } from './features/auth/hooks/useAuthBootstrap'
import { useAuthStore } from './features/auth/store'

const HomePage = lazy(() => import('./pages/HomePage'))
const GamePage = lazy(() => import('./pages/GamePage'))
const LobbyPage = lazy(() => import('./pages/lobby/LobbyPage'))
const KakaoLoginCallbackPage = lazy(
  () => import('./pages/KakaoLoginCallbackPage')
)
const NicknameSetupPage = lazy(() => import('./pages/NicknameSetupPage'))
const MyPage = lazy(() => import('./pages/MyPage'))
const WaitingRoomPage = lazy(
  () => import('./pages/waiting-room/WaitingRoomPage')
)

function RouteLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ui-app-bg px-4">
      <p className="text-sm font-medium text-ui-text-muted">
        화면을 불러오고 있습니다.
      </p>
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
