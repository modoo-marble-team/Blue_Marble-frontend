import { useEffect, useRef, useState } from 'react'
import { restoreAuthSession, shouldClearAuthSession } from '../../api/api'
import { useAuthStore } from '../store'
import { disconnectSocketAndClearAuth } from '../../../../lib/socket'

interface UseAuthBootstrapParams {
  skip?: boolean
}

// 앱 초기 진입 시 persisted accessToken으로 세션을 1회 복구
export function useAuthBootstrap({
  skip = false,
}: UseAuthBootstrapParams = {}) {
  const session = useAuthStore((state) => state.session)
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)

  const [isBootstrapping, setIsBootstrapping] = useState(!skip)
  const hasBootstrappedRef = useRef(false)
  const activeAccessTokenRef = useRef(session?.accessToken.trim() ?? '')
  const bootstrapAccessTokenRef = useRef<string | null>(null)

  useEffect(() => {
    const currentAccessToken = session?.accessToken.trim() ?? ''
    activeAccessTokenRef.current = currentAccessToken

    if (!isBootstrapping) {
      return
    }

    const bootstrapAccessToken = bootstrapAccessTokenRef.current
    if (!bootstrapAccessToken || bootstrapAccessToken === currentAccessToken) {
      return
    }

    bootstrapAccessTokenRef.current = null
    setIsBootstrapping(false)
  }, [isBootstrapping, session])

  useEffect(() => {
    if (skip) {
      hasBootstrappedRef.current = true
      bootstrapAccessTokenRef.current = null
      setIsBootstrapping(false)
      return
    }

    if (hasBootstrappedRef.current) {
      return
    }

    hasBootstrappedRef.current = true

    const accessToken = session?.accessToken.trim()
    if (!accessToken) {
      bootstrapAccessTokenRef.current = null
      setIsBootstrapping(false)
      return
    }

    let isDisposed = false
    bootstrapAccessTokenRef.current = accessToken
    setIsBootstrapping(true)

    restoreAuthSession({
      accessToken,
      fallbackSession: session,
    })
      .then((restoredSession) => {
        if (isDisposed || activeAccessTokenRef.current !== accessToken) {
          return
        }

        setSession(restoredSession)
      })
      .catch((error) => {
        if (isDisposed || activeAccessTokenRef.current !== accessToken) {
          return
        }

        if (shouldClearAuthSession(error)) {
          clearSession()
          disconnectSocketAndClearAuth()
        }
      })
      .finally(() => {
        if (isDisposed || activeAccessTokenRef.current !== accessToken) {
          return
        }

        bootstrapAccessTokenRef.current = null
        setIsBootstrapping(false)
      })

    return () => {
      isDisposed = true
    }
  }, [clearSession, session, setSession, skip])

  return isBootstrapping
}
