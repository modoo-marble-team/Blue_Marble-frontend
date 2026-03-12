import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import LobbyPage from './pages/lobby/LobbyPage'
import NicknameSetupPage from './pages/NicknameSetupPage'
import MyPage from './pages/MyPage'
import WaitingRoomPage from './pages/waiting-room/WaitingRoomPage'
import { DesktopViewportGuard } from './components/DesktopViewportGuard'

// 앱 전체 페이지 라우팅 테이블 정의
function App() {
  return (
    <DesktopViewportGuard>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/nickname-setup" element={<NicknameSetupPage />} />
        <Route path="/my-page" element={<MyPage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/rooms/:roomId" element={<WaitingRoomPage />} />
      </Routes>
    </DesktopViewportGuard>
  )
}

export default App
