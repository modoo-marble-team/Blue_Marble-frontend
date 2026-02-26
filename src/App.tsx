import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import LobbyPage from './pages/lobby/LobbyPage'
import NicknameSetupPage from './pages/NicknameSetupPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/nickname-setup" element={<NicknameSetupPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="/lobby" element={<LobbyPage />} />
    </Routes>
  )
}

export default App
