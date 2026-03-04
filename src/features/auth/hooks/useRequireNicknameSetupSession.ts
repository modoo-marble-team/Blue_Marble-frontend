import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthSession } from '../types'

// 닉네임 설정 페이지에서 닉네임 미설정 세션만 접근 허용
export function useRequireNicknameSetupSession(session: AuthSession | null) {
  const navigate = useNavigate()

  useEffect(() => {
    // 세션이 없으면 홈으로 이동
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    // 이미 닉네임 설정이 끝났으면 로비로 이동
    if (!session.needsNicknameSetup) {
      navigate('/lobby', { replace: true })
    }
  }, [navigate, session])

  return Boolean(session && session.needsNicknameSetup)
}
