import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthSession } from '../types'

// 홈 화면에서 로그인 완료 사용자(닉네임 설정 완료)를 로비로 리다이렉트
export function useRedirectAuthenticatedToLobby(session: AuthSession | null) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!session || session.needsNicknameSetup) {
      return
    }

    navigate('/lobby', { replace: true })
  }, [navigate, session])
}
