import { useEffect, useRef, useState } from 'react'
import {
  refreshAccessToken,
  restoreAuthSession,
  shouldClearAuthSession,
} from '../../api/api'
import { useAuthStore } from '../store'
import { disconnectSocketAndClearAuth } from '../../../../lib/socket'

interface UseAuthBootstrapParams {
  skip?: boolean
}

type BootstrapRequestMarker = string | 'refresh-fallback' | null

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
  const bootstrapAccessTokenRef = useRef<BootstrapRequestMarker>(null)

  useEffect(() => {
    const currentAccessToken = session?.accessToken.trim() ?? ''
    activeAccessTokenRef.current = currentAccessToken

    if (!isBootstrapping) {
      return
    }

    const bootstrapAccessToken = bootstrapAccessTokenRef.current
    if (bootstrapAccessToken === null) {
      return
    }

    if (bootstrapAccessToken === 'refresh-fallback') {
      if (!currentAccessToken) {
        return
      }

      bootstrapAccessTokenRef.current = null
      setIsBootstrapping(false)
      return
    }

    if (bootstrapAccessToken === currentAccessToken) {
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

    const persistedAccessToken = session?.accessToken.trim() ?? ''

    let isDisposed = false
    setIsBootstrapping(true)
    ;(async () => {
      if (!persistedAccessToken) {
        bootstrapAccessTokenRef.current = 'refresh-fallback'
        const refreshResult = await refreshAccessToken()
        const refreshedAccessToken = refreshResult.access_token.trim()

        if (!refreshedAccessToken) {
          return null
        }

        return restoreAuthSession({
          accessToken: refreshedAccessToken,
          fallbackSession: null,
        })
      }

      bootstrapAccessTokenRef.current = persistedAccessToken

      return restoreAuthSession({
        accessToken: persistedAccessToken,
        fallbackSession: session,
      })
    })()
      .then((restoredSession) => {
        if (
          !restoredSession ||
          isDisposed ||
          activeAccessTokenRef.current !== persistedAccessToken
        ) {
          return
        }

        setSession(restoredSession)
      })
      .catch((error) => {
        if (
          isDisposed ||
          activeAccessTokenRef.current !== persistedAccessToken
        ) {
          return
        }

        if (shouldClearAuthSession(error)) {
          clearSession()
          disconnectSocketAndClearAuth()
        }
      })
      .finally(() => {
        if (
          isDisposed ||
          activeAccessTokenRef.current !== persistedAccessToken
        ) {
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
