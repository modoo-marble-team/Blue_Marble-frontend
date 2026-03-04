import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthSession } from '../types'

// 보호 페이지에서 로그인 세션 + 닉네임 설정 완료 상태를 강제
export function useRequireActiveSession(session: AuthSession | null) {
  const navigate = useNavigate()

  useEffect(() => {
    // 비로그인 사용자는 홈으로 이동
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    // 닉네임 미설정 사용자는 닉네임 설정 화면으로 이동
    if (session.needsNicknameSetup) {
      navigate('/nickname-setup', { replace: true })
    }
  }, [navigate, session])

  return Boolean(session && !session.needsNicknameSetup)
}
