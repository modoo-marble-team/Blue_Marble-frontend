import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  completeKakaoLogin,
  getAuthErrorMessage,
} from '../features/auth/api/api'
import { useAuthStore } from '../features/auth/session/store'
import { disconnectSocketAndClearAuth } from '../lib/socket'

// 카카오 로그인 redirect query를 받아 세션 저장과 후속 이동을 처리
function KakaoLoginCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isDisposed = false

    async function handleCallback() {
      const accessToken = searchParams.get('access_token')?.trim() ?? ''
      const isNewUser = searchParams.get('is_new_user') === 'true'

      if (!accessToken) {
        setErrorMessage('로그인 결과를 확인할 수 없습니다. 다시 시도해 주세요.')
        return
      }

      try {
        const session = await completeKakaoLogin({
          accessToken,
          isNewUser,
        })

        if (isDisposed) {
          return
        }

        setSession(session)
        navigate(session.needsNicknameSetup ? '/nickname-setup' : '/lobby', {
          replace: true,
        })
      } catch (error) {
        if (isDisposed) {
          return
        }

        clearSession()
        disconnectSocketAndClearAuth()
        setErrorMessage(
          getAuthErrorMessage(error, '카카오 로그인 처리에 실패했습니다.')
        )
      }
    }

    handleCallback()

    return () => {
      isDisposed = true
    }
  }, [clearSession, navigate, searchParams, setSession])

  return (
    <div className="flex min-h-screen items-center justify-center bg-ui-app-bg px-4">
      <div className="w-full max-w-sm rounded-[28px] border border-ui-border bg-ui-surface px-6 py-8 text-center shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        {errorMessage ? (
          <>
            <h1 className="text-xl font-bold text-ui-text-strong">
              카카오 로그인에 실패했어요
            </h1>
            <p className="mt-3 text-sm font-medium leading-relaxed text-ui-text-muted">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-ui-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-ui-brand-strong"
            >
              홈으로 돌아가기
            </button>
          </>
        ) : (
          <div
            className="flex flex-col items-center"
            role="status"
            aria-live="polite"
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-[#fee500]/20 ring-1 ring-[#fee500]/50">
              <LoaderCircle
                className="size-8 animate-spin text-[#3b2a10]"
                strokeWidth={2.25}
              />
            </div>
            <h1 className="mt-5 text-xl font-bold text-ui-text-strong">
              로그인 정보를 확인하고 있어요
            </h1>
            <p className="mt-2 text-sm font-medium text-ui-text-muted">
              카카오 계정을 확인한 뒤 바로 입장할게요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default KakaoLoginCallbackPage
